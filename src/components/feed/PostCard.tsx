import { useState } from 'react';
import { Heart, MessageCircle, Send } from 'lucide-react';
import type { Post } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Avatar } from '@/components/UserCard';

export default function PostCard({ post }: { post: Post }) {
  const { toggleLike, addComment } = useAppStore();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const submitComment = () => {
    if (!commentText.trim()) return;
    addComment(post.id, commentText.trim());
    setCommentText('');
    setShowComments(true);
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/20 transition hover:border-slate-700">
      <div className="flex items-center gap-3 p-4 pb-3">
        <Avatar src={post.author.avatar} online={post.author.isOnline} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">
            {post.author.name}
            {post.author.id === 'me' && <span className="mr-1.5 text-xs font-normal text-cyan-400">(أنت)</span>}
          </p>
          <p className="text-xs text-slate-500">
            {post.author.username} · {post.createdAt}
          </p>
        </div>
      </div>

      <p className="whitespace-pre-wrap px-4 pb-3 text-[15px] leading-relaxed text-slate-200">{post.text}</p>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
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
            post.likedByMe
              ? 'bg-rose-500/15 text-rose-400'
              : 'text-slate-400 hover:bg-slate-800 hover:text-rose-400'
          }`}
        >
          <Heart size={17} fill={post.likedByMe ? 'currentColor' : 'none'} />
          {post.likes}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition active:scale-95 ${
            showComments ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-300'
          }`}
        >
          <MessageCircle size={17} />
          {post.comments.length}
          <span className="hidden text-xs font-normal sm:inline">تعليق</span>
        </button>
      </div>

      {showComments && (
        <div className="space-y-3 border-t border-slate-800 bg-slate-950/40 p-4">
          {post.comments.length === 0 && (
            <p className="text-center text-xs text-slate-500">لا توجد تعليقات بعد. كن أول المعلقين!</p>
          )}
          {post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <Avatar src={c.author.avatar} size="sm" />
              <div className="min-w-0 flex-1 rounded-xl rounded-tr-sm bg-slate-800/80 px-3 py-2">
                <p className="text-xs font-bold text-cyan-300">
                  {c.author.name}
                  {c.author.id === 'me' && <span className="mr-1 font-normal text-slate-500">(أنت)</span>}
                  <span className="mr-2 text-[10px] font-normal text-slate-500">{c.createdAt}</span>
                </p>
                <p className="text-sm text-slate-200">{c.text}</p>
              </div>
            </div>
          ))}
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
