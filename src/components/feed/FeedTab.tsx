import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Send,
  RefreshCw,
  X,
  ThumbsUp,
  CornerDownLeft,
  Image as ImageIcon,
  Smile,
  ChevronDown,
  BadgeCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

export const FOUNDER_USER_IDS = new Set<string>([
  '9925c38d-c91d-47b6-9da2-f9042d4142d4',
]);

export function isVerifiedFounderId(userId?: string | null): boolean {
  if (!userId || typeof userId !== 'string') return false;
  return FOUNDER_USER_IDS.has(userId.trim());
}

export function VerifiedBlueBadge({ size = 15 }: { size?: number }) {
  return (
    <span
      title="حساب موثّق رسمياً"
      aria-label="حساب موثّق رسمياً"
      className="inline-flex items-center justify-center shrink-0 text-[#1877F2]"
    >
      <BadgeCheck size={size} className="fill-[#1877F2] text-white" />
    </span>
  );
}

interface CommentReplyItem {
  id: string;
  author: string;
  authorId?: string | null;
  avatar?: string;
  text: string;
  createdAt: string;
  likesCount: number;
  likedByMe: boolean;
}

interface PostCommentItem {
  id: string;
  author: string;
  authorId?: string | null;
  avatar?: string;
  text: string;
  createdAt: string;
  likesCount: number;
  likedByMe: boolean;
  reactionEmoji?: string;
  replies: CommentReplyItem[];
}

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
  comments: PostCommentItem[];
}

let cachedFeedPosts: FeedPostItem[] | null = null;
let lastFeedFetchedAt = 0;
const FEED_CACHE_TTL_MS = 20_000;

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😍', '😢', '👏', '🔥', '🙌'];

function formatRelativeTime(iso?: string): string {
  if (!iso) return 'الآن';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 'الآن';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 45) return 'الآن';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} د`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} س`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} ي`;
}

function sanitizeReplies(rawReplies: unknown): CommentReplyItem[] {
  if (!Array.isArray(rawReplies)) return [];
  return rawReplies
    .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object'))
    .map((r, idx) => ({
      id: typeof r.id === 'string' && r.id ? r.id : `rpl-${idx}-${Date.now()}`,
      author:
        typeof r.author === 'string' && r.author.trim()
          ? r.author.trim()
          : 'مستخدم وِصل',
      authorId: typeof r.authorId === 'string' ? r.authorId : null,
      avatar:
        typeof r.avatar === 'string' && r.avatar.trim() ? r.avatar.trim() : undefined,
      text: typeof r.text === 'string' ? r.text : '',
      createdAt:
        typeof r.createdAt === 'string' && r.createdAt.trim()
          ? r.createdAt.trim()
          : 'الآن',
      likesCount: typeof r.likesCount === 'number' ? r.likesCount : 0,
      likedByMe: Boolean(r.likedByMe),
    }))
    .filter((r) => r.text.trim().length > 0);
}

function sanitizeComments(rawComments: unknown): PostCommentItem[] {
  if (!Array.isArray(rawComments)) return [];
  return rawComments
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
    .map((c, idx) => {
      const authorVal =
        typeof c.author === 'string' && c.author.trim()
          ? c.author.trim()
          : typeof c.authorName === 'string' && c.authorName.trim()
            ? c.authorName.trim()
            : 'مستخدم وِصل';
      const textVal =
        typeof c.text === 'string'
          ? c.text
          : typeof c.content === 'string'
            ? c.content
            : '';
      const timeVal =
        typeof c.createdAt === 'string' && c.createdAt.trim()
          ? c.createdAt.trim()
          : 'الآن';
      return {
        id: typeof c.id === 'string' && c.id ? c.id : `cmt-${idx}-${Date.now()}`,
        author: authorVal,
        authorId: typeof c.authorId === 'string' ? c.authorId : null,
        avatar:
          typeof c.avatar === 'string' && c.avatar.trim() ? c.avatar.trim() : undefined,
        text: textVal,
        createdAt: timeVal,
        likesCount: typeof c.likesCount === 'number' ? c.likesCount : 0,
        likedByMe: Boolean(c.likedByMe),
        reactionEmoji:
          typeof c.reactionEmoji === 'string' && c.reactionEmoji ? c.reactionEmoji : '👍',
        replies: sanitizeReplies(c.replies),
      };
    })
    .filter((c) => c.text.trim().length > 0);
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
    comments: sanitizeComments(row?.comments),
  };
}

export default function FeedTab() {
  const store = useAppStore();
  const storePosts = useMemo(
    () => (Array.isArray(store?.posts) ? store.posts : []),
    [store?.posts]
  );
  const currentUserName =
    (typeof store?.profile?.name === 'string' && store.profile.name.trim()) || 'حساب وِصل';
  const currentUserAvatar =
    (typeof store?.profile?.avatar === 'string' && store.profile.avatar.trim()) || undefined;

  const [posts, setPosts] = useState<FeedPostItem[]>(() => cachedFeedPosts || []);
  const [loading, setLoading] = useState<boolean>(() => !cachedFeedPosts);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  const [activeSheetPostId, setActiveSheetPostId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'relevant' | 'newest'>('relevant');
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToComment, setReplyingToComment] = useState<{
    commentId: string;
    authorName: string;
  } | null>(null);
  const [expandedRepliesIds, setExpandedRepliesIds] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState('');

  const commentInputRef = useRef<HTMLInputElement | null>(null);
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

  const mergedPosts = useMemo(() => {
    const localMapped: FeedPostItem[] = storePosts
      .filter((p): p is Record<string, any> => Boolean(p && typeof p === 'object'))
      .map((p, idx) => ({
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
        comments: sanitizeComments(p?.comments),
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

  const activePost = useMemo(
    () => mergedPosts.find((p) => p.id === activeSheetPostId) || null,
    [mergedPosts, activeSheetPostId]
  );

  const sendPostNotification = async (
    targetPost: FeedPostItem,
    type: 'like' | 'comment',
    previewText?: string
  ) => {
    if (!targetPost.userId || !currentUid || targetPost.userId === currentUid) return;
    try {
      await supabase.from('notifications').insert({
        user_id: targetPost.userId,
        sender_id: currentUid,
        actor_name: currentUserName,
        actor_avatar: currentUserAvatar || null,
        type,
        message: type === 'like' ? 'أعجب بمنشورك' : 'علّق على منشورك',
        preview_text: previewText || targetPost.content.slice(0, 60) || null,
        is_read: false,
      });
    } catch {
      // تجاهل خطأ الإشعار
    }
  };

  const handleToggleLike = (item: FeedPostItem) => {
    const willLike = !item.likedByMe;

    const updater = (list: FeedPostItem[]) =>
      list.map((p) => {
        if (p.id !== item.id) return p;
        const nextLiked = !p.likedByMe;
        const nextCount = Math.max(0, p.likesCount + (nextLiked ? 1 : -1));
        return { ...p, likedByMe: nextLiked, likesCount: nextCount };
      });

    setPosts(updater);
    if (cachedFeedPosts) {
      cachedFeedPosts = updater(cachedFeedPosts);
    }

    if (willLike) {
      void sendPostNotification(item, 'like');
    }
  };

  const handleToggleCommentLike = (postId: string, commentId: string) => {
    const updater = (list: FeedPostItem[]) =>
      list.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) => {
            if (c.id !== commentId) return c;
            const nextLiked = !c.likedByMe;
            return {
              ...c,
              likedByMe: nextLiked,
              likesCount: Math.max(0, c.likesCount + (nextLiked ? 1 : -1)),
            };
          }),
        };
      });

    setPosts(updater);
    if (cachedFeedPosts) {
      cachedFeedPosts = updater(cachedFeedPosts);
    }
  };

  const handleToggleReplyLike = (postId: string, commentId: string, replyId: string) => {
    const updater = (list: FeedPostItem[]) =>
      list.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) => {
            if (c.id !== commentId) return c;
            return {
              ...c,
              replies: c.replies.map((r) => {
                if (r.id !== replyId) return r;
                const nextLiked = !r.likedByMe;
                return {
                  ...r,
                  likedByMe: nextLiked,
                  likesCount: Math.max(0, r.likesCount + (nextLiked ? 1 : -1)),
                };
              }),
            };
          }),
        };
      });

    setPosts(updater);
    if (cachedFeedPosts) {
      cachedFeedPosts = updater(cachedFeedPosts);
    }
  };

  const handleStartReply = (commentId: string, authorName: string) => {
    setReplyingToComment({ commentId, authorName });
    setExpandedRepliesIds((prev) => ({ ...prev, [commentId]: true }));
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 60);
  };

  const handleSubmitCommentOrReply = (item: FeedPostItem, e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newCommentText.trim();
    if (!cleaned) return;

    if (replyingToComment) {
      const targetCommentId = replyingToComment.commentId;
      const newReply: CommentReplyItem = {
        id: `rpl-${Date.now()}`,
        author: currentUserName,
        authorId: currentUid,
        avatar: currentUserAvatar,
        text: cleaned,
        createdAt: 'الآن',
        likesCount: 0,
        likedByMe: false,
      };

      const updater = (list: FeedPostItem[]) =>
        list.map((p) => {
          if (p.id !== item.id) return p;
          return {
            ...p,
            comments: p.comments.map((c) =>
              c.id === targetCommentId
                ? { ...c, replies: [...c.replies, newReply] }
                : c
            ),
          };
        });

      setPosts(updater);
      if (cachedFeedPosts) {
        cachedFeedPosts = updater(cachedFeedPosts);
      }
      setExpandedRepliesIds((prev) => ({ ...prev, [targetCommentId]: true }));
      setReplyingToComment(null);
      setNewCommentText('');
      void sendPostNotification(item, 'comment', `رد: ${cleaned}`);
      return;
    }

    const newComment: PostCommentItem = {
      id: `cmt-${Date.now()}`,
      author: currentUserName,
      authorId: currentUid,
      avatar: currentUserAvatar,
      text: cleaned,
      createdAt: 'الآن',
      likesCount: 0,
      likedByMe: false,
      reactionEmoji: '👍',
      replies: [],
    };

    const updater = (list: FeedPostItem[]) =>
      list.map((p) =>
        p.id === item.id ? { ...p, comments: [...p.comments, newComment] } : p
      );

    setPosts(updater);
    if (cachedFeedPosts) {
      cachedFeedPosts = updater(cachedFeedPosts);
    }
    setNewCommentText('');
    void sendPostNotification(item, 'comment', cleaned);
  };

  const handleInsertQuickReaction = (emoji: string) => {
    setNewCommentText((prev) => (prev ? `${prev} ${emoji}` : emoji));
    commentInputRef.current?.focus();
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
    if (activeSheetPostId === item.id) {
      setActiveSheetPostId(null);
    }

    if (item.dbId) {
      try {
        await supabase.from('posts').delete().eq('id', item.dbId);
      } catch {
        // تجاهل
      }
    }
  };

  const openCommentsSheet = (postId: string) => {
    setReplyingToComment(null);
    setNewCommentText('');
    setActiveSheetPostId(postId);
  };

  const displayedSheetComments = useMemo(() => {
    if (!activePost) return [];
    const list = [...activePost.comments];
    if (sortMode === 'newest') {
      return list.reverse();
    }
    return list;
  }, [activePost, sortMode]);

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
          const authorVerified = isVerifiedFounderId(item.userId);
          const safeComments = Array.isArray(item.comments) ? item.comments : [];
          const totalCommentsAndReplies = safeComments.reduce(
            (acc, c) => acc + 1 + (Array.isArray(c.replies) ? c.replies.length : 0),
            0
          );

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
                    <p className="flex items-center gap-1 text-xs font-extrabold text-white">
                      <span className="truncate">{item.authorName}</span>
                      {authorVerified && <VerifiedBlueBadge size={15} />}
                    </p>
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
                <span>
                  {totalCommentsAndReplies > 0 ? `${totalCommentsAndReplies} تعليق` : ''}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 border-t border-slate-800/80 pt-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleLike(item)}
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
                  onClick={() => openCommentsSheet(item.id)}
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
            </article>
          );
        })
      )}

      {/* نافذة التعليقات المنبثقة بأسلوب فيسبوك مع الرد والتفاعل */}
      {activePost && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75"
          onClick={() => setActiveSheetPostId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl mx-auto h-[84vh] rounded-t-3xl border-t border-white/10 bg-[#18191a] text-[#e4e6eb] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="bg-[#242526] border-b border-white/10 px-4 pt-2 pb-2.5 space-y-2.5">
              <div className="mx-auto h-1.5 w-11 rounded-full bg-slate-500/70" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(activePost)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                      activePost.likedByMe
                        ? 'bg-[#1877F2]/20 text-[#4599FF]'
                        : 'bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <ThumbsUp
                      size={14}
                      className={activePost.likedByMe ? 'fill-[#4599FF]' : ''}
                    />
                    <span>{activePost.likesCount}</span>
                  </button>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-300">
                    <MessageCircle size={14} />
                    <span>{activePost.comments.length}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => void handleSharePost(activePost)}
                    aria-label="مشاركة"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-white/10"
                  >
                    <Share2 size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSheetPostId(null)}
                  aria-label="إغلاق التعليقات"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 hover:bg-white/15"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#18191a]">
              <button
                type="button"
                onClick={() =>
                  setSortMode((prev) => (prev === 'relevant' ? 'newest' : 'relevant'))
                }
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-200"
              >
                <span>{sortMode === 'relevant' ? 'الأكثر ملاءمة' : 'الأحدث'}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <span>تعليقات منشور {activePost.authorName}</span>
                {isVerifiedFounderId(activePost.userId) && <VerifiedBlueBadge size={12} />}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {displayedSheetComments.length === 0 ? (
                <div className="py-12 text-center space-y-1">
                  <p className="text-sm font-bold text-slate-200">لا توجد تعليقات بعد</p>
                  <p className="text-xs text-slate-400">كن أول من يعلّق ويتفاعل على هذا المنشور.</p>
                </div>
              ) : (
                displayedSheetComments.map((cmt) => {
                  const hasReplies = Array.isArray(cmt.replies) && cmt.replies.length > 0;
                  const showReplies = Boolean(expandedRepliesIds[cmt.id]);
                  const commentVerified = isVerifiedFounderId(cmt.authorId);

                  return (
                    <div key={cmt.id} className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        {cmt.avatar ? (
                          <img
                            src={cmt.avatar}
                            alt={cmt.author}
                            loading="lazy"
                            decoding="async"
                            className="h-9 w-9 shrink-0 rounded-full object-cover border border-white/15 mt-0.5"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600/35 to-purple-600/35 border border-white/15 text-xs font-black text-cyan-200 mt-0.5">
                            {cmt.author.slice(0, 1)}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="relative inline-block max-w-full rounded-2xl bg-[#2a2b2e] px-3.5 py-2">
                            <p className="flex items-center gap-1 text-xs font-extrabold text-white">
                              <span>{cmt.author}</span>
                              {commentVerified && <VerifiedBlueBadge size={13} />}
                            </p>
                            <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-slate-100">
                              {cmt.text}
                            </p>

                            {cmt.likesCount > 0 && (
                              <span className="absolute -bottom-2.5 -left-2 inline-flex items-center gap-1 rounded-full bg-[#3a3b3f] border border-[#18191a] px-1.5 py-0.5 text-[10px] font-bold text-slate-200 shadow">
                                <span>{cmt.reactionEmoji || '👍'}</span>
                                <span>{cmt.likesCount}</span>
                              </span>
                            )}
                          </div>

                          <div
                            className={`flex items-center gap-4 px-2 text-[11px] font-bold text-slate-400 ${
                              cmt.likesCount > 0 ? 'mt-2.5' : 'mt-1'
                            }`}
                          >
                            <span>{cmt.createdAt}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleCommentLike(activePost.id, cmt.id)}
                              className={
                                cmt.likedByMe
                                  ? 'text-[#4599FF]'
                                  : 'text-slate-400 hover:text-slate-200'
                              }
                            >
                              أعجبني
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartReply(cmt.id, cmt.author)}
                              className="text-slate-400 hover:text-slate-200"
                            >
                              رد
                            </button>
                          </div>

                          {hasReplies && !showReplies && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRepliesIds((prev) => ({
                                  ...prev,
                                  [cmt.id]: true,
                                }))
                              }
                              className="mt-2 inline-flex items-center gap-1.5 px-2 text-xs font-extrabold text-slate-300 hover:text-white"
                            >
                              <ChevronDown size={14} />
                              <span>عرض الردود السابقة ({cmt.replies.length})</span>
                            </button>
                          )}

                          {hasReplies && showReplies && (
                            <div className="mt-2.5 mr-2 pr-3 border-r-2 border-slate-700 space-y-2.5">
                              {cmt.replies.map((rep) => {
                                const replyVerified = isVerifiedFounderId(rep.authorId);
                                return (
                                  <div key={rep.id} className="flex items-start gap-2">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-white/10 text-[11px] font-black text-cyan-300 mt-0.5">
                                      {rep.author.slice(0, 1)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="inline-block max-w-full rounded-2xl bg-[#2a2b2e] px-3 py-1.5">
                                        <p className="flex items-center gap-1 text-[11px] font-extrabold text-white">
                                          <span>{rep.author}</span>
                                          {replyVerified && <VerifiedBlueBadge size={12} />}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-100">{rep.text}</p>
                                      </div>
                                      <div className="mt-1 flex items-center gap-3 px-2 text-[10px] font-bold text-slate-400">
                                        <span>{rep.createdAt}</span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleReplyLike(activePost.id, cmt.id, rep.id)
                                          }
                                          className={
                                            rep.likedByMe
                                              ? 'text-[#4599FF]'
                                              : 'text-slate-400 hover:text-slate-200'
                                          }
                                        >
                                          أعجبني {rep.likesCount > 0 ? `(${rep.likesCount})` : ''}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleStartReply(cmt.id, rep.author)}
                                          className="text-slate-400 hover:text-slate-200"
                                        >
                                          رد
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/10 bg-[#242526] px-3 pt-2 pb-3 space-y-2">
              {replyingToComment && (
                <div className="flex items-center justify-between rounded-xl bg-[#18191a] px-3 py-1.5 text-[11px] text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <CornerDownLeft size={12} className="text-cyan-400" />
                    <span>
                      الرد على <strong className="text-white">{replyingToComment.authorName}</strong>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyingToComment(null)}
                    className="text-rose-400 font-bold hover:underline"
                  >
                    إلغاء
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-1 overflow-x-auto px-1 py-0.5">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleInsertQuickReaction(emoji)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base hover:bg-white/10 transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => handleSubmitCommentOrReply(activePost, e)}
                className="flex items-center gap-2"
              >
                <div className="flex flex-1 items-center gap-2 rounded-full bg-[#3a3b3c] px-3.5 py-2">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder={
                      replyingToComment
                        ? `الرد على ${replyingToComment.authorName}...`
                        : 'اكتب تعليقاً...'
                    }
                    className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleInsertQuickReaction('😊')}
                    aria-label="إيموجي"
                    className="text-slate-300 hover:text-white"
                  >
                    <Smile size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertQuickReaction('📷')}
                    aria-label="مرفق"
                    className="text-slate-300 hover:text-white"
                  >
                    <ImageIcon size={16} />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  aria-label="إرسال"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-white disabled:opacity-40 hover:bg-[#166fe5] transition"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
