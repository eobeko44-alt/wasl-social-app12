import React, { useEffect, useRef, useState } from 'react';
import {
  Users,
  ImagePlus,
  ArrowRight,
  Music,
  UserPlus,
  MapPin,
  Smile,
  MessageCircle,
  Calendar,
  Video,
  ChevronLeft,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import UserCard from '@/components/UserCard';
import PostCard from './PostCard';

const MEDIA_BUCKET = 'wasl-media';

interface CloudPostRecord {
  id: string;
  user_id?: string | null;
  author_name?: string | null;
  author_handle?: string | null;
  content?: string | null;
  headline?: string | null;
  image_url?: string | null;
  kind?: string | null;
  created_at?: string | null;
}

const BG_THEMES = [
  { id: 'none', label: 'افتراضي', className: 'bg-transparent text-white' },
  {
    id: 'sunset',
    label: 'غروب',
    className:
      'bg-gradient-to-br from-amber-500 via-orange-500 to-pink-600 text-white rounded-2xl p-4 min-h-[135px] flex items-center',
  },
  {
    id: 'violet',
    label: 'بنفسجي',
    className:
      'bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl p-4 min-h-[135px] flex items-center',
  },
  {
    id: 'berry',
    label: 'توتي',
    className:
      'bg-gradient-to-br from-pink-600 via-rose-600 to-purple-700 text-white rounded-2xl p-4 min-h-[135px] flex items-center',
  },
  {
    id: 'dark',
    label: 'داكن',
    className:
      'bg-slate-950 text-white rounded-2xl p-4 min-h-[135px] flex items-center border border-slate-700',
  },
  {
    id: 'crimson',
    label: 'قرمزي',
    className:
      'bg-gradient-to-br from-rose-600 to-red-700 text-white rounded-2xl p-4 min-h-[135px] flex items-center',
  },
  {
    id: 'neon',
    label: 'نيون',
    className:
      'bg-gradient-to-br from-fuchsia-600 to-purple-700 text-white rounded-2xl p-4 min-h-[135px] flex items-center',
  },
  {
    id: 'light',
    label: 'أبيض',
    className: 'bg-white text-slate-900 rounded-2xl p-4 min-h-[135px] flex items-center',
  },
];

const SWATCH_COLORS: Record<string, string> = {
  none: 'bg-slate-800 border border-slate-600',
  sunset: 'bg-gradient-to-tr from-amber-500 to-pink-500',
  violet: 'bg-purple-500',
  berry: 'bg-gradient-to-tr from-pink-600 to-purple-700',
  dark: 'bg-black border border-slate-600',
  crimson: 'bg-rose-600',
  neon: 'bg-fuchsia-600',
  light: 'bg-white',
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

export default function FeedTab() {
  const store = useAppStore() as Record<string, any>;
  const storePosts: Array<Record<string, any>> = Array.isArray(store.posts) ? store.posts : [];
  const discoverPeople: Array<Record<string, any>> = Array.isArray(store.discoverPeople)
    ? store.discoverPeople
    : [];
  const addFriend = typeof store.addFriend === 'function' ? store.addFriend : () => {};
  const addContact = typeof store.addContact === 'function' ? store.addContact : () => {};
  const startConversationWith =
    typeof store.startConversationWith === 'function' ? store.startConversationWith : () => {};

  const currentProfile = store.profile || {};
  const displayName =
    currentProfile.name && currentProfile.name !== 'أنت'
      ? String(currentProfile.name)
      : 'مستخدم وِصل';
  const rawHandle = currentProfile.username || '@wasl_user';
  const displayHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

  const [cloudPosts, setCloudPosts] = useState<Array<Record<string, any>>>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [postText, setPostText] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('none');
  const [activeExtraType, setActiveExtraType] = useState<string | null>(null);
  const [extraValue, setExtraValue] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [publishing, setPublishing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const themeStripRef = useRef<HTMLDivElement | null>(null);

  const mapCloudRowToPost = (row: CloudPostRecord): Record<string, any> => {
    const textBody = row.content ? String(row.content) : row.headline ? String(row.headline) : '';
    const imgUrl = row.image_url ? String(row.image_url) : undefined;
    const authorNameStr = String(row.author_name || 'مستخدم وصل');
    const rawUser = String(row.author_handle || '@wasl_user');
    const authorHandleStr = rawUser.startsWith('@') ? rawUser : `@${rawUser}`;

    return {
      id: `cloud-${String(row.id)}`,
      dbId: String(row.id),
      userId: row.user_id || undefined,
      author: {
        id: String(row.user_id || row.id),
        name: authorNameStr,
        username: authorHandleStr,
        avatar: '',
        isOnline: false,
      },
      authorName: authorNameStr,
      authorHandle: authorHandleStr,
      text: textBody,
      content: textBody,
      image: imgUrl,
      imageUrl: imgUrl,
      likes: 0,
      likedByMe: false,
      comments: [],
      createdAt: row.created_at
        ? new Date(String(row.created_at)).toLocaleDateString('ar')
        : 'الآن',
    };
  };

  const fetchGlobalPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        setCloudPosts((data as CloudPostRecord[]).map(mapCloudRowToPost));
      }
    } catch {
      // يظل العرض المحلي شغالاً
    }
  };

  useEffect(() => {
    void fetchGlobalPosts();

    const channel = supabase
      .channel('wasl-global-posts-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          const row = payload.new as CloudPostRecord | undefined;
          if (!row?.id) return;
          const mapped = mapCloudRowToPost(row);
          setCloudPosts((prev) => {
            const exists = prev.some(
              (item) => item.id === mapped.id || (item.dbId && item.dbId === mapped.dbId)
            );
            return exists ? prev : [mapped, ...prev];
          });
        }
      )
      .subscribe();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setComposerOpen(false);
        setPostText('');
        setSelectedImageFile(null);
        setImagePreview('');
        setActiveExtraType(null);
        setExtraValue('');
      } else {
        void fetchGlobalPosts();
      }
    });

    return () => {
      authSub.subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const preview = await readFileAsDataUrl(file);
    setSelectedImageFile(file);
    setImagePreview(preview);
    setSelectedTheme('none');
    setComposerOpen(true);
    e.target.value = '';
  };

  const uploadPostMedia = async (file: File, fallbackUrl: string): Promise<string> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return fallbackUrl;
      const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
      const path = `feed/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext || 'jpg'}`;

      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { upsert: false });

      if (error) return fallbackUrl;

      const { data: publicInfo } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      return publicInfo?.publicUrl || fallbackUrl;
    } catch {
      return fallbackUrl;
    }
  };

  const buildFinalContent = (): string => {
    const main = postText.trim();
    const detail = extraValue.trim();
    if (!activeExtraType || !detail) return main;

    const prefixMap: Record<string, string> = {
      music: '🎵 يستمع إلى:',
      tag: '👥 مع:',
      location: '📍 في:',
      feeling: '😊 يشعر بـ:',
      messages: '💬 رسالة:',
      event: '📅 مناسبة:',
      live: '🔴 بث:',
    };
    const prefix = prefixMap[activeExtraType] || '';
    const extraLine = `${prefix} ${detail}`.trim();
    return main ? `${main}\n${extraLine}` : extraLine;
  };

  const resetComposerFields = () => {
    setPostText('');
    setSelectedImageFile(null);
    setImagePreview('');
    setSelectedTheme('none');
    setActiveExtraType(null);
    setExtraValue('');
  };

  const executePublish = async () => {
    const trimmed = buildFinalContent();
    if ((!trimmed && !imagePreview) || publishing) return;

    setPublishing(true);
    setStatusNotice('');

    try {
      let finalImageUrl: string | undefined = imagePreview || undefined;
      if (selectedImageFile && imagePreview) {
        finalImageUrl = await uploadPostMedia(selectedImageFile, imagePreview);
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;

      const { data: inserted, error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          author_name: displayName,
          author_handle: displayHandle,
          headline: finalImageUrl ? `نشر ${displayName} صورة` : `نشر ${displayName}`,
          content: trimmed || null,
          image_url: finalImageUrl || null,
          kind: finalImageUrl ? 'photo' : 'post',
        })
        .select()
        .single();

      const localPost: Record<string, any> = {
        id: inserted?.id ? `cloud-${String(inserted.id)}` : `local-feed-${Date.now()}`,
        dbId: inserted?.id ? String(inserted.id) : undefined,
        author: {
          id: userId || 'me',
          name: displayName,
          username: displayHandle,
          avatar: currentProfile.avatar || '',
          isOnline: true,
        },
        authorName: displayName,
        authorHandle: displayHandle,
        text: trimmed,
        content: trimmed,
        image: finalImageUrl,
        imageUrl: finalImageUrl,
        likes: 0,
        likedByMe: false,
        comments: [],
        createdAt: 'الآن',
      };

      if (!error && inserted?.id) {
        setCloudPosts((prev) =>
          prev.some((p) => p.id === localPost.id) ? prev : [localPost, ...prev]
        );
        setStatusNotice('تم نشر المنشور وحفظه في السحابة');
      } else {
        setStatusNotice('تمت إضافة المنشور محلياً');
      }

      if (typeof store.addPost === 'function') {
        store.addPost(localPost);
      }

      resetComposerFields();
      setComposerOpen(false);
    } catch {
      setStatusNotice('تعذر نشر المنشور الآن');
    } finally {
      setPublishing(false);
      setTimeout(() => {
        setStatusNotice('');
      }, 2500);
    }
  };

  const mergedPosts = (() => {
    const seen = new Set<string>();
    const combined: Array<Record<string, any>> = [];

    for (const item of [...cloudPosts, ...storePosts]) {
      const key = String(item.dbId || item.id || '');
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      combined.push(item);
    }

    return combined;
  })();

  const canSubmit = Boolean(buildFinalContent() || imagePreview) && !publishing;
  const activeThemeObj = BG_THEMES.find((t) => t.id === selectedTheme) || BG_THEMES[0];
  const isLightTheme = selectedTheme === 'light';

  const composerOptions = [
    {
      id: 'media',
      label: 'صور/مقاطع فيديو',
      icon: <ImagePlus size={18} className="text-emerald-400" />,
      onClick: () => fileInputRef.current?.click(),
    },
    {
      id: 'music',
      label: 'الموسيقى',
      icon: <Music size={18} className="text-pink-400" />,
      onClick: () => {
        setActiveExtraType('music');
        setExtraValue('');
      },
    },
    {
      id: 'tag',
      label: 'إشارة إلى الأشخاص',
      icon: <UserPlus size={18} className="text-sky-400" />,
      onClick: () => {
        setActiveExtraType('tag');
        setExtraValue('');
      },
    },
    {
      id: 'location',
      label: 'إضافة موقع',
      icon: <MapPin size={18} className="text-rose-400" />,
      onClick: () => {
        setActiveExtraType('location');
        setExtraValue('');
      },
    },
    {
      id: 'feeling',
      label: 'شعور/نشاط',
      icon: <Smile size={18} className="text-amber-400" />,
      onClick: () => {
        setActiveExtraType('feeling');
        setExtraValue('');
      },
    },
    {
      id: 'messages',
      label: 'تلقى الرسائل',
      icon: <MessageCircle size={18} className="text-blue-400" />,
      onClick: () => {
        setActiveExtraType('messages');
        setExtraValue('مفتوح للرسائل');
      },
    },
    {
      id: 'event',
      label: 'إنشاء مناسبة',
      icon: <Calendar size={18} className="text-red-400" />,
      onClick: () => {
        setActiveExtraType('event');
        setExtraValue('');
      },
    },
    {
      id: 'live',
      label: 'بث مباشر',
      icon: <Video size={18} className="text-rose-500" />,
      onClick: () => {
        setActiveExtraType('live');
        setExtraValue('مباشر الآن');
      },
    },
  ];

  const extraPlaceholderMap: Record<string, string> = {
    music: 'اكتب اسم الأغنية أو الفنان...',
    tag: 'اكتب اسم الشخص للإشارة إليه...',
    location: 'اكتب المدينة أو المكان...',
    feeling: 'اكتب شعورك أو نشاطك الحالي...',
    messages: 'اكتب ملاحظة حول استقبال الرسائل...',
    event: 'اكتب اسم المناسبة أو موعدها...',
    live: 'اكتب عنوان البث المباشر...',
  };

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-5 pb-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => void handleImageSelect(e)}
        className="hidden"
      />

      {statusNotice && (
        <p className="rounded-xl border border-cyan-500/20 bg-slate-900/90 px-3 py-2 text-xs font-bold text-cyan-300">
          {statusNotice}
        </p>
      )}

      {/* قائمة «إنشاء منشور» المنبثقة */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#1c1d21] text-white shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 bg-[#242529] px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetComposerFields();
                      setComposerOpen(false);
                    }}
                    aria-label="رجوع"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-200 hover:bg-white/10 transition"
                  >
                    <ArrowRight size={18} />
                  </button>
                  <span className="text-sm font-bold text-white">إنشاء منشور</span>
                </div>

                <button
                  type="button"
                  onClick={() => void executePublish()}
                  disabled={!canSubmit}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    canSubmit
                      ? 'bg-[#1877F2] text-white hover:bg-[#166fe5]'
                      : 'text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {publishing ? 'جاري...' : 'نشر'}
                </button>
              </div>

              <div className="px-4 pt-3.5 pb-2">
                <div className="flex items-center gap-3">
                  {currentProfile.avatar ? (
                    <img
                      src={currentProfile.avatar}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full border border-white/15 object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white border border-white/15">
                      {displayName.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{displayName}</p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-white/15 bg-[#2a2b30] px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                      <span>العامة</span>
                      <span>▾</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5">
                  <textarea
                    rows={selectedTheme === 'none' ? 3 : 4}
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="شارك لحظة بارزة من يومك..."
                    className={`w-full resize-none outline-none transition ${
                      selectedTheme === 'none'
                        ? 'bg-transparent text-base text-white placeholder:text-slate-400'
                        : `${activeThemeObj.className} text-center text-lg font-bold ${
                            isLightTheme ? 'placeholder:text-slate-500' : 'placeholder:text-white/75'
                          }`
                    }`}
                  />
                </div>

                {activeExtraType && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-[#2a2b30] px-3 py-2">
                    <input
                      type="text"
                      value={extraValue}
                      onChange={(e) => setExtraValue(e.target.value)}
                      placeholder={extraPlaceholderMap[activeExtraType] || 'أدخل التفاصيل...'}
                      className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveExtraType(null);
                        setExtraValue('');
                      }}
                      aria-label="إغلاق الإضافة"
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {imagePreview && (
                  <div className="mt-3 relative">
                    <img
                      src={imagePreview}
                      alt="معاينة الصورة"
                      className="max-h-60 w-full rounded-xl object-cover border border-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImageFile(null);
                        setImagePreview('');
                      }}
                      className="mt-1.5 rounded-lg bg-rose-950/70 border border-rose-500/30 px-2.5 py-1 text-[11px] font-bold text-rose-200"
                    >
                      إزالة الصورة
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-white/10 bg-[#242529]/80 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setPostText((prev) => `${prev}@`)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#32343a] text-sm font-bold text-white hover:bg-[#3e4047]"
                >
                  @
                </button>

                <div
                  ref={themeStripRef}
                  className="flex flex-1 items-center gap-2 overflow-x-auto py-0.5"
                >
                  {BG_THEMES.map((theme) => {
                    const active = selectedTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedTheme(theme.id)}
                        aria-label={theme.label}
                        className={`h-7 w-7 shrink-0 rounded-lg transition ${SWATCH_COLORS[theme.id]} ${
                          active ? 'ring-2 ring-white scale-105' : 'opacity-90 hover:opacity-100'
                        }`}
                      />
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    themeStripRef.current?.scrollBy({ left: -120, behavior: 'smooth' });
                  }}
                  aria-label="المزيد من الألوان"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#32343a] text-slate-200 hover:bg-[#3e4047]"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

              <div className="divide-y divide-white/5 border-t border-white/10 bg-[#1c1d21]">
                {composerOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-right text-xs font-semibold text-slate-100 hover:bg-white/5 transition"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#1c1d21] p-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => void executePublish()}
                disabled={!canSubmit}
                className="w-full rounded-lg bg-[#1877F2] py-2.5 text-sm font-extrabold text-white shadow transition enabled:hover:bg-[#166fe5] enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {publishing ? 'جاري النشر...' : 'نشر'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* قائمة المنشورات */}
      <div className="space-y-4">
        {mergedPosts.map((post, idx) => (
          <PostCard key={String(post.id || idx)} post={post} />
        ))}
      </div>

      {/* قسم اكتشف أشخاصاً */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Users size={18} className="text-purple-400" />
          <h2 className="text-base font-bold text-white">اكتشف أشخاصاً</h2>
          <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-semibold text-purple-300">
            {discoverPeople.length}
          </span>
        </div>

        {discoverPeople.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            أضفت الجميع! لا توجد توصيات جديدة حالياً.
          </p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {discoverPeople.map((user: Record<string, any>, idx: number) => (
              <UserCard
                key={String(user.id || idx)}
                user={user}
                onAddFriend={addFriend}
                onAddContact={addContact}
                onMessage={startConversationWith}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
