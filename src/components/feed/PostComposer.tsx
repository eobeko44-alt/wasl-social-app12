import { useState } from 'react';
import { Image as ImageIcon, Send, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function PostComposer() {
  const { profile, createPost } = useAppStore();
  const [text, setText] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    createPost(text.trim(), imageUrl.trim() || undefined);
    setText('');
    setImageUrl('');
    setShowImageInput(false);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/20">
      <div className="flex items-start gap-3">
        <img src={profile.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full border-2 border-slate-700 object-cover" />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="بماذا تفكر الآن؟"
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-700/70 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
        />
      </div>
      {showImageInput && (
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="ألصق رابط الصورة هنا..."
          dir="ltr"
          className="mt-3 w-full rounded-xl border border-slate-700/70 bg-slate-800/60 px-4 py-2 text-right text-xs text-white placeholder:text-slate-500 outline-none transition focus:border-purple-500/60"
        />
      )}
      <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">
        <button
          onClick={() => setShowImageInput((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            showImageInput
              ? 'bg-purple-600/20 text-purple-300'
              : 'text-slate-400 hover:bg-slate-800 hover:text-purple-300'
          }`}
        >
          <ImageIcon size={16} />
          صورة
        </button>
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="flex items-center gap-2 rounded-full bg-gradient-to-l from-cyan-600 to-purple-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-900/40 transition enabled:hover:brightness-110 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles size={15} />
          نشر
        </button>
      </div>
    </div>
  );
}
