import { useEffect, useRef, useState } from 'react';
import { ArrowRight, MoreVertical, Phone, Send, Video } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Avatar } from '@/components/UserCard';

export default function ChatWindow({ onBack }: { onBack: () => void }) {
  const { conversations, activeConversationId, sendMessage, profile } = useAppStore();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find((c) => c.id === activeConversationId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length, activeConversationId]);

  if (!conversation) {
    return (
      <div className="hidden flex-1 flex-col items-center justify-center gap-3 md:flex">
        <div className="rounded-full bg-slate-800 p-6 text-slate-600">
          <Send size={36} className="-scale-x-100" />
        </div>
        <p className="text-slate-400">اختر محادثة لبدء الدردشة</p>
        <p className="text-xs text-slate-600">رسائلك الخاصة مشفّرة ومحفوظة لديك وحدك</p>
      </div>
    );
  }

  const submit = () => {
    if (!text.trim()) return;
    sendMessage(conversation.id, text.trim());
    setText('');
  };

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur">
        <button
          onClick={onBack}
          className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white md:hidden"
          aria-label="رجوع"
        >
          <ArrowRight size={20} />
        </button>
        <Avatar src={conversation.user.avatar} online={conversation.user.isOnline} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{conversation.user.name}</p>
          <p className={`text-xs ${conversation.user.isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
            {conversation.user.isOnline ? 'متصل الآن' : conversation.user.lastSeen}
          </p>
        </div>
        <button className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-cyan-300" aria-label="مكالمة صوتية">
          <Phone size={18} />
        </button>
        <button className="hidden rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-cyan-300 sm:block" aria-label="مكالمة فيديو">
          <Video size={18} />
        </button>
        <button className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white" aria-label="المزيد">
          <MoreVertical size={18} />
        </button>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto bg-slate-950/50 p-4">
        {conversation.messages.map((msg) => {
          const mine = msg.senderId === 'me' || msg.senderId === profile.id;
          return (
            <div key={msg.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-md ${
                  mine
                    ? 'rounded-tr-sm bg-gradient-to-l from-cyan-700 to-cyan-600 text-white'
                    : 'rounded-tl-sm border border-slate-700/60 bg-slate-800 text-slate-100'
                }`}
              >
                <p>{msg.text}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? 'text-cyan-200/70' : 'text-slate-500'}`}>{msg.createdAt}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <footer className="border-t border-slate-800 bg-slate-900/90 p-3">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="اكتب رسالتك هنا..."
            className="w-full rounded-full border border-slate-700/70 bg-slate-800/70 px-5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="shrink-0 rounded-full bg-gradient-to-l from-cyan-600 to-purple-600 p-3 text-white shadow-lg shadow-cyan-900/40 transition enabled:hover:brightness-110 enabled:active:scale-95 disabled:opacity-40"
            aria-label="إرسال"
          >
            <Send size={18} className="-scale-x-100" />
          </button>
        </div>
      </footer>
    </div>
  );
}
