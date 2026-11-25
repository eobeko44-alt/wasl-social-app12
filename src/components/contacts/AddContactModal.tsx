import { useState } from 'react';
import { AtSign, Phone, Search, UserPlus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Avatar } from '@/components/UserCard';
import Modal from '@/components/Modal';

export default function AddContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addContactByHandle, users } = useAppStore();
  const [handle, setHandle] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const suggestions = users.filter((u) => !u.isContact).slice(0, 3);

  const submit = () => {
    const res = addContactByHandle(handle);
    setResult(
      res.ok
        ? { ok: true, message: 'تمت الإضافة إلى جهات اتصالك بنجاح!' }
        : { ok: false, message: res.error ?? 'حدث خطأ' }
    );
    if (res.ok) {
      setHandle('');
    }
  };

  const close = () => {
    setHandle('');
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="إضافة جهة اتصال">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          ابحث عن شخص تعرفه برقم هاتفه أو اسم المستخدم الخاص به لإضافته إلى جهات اتصالك الخاصة.
        </p>

        <div className="relative">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value);
              setResult(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="@username أو +966 5X XXX XXXX"
            dir="ltr"
            className="w-full rounded-xl border border-slate-700/70 bg-slate-800/60 py-3 pr-10 pl-4 text-right text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        {result && (
          <div
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
              result.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            {result.message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
            <AtSign size={14} className="text-cyan-400" />
            اسم المستخدم يبدأ بـ @
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
            <Phone size={14} className="text-purple-400" />
            الرقم بالصيغة الدولية
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!handle.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-900/40 transition enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <UserPlus size={16} />
          إضافة إلى جهات الاتصال
        </button>

        {suggestions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">اقتراحات سريعة</p>
            <div className="space-y-2">
              {suggestions.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 rounded-xl bg-slate-800/50 p-2.5">
                  <Avatar src={u.avatar} size="sm" online={u.isOnline} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{u.name}</p>
                    <p className="truncate text-xs text-cyan-400" dir="ltr">{u.username}</p>
                  </div>
                  <button
                    onClick={() => {
                      addContactByHandle(u.username);
                      setResult({ ok: true, message: `تمت إضافة ${u.name} إلى جهات اتصالك` });
                    }}
                    className="shrink-0 rounded-full bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-cyan-600"
                  >
                    إضافة
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
