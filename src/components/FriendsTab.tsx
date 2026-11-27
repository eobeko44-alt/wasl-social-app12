import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, UserPlus, Check, X, UserCheck, Users, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ProfileRow {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

interface FriendshipRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted';
  created_at?: string;
}

type SubTab = 'requests' | 'suggestions' | 'friends';

let cachedProfiles: ProfileRow[] | null = null;
let cachedFriendships: FriendshipRow[] | null = null;
let cachedFriendsUid: string | null = null;
let lastFriendsFetchAt = 0;
const FRIENDS_CACHE_TTL_MS = 20_000;

export function FriendsTab({
  onOpenChatWithUser,
}: {
  onOpenChatWithUser?: (userId: string, userName: string) => void;
}) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => cachedFriendsUid);
  const [profiles, setProfiles] = useState<ProfileRow[]>(() => cachedProfiles || []);
  const [friendships, setFriendships] = useState<FriendshipRow[]>(() => cachedFriendships || []);
  const [loading, setLoading] = useState<boolean>(() => !cachedProfiles);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('requests');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async (force = false) => {
    if (
      !force &&
      cachedProfiles &&
      cachedFriendships &&
      Date.now() - lastFriendsFetchAt < FRIENDS_CACHE_TTL_MS
    ) {
      setProfiles(cachedProfiles);
      setFriendships(cachedFriendships);
      setCurrentUserId(cachedFriendsUid);
      setLoading(false);
      return;
    }

    if (!cachedProfiles) {
      setLoading(true);
    }
    setErrorMsg(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id ?? null;
      setCurrentUserId(uid);
      cachedFriendsUid = uid;

      const { data: profs, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .limit(50);

      if (profError) {
        if (!cachedProfiles) {
          setErrorMsg('تعذر تحميل قائمة المستخدمين');
        }
        setLoading(false);
        return;
      }

      const nextProfiles = Array.isArray(profs) ? profs : [];
      cachedProfiles = nextProfiles;
      setProfiles(nextProfiles);

      if (uid) {
        const { data: rels, error: relError } = await supabase
          .from('friendships')
          .select('id, sender_id, receiver_id, status, created_at')
          .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

        if (!relError && Array.isArray(rels)) {
          const nextRels = rels as FriendshipRow[];
          cachedFriendships = nextRels;
          setFriendships(nextRels);
        }
      } else {
        cachedFriendships = [];
        setFriendships([]);
      }

      lastFriendsFetchAt = Date.now();
    } catch {
      if (!cachedProfiles) {
        setErrorMsg('حدث خطأ أثناء تحميل بيانات الأصدقاء');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    for (const p of profiles) {
      map.set(p.id, p);
    }
    return map;
  }, [profiles]);

  const getName = useCallback(
    (id: string) => {
      const p = profileMap.get(id);
      const n = p?.full_name?.trim();
      return n && n.length > 0 ? n : 'مستخدم وِصل';
    },
    [profileMap]
  );

  const getAvatar = useCallback(
    (id: string) => {
      const av = profileMap.get(id)?.avatar_url?.trim();
      return av && av.length > 0 ? av : undefined;
    },
    [profileMap]
  );

  const triggerOpenChat = useCallback(
    (targetId: string, targetName: string, targetAvatar?: string) => {
      try {
        window.dispatchEvent(
          new CustomEvent('wasl-open-chat', {
            detail: {
              userId: targetId,
              userName: targetName,
              avatar: targetAvatar,
            },
          })
        );
      } catch {
        // تجاهل
      }
      onOpenChatWithUser?.(targetId, targetName);
    },
    [onOpenChatWithUser]
  );

  const incomingRequests = useMemo(
    () =>
      friendships.filter(
        (f) => f.status === 'pending' && f.receiver_id === currentUserId
      ),
    [friendships, currentUserId]
  );

  const acceptedFriends = useMemo(
    () =>
      friendships.filter(
        (f) =>
          f.status === 'accepted' &&
          (f.sender_id === currentUserId || f.receiver_id === currentUserId)
      ),
    [friendships, currentUserId]
  );

  const getRelationWith = useCallback(
    (otherId: string) =>
      friendships.find(
        (f) =>
          (f.sender_id === currentUserId && f.receiver_id === otherId) ||
          (f.sender_id === otherId && f.receiver_id === currentUserId)
      ),
    [friendships, currentUserId]
  );

  const suggestions = useMemo(
    () =>
      profiles.filter((p) => {
        if (!currentUserId || p.id === currentUserId) return false;
        const rel = getRelationWith(p.id);
        if (rel?.status === 'accepted') return false;
        return true;
      }),
    [profiles, currentUserId, getRelationWith]
  );

  const handleSendRequest = (targetUserId: string) => {
    if (!currentUserId) return;
    const tempId = `temp-rel-${Date.now()}`;
    const optimisticRow: FriendshipRow = {
      id: tempId,
      sender_id: currentUserId,
      receiver_id: targetUserId,
      status: 'pending',
    };

    setFriendships((prev) => {
      const next = [...prev, optimisticRow];
      cachedFriendships = next;
      return next;
    });

    void (async () => {
      const { data, error } = await supabase
        .from('friendships')
        .insert({
          sender_id: currentUserId,
          receiver_id: targetUserId,
          status: 'pending',
        })
        .select('id, sender_id, receiver_id, status, created_at')
        .single();

      if (!error && data) {
        setFriendships((prev) => {
          const next = prev.map((item) =>
            item.id === tempId ? (data as FriendshipRow) : item
          );
          cachedFriendships = next;
          return next;
        });
      } else {
        setFriendships((prev) => {
          const next = prev.filter((item) => item.id !== tempId);
          cachedFriendships = next;
          return next;
        });
      }
    })();
  };

  const handleAcceptRequest = (friendshipId: string) => {
    const previous = friendships;
    setFriendships((prev) => {
      const next = prev.map((item) =>
        item.id === friendshipId ? { ...item, status: 'accepted' as const } : item
      );
      cachedFriendships = next;
      return next;
    });

    void (async () => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) {
        setFriendships(previous);
        cachedFriendships = previous;
      }
    })();
  };

  const handleRemoveFriendship = (friendshipId: string) => {
    const previous = friendships;
    setFriendships((prev) => {
      const next = prev.filter((item) => item.id !== friendshipId);
      cachedFriendships = next;
      return next;
    });

    void (async () => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) {
        setFriendships(previous);
        cachedFriendships = previous;
      }
    })();
  };

  const q = searchQuery.trim().toLowerCase();
  const filterBySearch = (id: string) => {
    if (!q) return true;
    return getName(id).toLowerCase().includes(q);
  };

  const filteredRequests = useMemo(
    () => incomingRequests.filter((r) => filterBySearch(r.sender_id)),
    [incomingRequests, q, getName]
  );

  const filteredSuggestions = useMemo(
    () => suggestions.filter((p) => filterBySearch(p.id)),
    [suggestions, q, getName]
  );

  const filteredFriends = useMemo(
    () =>
      acceptedFriends.filter((f) => {
        const otherId = f.sender_id === currentUserId ? f.receiver_id : f.sender_id;
        return filterBySearch(otherId);
      }),
    [acceptedFriends, currentUserId, q, getName]
  );

  return (
    <div dir="rtl" className="min-h-screen bg-[#18191a] text-[#e4e6eb] p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="text-cyan-400" size={22} />
          <h1 className="text-lg font-black text-white">الأصدقاء</h1>
        </div>
        <button
          type="button"
          onClick={() => void loadData(true)}
          className="rounded-xl bg-[#242526] border border-white/10 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-[#2d2f31] transition"
        >
          تحديث
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-full bg-[#242526] border border-white/10 px-4 py-2.5">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن أي حساب في وِصل..."
          className="w-full bg-transparent text-xs text-white placeholder:text-slate-400 outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="مسح البحث"
            className="text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('requests')}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition ${
            activeSubTab === 'requests'
              ? 'bg-[#1877F2] text-white'
              : 'bg-[#3a3b3c] text-slate-200 hover:bg-[#4e4f50]'
          }`}
        >
          طلبات الصداقة ({incomingRequests.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('suggestions')}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition ${
            activeSubTab === 'suggestions'
              ? 'bg-[#1877F2] text-white'
              : 'bg-[#3a3b3c] text-slate-200 hover:bg-[#4e4f50]'
          }`}
        >
          أشخاص قد تعرفهم ({suggestions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('friends')}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition ${
            activeSubTab === 'friends'
              ? 'bg-[#1877F2] text-white'
              : 'bg-[#3a3b3c] text-slate-200 hover:bg-[#4e4f50]'
          }`}
        >
          أصدقاؤك ({acceptedFriends.length})
        </button>
      </div>

      {loading && (
        <div className="rounded-2xl bg-[#242526] border border-white/10 p-6 text-center text-xs font-bold text-slate-400">
          جاري تحميل قائمة الأصدقاء...
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl bg-rose-950/40 border border-rose-500/30 p-4 text-center text-xs font-bold text-rose-200">
          {errorMsg}
        </div>
      )}

      {!loading && !currentUserId && (
        <div className="rounded-2xl bg-[#242526] border border-white/10 p-6 text-center text-xs font-bold text-slate-300">
          سجّل دخولك أولاً لإرسال واستقبال طلبات الصداقة.
        </div>
      )}

      {!loading && currentUserId && activeSubTab === 'requests' && (
        <div className="space-y-3">
          <h2 className="text-sm font-extrabold text-white">
            طلبات الصداقة ({filteredRequests.length})
          </h2>

          {filteredRequests.length === 0 ? (
            <div className="rounded-2xl bg-[#242526] border border-white/10 p-6 text-center text-xs text-slate-400">
              لا توجد طلبات صداقة واردة حالياً.
            </div>
          ) : (
            filteredRequests.map((req) => {
              const name = getName(req.sender_id);
              const avatar = getAvatar(req.sender_id);
              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#242526] border border-white/10 p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        loading="lazy"
                        decoding="async"
                        className="h-14 w-14 shrink-0 rounded-full object-cover border border-white/15"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#3a3b3c] text-lg font-black text-white">
                        {name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{name}</p>
                      <p className="text-[11px] text-slate-400">أرسل لك طلب صداقة</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAcceptRequest(req.id)}
                      className="flex items-center gap-1 rounded-xl bg-[#1877F2] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#166fe5] transition"
                    >
                      <Check size={14} />
                      <span>تأكيد</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveFriendship(req.id)}
                      className="flex items-center gap-1 rounded-xl bg-[#3a3b3c] px-3 py-2 text-xs font-bold text-slate-200 hover:bg-[#4e4f50] transition"
                    >
                      <X size={14} />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {!loading && currentUserId && activeSubTab === 'suggestions' && (
        <div className="space-y-3">
          <h2 className="text-sm font-extrabold text-white">أشخاص قد تعرفهم</h2>

          {filteredSuggestions.length === 0 ? (
            <div className="rounded-2xl bg-[#242526] border border-white/10 p-6 text-center text-xs text-slate-400">
              لا توجد حسابات إضافية لعرضها الآن.
            </div>
          ) : (
            filteredSuggestions.map((person) => {
              const name = getName(person.id);
              const avatar = getAvatar(person.id);
              const rel = getRelationWith(person.id);
              const isSentByMe = rel?.status === 'pending' && rel.sender_id === currentUserId;
              const isIncomingFromThem =
                rel?.status === 'pending' && rel.receiver_id === currentUserId;

              return (
                <div
                  key={person.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#242526] border border-white/10 p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        loading="lazy"
                        decoding="async"
                        className="h-14 w-14 shrink-0 rounded-full object-cover border border-white/15"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#3a3b3c] text-lg font-black text-white">
                        {name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{name}</p>
                      <p className="text-[11px] text-slate-400">حساب في وِصل</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSentByMe ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveFriendship(rel.id)}
                        className="rounded-xl bg-[#3a3b3c] px-3 py-2 text-xs font-bold text-slate-200 hover:bg-[#4e4f50] transition"
                      >
                        إلغاء الطلب
                      </button>
                    ) : isIncomingFromThem ? (
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(rel.id)}
                        className="rounded-xl bg-[#1877F2] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#166fe5] transition"
                      >
                        تأكيد الطلب
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendRequest(person.id)}
                        className="flex items-center gap-1.5 rounded-xl bg-[#1877F2] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#166fe5] transition"
                      >
                        <UserPlus size={14} />
                        <span>إضافة صديق</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {!loading && currentUserId && activeSubTab === 'friends' && (
        <div className="space-y-3">
          <h2 className="text-sm font-extrabold text-white">أصدقاؤك</h2>

          {filteredFriends.length === 0 ? (
            <div className="rounded-2xl bg-[#242526] border border-white/10 p-6 text-center text-xs text-slate-400">
              لا يوجد أصدقاء مضافون بعد. أرسل طلب صداقة من «أشخاص قد تعرفهم».
            </div>
          ) : (
            filteredFriends.map((f) => {
              const otherId = f.sender_id === currentUserId ? f.receiver_id : f.sender_id;
              const name = getName(otherId);
              const avatar = getAvatar(otherId);

              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#242526] border border-white/10 p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        loading="lazy"
                        decoding="async"
                        className="h-12 w-12 shrink-0 rounded-full object-cover border border-white/15"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#3a3b3c] text-base font-black text-white">
                        {name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{name}</p>
                      <p className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <UserCheck size={12} />
                        <span>صديق</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => triggerOpenChat(otherId, name, avatar)}
                      className="rounded-xl bg-[#1877F2]/20 border border-[#1877F2]/40 px-3 py-1.5 text-xs font-bold text-[#4599FF] hover:bg-[#1877F2]/30 transition"
                    >
                      مراسلة
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFriendship(f.id)}
                      aria-label={`إزالة ${name}`}
                      className="rounded-xl bg-[#3a3b3c] p-2 text-slate-300 hover:text-rose-300 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
