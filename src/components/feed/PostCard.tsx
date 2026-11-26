import { useState } from 'react';
import { Heart, MessageCircle, Send } from 'lucide-react';
import type { Post } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Avatar } from '@/components/UserCard';

function formatFacebookTime(rawDate: unknown): string {
  if (!rawDate) return 'الآن';
  const str = String(rawDate).trim();
  if (!str || str === 'الآن') return 'الآن';

  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) {
    return str;
  }

  const nowMs = Date.now();
  const postMs = parsed.getTime();
  const diffSec = Math.max(0, Math.floor((nowMs - postMs) / 1000));

  if (diffSec < 60) return 'الآن';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} د`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} س`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ي`;

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function PostCard({ post }: { post: Post }) {
  const { toggleLike, addComment, profile } = useAppStore() as Record<string, any>;
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const p = post as Record<string, any>;
  const isMe =
    p.author?.id === 'me' ||
    (profile?.id && p.userId && String(p.userId) === String(profile.id)) ||
    String(p.authorHandle || p.author?.username || '').replace(/^@/, '') ===
      String(profile?.username || '').replace(/^@/, '') ||
    String(p.authorHandle || p.author?.username || '') === '@you';

  const authorName = String(
    p.author?.name || p.authorName || (isMe ? profile?.name : '') || 'مستخدم وصل'
  );
  const rawHandle = String(
    p.author?.username || p.authorHandle || (isMe ? profile?.username : '') || '@wasl_user'
  );
  const cleanHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

  const avatarSrc = String(
    p.authorAvatar ||
      p.author?.avatar ||
      (isMe ? profile?.avatar || profile?.avatarUrl || profile?.avatar_url : '') ||
      ''
  ).trim();

  const isOnline = Boolean(p.author?.isOnline);
  const bodyText = p.text ?? p.content ?? '';
  const imageSrc = p.imageUrl || p.image;
  const comments = Array.isArray(p.comments) ? p.comments : [];
  const likesCount = Number(p.likes ?? 0);
  const likedByMe = Boolean(p.likedByMe);

  const timeLabel = formatFacebookTime(
    p.createdAt || p.created_at || p.timestamp
  );

  const submitComment = () => {
    if (!commentText.trim()) return;
    addComment(post.id, commentText.trim());
    setCommentText('');
    setShowComments(true);
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/20 transition hover:border-slate-700">
      <div className="flex items-center gap-3 p-4 pb-3">
        {avatarSrc ? (
          <Avatar src={avatarSrc} online={isOnline} />
        ) : (
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-gradient-to-br from-purple-600/30 to-cyan-600/30 text-sm font-bold text-white">
            {authorName.slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">
            {authorName}
            {isMe && <span className="mr-1.5 text-xs font-normal text-cyan-400">(أنت)</span>}
          </p>
          <p className="truncate text-xs text-slate-400">
            <span>{cleanHandle}</span>
            <span className="mx-1.5">·</span>
            <span className="font-medium text-slate-300">{timeLabel}</span>
          </p>
        </div>
      </div>

      {bodyText && (
        <p className="whitespace-pre-wrap px-4 pb-3 text-[15px] leading-relaxed text-slate-200">{bodyText}</p>
      )}

      {imageSrc && (
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          className="max-h-96 w-full border-y border-slate-800 bg-slate-950 object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      )}

      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          onClick={() => toggleLike(post.id)}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition active:scale-95 ${
            likedByMe
              ? 'bg-rose-500/15 text-rose-400'
              : 'text-slate-400 hover:bg-slate-800 hover:text-rose-400'
          }`}
        >
          <Heart size={17} fill={likedByMe ? 'currentColor' : 'none'} />
          {likesCount}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition active:scale-95 ${
            showComments ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-300'
          }`}
        >
          <MessageCircle size={17} />
          {comments.length}
          <span className="hidden text-xs font-normal sm:inline">تعليق</span>
        </button>
      </div>

      {showComments && (
        <div className="space-y-3 border-t border-slate-800 bg-slate-950/40 p-4">
          {comments.length === 0 && (
            <p className="text-center text-xs text-slate-500">لا توجد تعليقات بعد. كن أول المعلقين!</p>
          )}
          {comments.map((c: Record<string, any>, idx: number) => {
            const cAuthor = c.author || { id: '', name: 'مستخدم', avatar: '' };
            const cAvatar = String(cAuthor.avatar || '').trim();
            const cName = String(cAuthor.name || 'مستخدم');
            return (
              <div key={String(c.id || idx)} className="flex items-start gap-2.5">
                {cAvatar ? (
                  <Avatar src={cAvatar} size="sm" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-cyan-300">
                    {cName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1 rounded-xl rounded-tr-sm bg-slate-800/80 px-3 py-2">
                  <p className="text-xs font-bold text-cyan-300">
                    {cName}
                    {cAuthor.id === 'me' && <span className="mr-1 font-normal text-slate-500">(أنت)</span>}
                    <span className="mr-2 text-[10px] font-normal text-slate-400">
                      {formatFacebookTime(c.createdAt)}
                    </span>
                  </p>
                  <p className="text-sm text-slate-200">{c.text}</p>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2 pt-1">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="اكتب تعليقاً..."
              className="w-full rounded-full border border-slate-700/70 bg-slate-800/60 px-4 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60"
            />
            <button
              onClick={submitComment}
              disabled={!commentText.trim()}
              className="shrink-0 rounded-full bg-cyan-600 p-2.5 text-white transition enabled:hover:bg-cyan-500 disabled:opacity-40"
              aria-label="إرسال تعليق"
            >
              <Send size={15} className="-scale-x-100" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
