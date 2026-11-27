import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, MessageCircle, Share2, Trash2, Send, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

interface FeedPostItem {
  id: string;
  dbId?: string;
  userId?: string | null;
  authorName: string;
  authorHandle?: string;
  authorAvatar?: string;
  headline?: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  likesCount: number;
  likedByMe: boolean;
  comments: { id: string; author: string; text: string; createdAt: string }[];
}

let cachedFeedPosts: FeedPostItem[] | null = null;
let lastFeedFetchedAt = 0;
const FEED_CACHE_TTL_MS = 20_000;

function formatRelativeTime(iso?: string): string {
  if (!iso) return 'الآن';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 'الآن';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 45) return 'الآن';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} د`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `منذ ${diffHr} س`;
  const diffDay = Math.floor(diffHr / 24);
  return `منذ ${diffDay} ي`;
}

function normalizeRow(row: any, currentUid: string | null): FeedPostItem {
  const rawId = String(row?.id ?? `row-${Math.random().toString(36).slice(2, 8)}`);
  const name =
    typeof row?.author_name === 'string' && row.author_name.trim()
      ? row.author_name.trim()
      : 'مستخدم وِصل';
  const handle =
    typeof row?.author_handle === 'string' && row.author_handle.trim()
      ? row.author_handle.trim()
      : undefined;

  return {
    id: `cloud-${rawId}`,
    dbId: rawId,
    userId: row?.user_id ? String(row.user_id) : null,
    authorName: name,
    authorHandle: handle,
    authorAvatar:
      typeof row?.author_avatar === 'string' && row.author_avatar.trim()
        ? row.author_avatar.trim()
        : undefined,
    headline: typeof row?.headline === 'string' ? row.headline : undefined,
    content: typeof row?.content === 'string' ? row.content : '',
    imageUrl:
      typeof row?.image_url === 'string' && row.image_url.trim()
        ? row.image_url.trim()
        : undefined,
    createdAt: formatRelativeTime(row?.created_at),
    likesCount: typeof row?.likes_count === 'number' ? row.likes_count : 0,
    likedByMe: Boolean(currentUid && Array.isArray(row?.liked_by) && row.liked_by.includes(currentUid)),
    comments: Array.isArray(row?.comments) ? row.comments : [],
  };
}

export default function FeedTab() {
  const store = useAppStore();
  const storePosts = useMemo(() => (Array.isArray(store.posts) ? store.posts : []), [store.posts]);
  const currentUserName =
    (typeof store.profile?.name === 'string' && store.profile.name.trim()) || 'حساب وِصل';

  const [posts, setPosts] = useState<FeedPostItem[]>(() => cachedFeedPosts || []);
  const [loading, setLoading] = useState<boolean>(() => !cachedFeedPosts);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPosts = useCallback(async (force = false) => {
    if (!force && cachedFeedPosts && Date.now() - lastFeedFetchedAt < FEED_CACHE_TTL_MS) {
      if (mountedRef.current) {
        setPosts(cachedFeedPosts);
        setLoading(false);
      }
      return;
    }

    if (mountedRef.current) {
      if (!cachedFeedPosts) setLoading(true);
      else setRefreshing(true);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id ?? null;
      if (mountedRef.current) setCurrentUid(uid);

      const { data, error } = await supabase
        .from('posts')
        .select('id, user_id, author_name, author_handle, headline, content, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!mountedRef.current) return;

      if (!error && Array.isArray(data)) {
        const normalized = data.map((row) => normalizeRow(row, uid));
        cachedFeedPosts = normalized;
        lastFeedFetchedAt = Date.now();
        setPosts(normalized);
      }
    } catch {
      // الاحتفاظ بالمنشورات الحالية عند تعذر الاتصال
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchPosts(false);
  }, [fetchPosts]);

  // دمج منشورات المتجر المحلية الجديدة فوراً مع منشورات السحابة بدون تكرار
  const mergedPosts = useMemo(() => {
    const localMapped: FeedPostItem[] = storePosts.map((p: any, idx: number) => ({
      id: String(p?.id || `local-${idx}`),
      dbId: p?.dbId ? String(p.dbId) : undefined,
      userId: p?.userId ? String(p.userId) : currentUid,
      authorName:
        (typeof p?.authorName === 'string' && p.authorName.trim()) || currentUserName,
      authorHandle:
        typeof p?.authorHandle === 'string' && p.authorHandle.trim()
          ? p.authorHandle.trim()
          : undefined,
      authorAvatar:
        typeof p?.authorAvatar === 'string' && p.authorAvatar.trim()
          ? p.authorAvatar.trim()
          : undefined,
      headline: typeof p?.headline === 'string' ? p.headline : undefined,
      content: typeof p?.content === 'string' ? p.content : '',
      imageUrl:
        (typeof p?.imageUrl === 'string' && p.imageUrl.trim()) ||
        (typeof p?.image === 'string' && p.image.trim()) ||
        undefined,
      createdAt: typeof p?.createdAt === 'string' && p.createdAt ? p.createdAt : 'الآن',
      likesCount: typeof p?.likesCount === 'number' ? p.likesCount : 0,
      likedByMe: Boolean(p?.likedByMe),
      comments: Array.isArray(p?.comments) ? p.comments : [],
    }));

    const seenContentAndImg = new Set<string>();
    const combined: FeedPostItem[] = [];

    for (const item of localMapped) {
      const key = `${item.authorName}|${item.content.trim()}|${item.imageUrl || ''}`;
      if (!seenContentAndImg.has(key)) {
        seenContentAndImg.add(key);
        combined.push(item);
      }
    }

    for (const item of posts) {
      const key = `${item.authorName}|${item.content.trim()}|${item.imageUrl || ''}`;
      if (!seenContentAndImg.has(key)) {
        seenContentAndImg.add(key);
        combined.push(item);
      }
    }

    return combined;
  }, [storePosts, posts, currentUid, currentUserName]);

  const handleToggleLike = (postId: string) => {
    const updater = (list: FeedPostItem[]) =>
      list.map((p) => {
        if (p.id !== postId) return p;
        const nextLiked = !p.likedByMe;
        const nextCount = Math.max(0, p.likesCount + (nextLiked ? 1 : -1));
        return { ...p, likedByMe: nextLiked, likesCount: nextCount };
      });

    setPosts(updater);
    if (cachedFeedPosts) {
      cachedFeedPosts = updater(cachedFeedPosts);
    }
  };

  const handleAddComment = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;

    const newComment = {
      id: `cmt-${Date.now()}`,
      author: currentUserName,
      text,
      createdAt: 'الآن',
    };

    const updater = (list: FeedPostItem[]) =>
      list.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
      );

    setPosts(updater);
    if (cachedFeedPosts) {
      cachedFeedPosts = updater(cachedFeedPosts);
    }
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
  };

  const handleSharePost = async (item: FeedPostItem) => {
    const shareText = item.content || item.headline || 'منشور من وِصل';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'وِصل', text: shareText });
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setNotice('تم نسخ نص المنشور');
        setTimeout(() => setNotice(''), 2000);
      }
    } catch {
      // تجاهل إلغاء المشاركة
    }
  };

  const handleDeletePost = async (item: FeedPostItem) => {
    const filterFn = (list: FeedPostItem[]) => list.filter((p) => p.id !== item.id);
    setPosts(filterFn);
    if (cachedFeedPosts) {
      cachedFeedPosts = filterFn(cachedFeedPosts);
    }

    if (item.dbId) {
      try {
        await supabase.from('posts').delete().eq('id', item.dbId);
      } catch {
        // تجاهل
      }
    }
  };

  return (
    <div dir="rtl" className="space-y-3 pb-8">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-extrabold text-slate-400">أحدث المنشورات</span>
        <button
          type="button"
          onClick={() => void fetchPosts(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:border-cyan-500/40 disabled:opacity-50 transition"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'تحديث...' : 'تحديث'}</span>
        </button>
      </div>

      {notice && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300">
          {notice}
        </div>
      )}

      {loading && mergedPosts.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 space-y-3 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-28 rounded bg-slate-800" />
                  <div className="h-2.5 w-16 rounded bg-slate-800/70" />
                </div>
              </div>
              <div className="h-3 w-4/5 rounded bg-slate-800" />
              <div className="h-3 w-2/3 rounded bg-slate-800/70" />
            </div>
          ))}
        </div>
      ) : mergedPosts.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center space-y-1.5">
          <p className="text-sm font-bold text-slate-200">لا توجد منشورات بعد</p>
          <p className="text-xs text-slate-400">شارك أول منشور مع مجتمع وِصل.</p>
        </div>
      ) : (
        mergedPosts.map((item) => {
          const canDelete = Boolean(
            (currentUid && item.userId && currentUid === item.userId) ||
              item.id.startsWith('post-') ||
              item.id.startsWith('local-')
          );
          const isCommentsOpen = openCommentsId === item.id;

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-800/90 bg-slate-900/85 p-3.5 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.authorAvatar ? (
                    <img
                      src={item.authorAvatar}
                      alt={item.authorName}
                      loading="lazy"
                      decoding="async"
                      className="h-10 w-10 shrink-0 rounded-full object-cover border border-cyan-500/25"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-l from-cyan-600/30 to-purple-600/30 border border-purple-500/25 text-sm font-black text-cyan-300">
                      {item.authorName.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-white">{item.authorName}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.authorHandle ? `${item.authorHandle} · ` : ''}
                      {item.createdAt}
                    </p>
                  </div>
                </div>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => void handleDeletePost(item)}
                    aria-label="حذف المنشور"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950/50 hover:text-rose-300 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {item.content && (
                <p className="whitespace-pre-line text-xs sm:text-sm leading-relaxed text-slate-100">
                  {item.content}
                </p>
              )}

              {item.imageUrl && (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                  <img
                    src={item.imageUrl}
                    alt="محتوى المنشور"
                    loading="lazy"
                    decoding="async"
                    className="max-h-96 w-full object-cover"
                  />
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
                <span>{item.likesCount > 0 ? `${item.likesCount} إعجاب` : ''}</span>
                <span>{item.comments.length > 0 ? `${item.comments.length} تعليق` : ''}</span>
              </div>

              <div className="grid grid-cols-3 gap-1 border-t border-slate-800/80 pt-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleLike(item.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold transition ${
                    item.likedByMe
                      ? 'bg-rose-500/15 text-rose-400'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Heart size={15} className={item.likedByMe ? 'fill-rose-400' : ''} />
                  <span>إعجاب</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setOpenCommentsId((prev) => (prev === item.id ? null : item.id))
                  }
                  className="flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold text-slate-300 hover:bg-white/5 transition"
                >
                  <MessageCircle size={15} />
                  <span>تعليق</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleSharePost(item)}
                  className="flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold text-slate-300 hover:bg-white/5 transition"
                >
                  <Share2 size={15} />
                  <span>مشاركة</span>
                </button>
              </div>

              {isCommentsOpen && (
                <div className="space-y-2 border-t border-slate-800/80 pt-2.5">
                  {item.comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl bg-slate-950/80 border border-slate-800/70 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-300">{c.author}</span>
                        <span className="text-[10px] text-slate-500">{c.createdAt}</span>
                      </div>
                      <p className="mt-0.5 text-slate-200">{c.text}</p>
                    </div>
                  ))}

                  <form
                    onSubmit={(e) => handleAddComment(item.id, e)}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={commentDrafts[item.id] || ''}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="اكتب تعليقاً..."
                      className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none"
                    />
                    <button
                      type="submit"
                      aria-label="إرسال التعليق"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1877F2] text-white hover:bg-[#166fe5] transition"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
