import { useMemo, useState } from 'react';
import { MessageCircle, Search, UserPlus, Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Avatar } from '@/components/UserCard';
import StoriesBar from './StoriesBar';
import AddContactModal from './AddContactModal';

export default function ContactsTab() {
  const { contacts, startConversationWith } = useAppStore();
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.name.includes(q) || c.username.includes(q) || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    );
  }, [contacts, query]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <StoriesBar />

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-cyan-400" />
            <h2 className="text-base font-bold text-white">جهات الاتصال</h2>
            <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-semibold text-cyan-300">
              {contacts.length}
            </span>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-l from-cyan-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-900/40 transition hover:brightness-110 active:scale-95"
          >
            <UserPlus size={15} />
            إضافة جهة اتصال
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الرقم..."
            className="w-full rounded-full border border-slate-700/70 bg-slate-800/60 py-2.5 pr-10 pl-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-400">
              {query ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد جهات اتصال محفوظة بعد'}
            </p>
            {!query && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-3 text-sm font-bold text-cyan-400 hover:text-cyan-300"
              >
                أضف أول جهة اتصال
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/70">
            {filtered.map((user) => (
              <li key={user.id} className="flex items-center gap-3 py-2.5 transition hover:bg-slate-800/40 rounded-lg px-2">
                <Avatar src={user.avatar} online={user.isOnline} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{user.name}</p>
                  <p className="truncate text-xs text-slate-500" dir="ltr">{user.phone}</p>
                </div>
                <button
                  onClick={() => startConversationWith(user)}
                  className="rounded-full bg-slate-800 p-2 text-slate-300 transition hover:bg-cyan-600 hover:text-white"
                  aria-label="إرسال رسالة"
                  title="إرسال رسالة"
                >
                  <MessageCircle size={17} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-[11px] text-slate-600">
        قائمة جهات اتصالك خاصة بك ولا تظهر لأي شخص آخر · الحالات تختفي تلقائياً بعد ٢٤ ساعة
      </p>

      <AddContactModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
