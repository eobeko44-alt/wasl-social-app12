import { useCallback, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Avatar } from '@/components/UserCard';

export default function ChatList({
  className = '',
  onOpen,
}: {
  className?: string;
  onOpen?: (id: string) => void;
}) {
  const { conversations, activeConversationId, openConversation } = useAppStore();
  const [query, setQuery] = useState('');

  const handleOpen = useCallback(
    (id: string) => {
      openConversation(id);
      onOpen?.(id);
    },
    [openConversation, onOpen]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        (c.user?.name || '').toLowerCase().includes(q) ||
        (c.user?.username || '').toLowerCase().includes(q)
    );
  }, [conversations, query]);

  return (
    <aside className={`flex h-full flex-col border-slate-800 md:w-80 md:border-e lg:w-96 ${className}`}>
      <div className="space-y-3 p-4">
        <h2 className="text-xl font-bold text-white">المحادثات</h2>
        <div className="relative">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في المحادثات..."
            className="w-full rounded-full border border-slate-700/70 bg-slate-800/60 py-2.5 pr-10 pl-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-500">لا توجد محادثات مطابقة</p>
        )}
        {filtered.map((conv) => {
          const last = conv.messages[conv.messages.length - 1];
          const active = conv.id === activeConversationId;
          return (
            <button
              key={conv.id}
              type="button"
              onClick={() => handleOpen(conv.id)}
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-right transition ${
                active
                  ? 'bg-gradient-to-l from-cyan-600/15 to-purple-600/10'
                  : 'hover:bg-slate-800/60'
              }`}
            >
              <Avatar src={conv.user?.avatar} online={conv.user?.isOnline} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{conv.user?.name || 'مستخدم وِصل'}</p>
                <p
                  className={`truncate text-xs ${
                    last?.senderId === 'me' ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {last ? `${last.senderId === 'me' ? 'أنت: ' : ''}${last.text}` : 'ابدأ المحادثة الآن'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-slate-500">{last?.createdAt ?? ''}</span>
                {conv.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white shadow-md shadow-emerald-900/50">
                    {conv.unread}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
