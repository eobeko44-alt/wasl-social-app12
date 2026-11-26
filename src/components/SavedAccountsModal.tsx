import React, { useEffect, useState } from 'react';
import { ChevronLeft, MoreHorizontal, Trash2, X } from 'lucide-react';
import {
  fetchSavedAccountsFromSupabase,
  getSavedAccounts,
  removeSavedAccount,
  saveAccountToDevice,
  SavedAccountItem,
} from '@/lib/savedAccounts';

interface SavedAccountsModalProps {
  open: boolean;
  onClose: () => void;
  onSelectAccount: (account: SavedAccountItem) => void;
  onUseAnotherProfile: () => void;
  onCreateNewAccount: () => void;
}

export function SavedAccountsModal({
  open,
  onClose,
  onSelectAccount,
  onUseAnotherProfile,
  onCreateNewAccount,
}: SavedAccountsModalProps) {
  const [accounts, setAccounts] = useState<SavedAccountItem[]>([]);
  const [manageMode, setManageMode] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAccounts(getSavedAccounts());
    setManageMode(false);
    void fetchSavedAccountsFromSupabase().then((list) => {
      setAccounts(list);
    });
  }, [open]);

  if (!open) return null;

  const handleSelect = async (account: SavedAccountItem) => {
    if (manageMode) return;
    const updated = await saveAccountToDevice(account);
    setAccounts(updated);
    onSelectAccount(account);
    onClose();
  };

  const handleDelete = async (id: string) => {
    const updated = await removeSavedAccount(id);
    setAccounts(updated);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[70] flex flex-col justify-between bg-[#18191a] text-[#e4e6eb] overflow-y-auto"
    >
      {/* الشريط العلوي */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-[#18191a]/95 backdrop-blur px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 transition"
        >
          <X size={20} />
        </button>

        <button
          type="button"
          onClick={() => setManageMode((prev) => !prev)}
          aria-label="إدارة الحسابات المحفوظة"
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
            manageMode
              ? 'bg-cyan-500/20 text-cyan-300'
              : 'text-slate-200 hover:bg-white/10'
          }`}
        >
          <MoreHorizontal size={22} />
        </button>
      </div>

      {/* قائمة الحسابات المحفوظة */}
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-3 space-y-3">
        {manageMode && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-3.5 py-2 text-center text-xs font-bold text-amber-200">
            اختر أي حساب لإزالته من هذا الجهاز
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#242526] p-8 text-center space-y-2">
            <p className="text-sm font-bold text-white">لا توجد حسابات محفوظة بعد</p>
            <p className="text-xs text-slate-400">
              عند تسجيل الدخول بأي حساب سيتم حفظه في قاعدة البيانات للدخول السريع.
            </p>
          </div>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => void handleSelect(acc)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') void handleSelect(acc);
              }}
              className="flex items-center justify-between rounded-2xl border border-white/15 bg-[#242526] px-4 py-3.5 shadow-sm hover:bg-[#2d2f31] active:scale-[0.99] transition cursor-pointer"
            >
              {/* الصورة الدائرية + الاسم */}
              <div className="flex items-center gap-3.5 min-w-0">
                {acc.avatar ? (
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    className="h-12 w-12 shrink-0 rounded-full object-cover border border-white/15"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#3a3b3c] text-lg font-black text-slate-200">
                    {acc.name.slice(0, 1)}
                  </div>
                )}

                <span className="truncate text-sm font-bold text-white">{acc.name}</span>
              </div>

              {/* سهم الدخول أو زر الحذف */}
              {manageMode ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(acc.id);
                  }}
                  aria-label={`إزالة ${acc.name}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition"
                >
                  <Trash2 size={16} />
                </button>
              ) : (
                <ChevronLeft size={20} className="shrink-0 text-slate-400" />
              )}
            </div>
          ))
        )}
      </div>

      {/* الأزرار السفلية + شعار وِصل */}
      <div className="mx-auto w-full max-w-md px-4 pt-3 pb-6 space-y-3">
        <button
          type="button"
          onClick={() => {
            onClose();
            onUseAnotherProfile();
          }}
          className="w-full rounded-full bg-[#2d2f31] py-3 text-xs font-extrabold text-white hover:bg-[#383a3d] transition"
        >
          استخدام ملف شخصي آخر
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onCreateNewAccount();
          }}
          className="w-full rounded-full border border-[#3b82f6] bg-transparent py-3 text-xs font-extrabold text-[#4599FF] hover:bg-[#3b82f6]/10 transition"
        >
          إنشاء حساب جديد
        </button>

        <div className="pt-2 text-center">
          <span className="text-xs font-black tracking-wide text-slate-400">وِصل</span>
        </div>
      </div>
    </div>
  );
}

export default SavedAccountsModal;
