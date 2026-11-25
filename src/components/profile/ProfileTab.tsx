import { useEffect, useState } from 'react';
import { AtSign, Check, Globe, Lock, LogOut, Pencil, Phone, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

type AuthMode = 'phone' | 'email';

interface SavedAccount {
  id: string;
  name: string;
  identifier: string;
  mode: AuthMode;
  username: string;
  avatar?: string;
}

const SAVED_ACCOUNTS_KEY = 'wasl_saved_accounts_v1';

function saveCurrentAccountBeforeLogout(acc: SavedAccount) {
  try {
    const raw = window.localStorage.getItem(SAVED_ACCOUNTS_KEY);
    const existing: SavedAccount[] = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(existing) ? existing : [];
    const filtered = list.filter(
      (item) => item.id !== acc.id && item.identifier !== acc.identifier
    );
    const next = [acc, ...filtered].slice(0, 8);
    window.localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export default function ProfileTab() {
  const { profile, updateProfile, posts, contacts } = useAppStore();
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(profile.bio ?? '');
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [metaName, setMetaName] = useState('');
  const [metaPhone, setMetaPhone] = useState('');
  const [metaEmail, setMetaEmail] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const u = data.user;
      if (u?.id) setUserId(u.id);
      if (u?.email) setMetaEmail(String(u.email).trim());
      const m = u?.user_metadata;
      if (m?.full_name) setMetaName(String(m.full_name).trim());
      if (m?.phone_number) setMetaPhone(String(m.phone_number).trim());
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const u = session?.user;
      if (u?.id) setUserId(u.id);
      if (u?.email) setMetaEmail(String(u.email).trim());
      const m = u?.user_metadata;
      if (m?.full_name) setMetaName(String(m.full_name).trim());
      if (m?.phone_number) setMetaPhone(String(m.phone_number).trim());
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const currentName = (metaName || profile.name || 'أنت').trim();
  const currentPhone = (metaPhone || profile.phone || '').trim();
  const latinHandle = currentName.toLowerCase().replace(/[^a-z0-9_]/g, '');
  const currentUsername = latinHandle ? `@${latinHandle}` : profile.username;

  const saveBio = () => {
    updateProfile({ bio: bioDraft.trim() });
    setEditingBio(false);
  };

  const performLogout = async (shouldSaveAccount: boolean) => {
    setLoggingOut(true);
    if (shouldSaveAccount) {
      const isPhoneLocal = metaEmail.endsWith('@wasl-phone.local');
      const phoneFromEmail = isPhoneLocal ? metaEmail.replace('@wasl-phone.local', '') : '';
      const identifier = (currentPhone || phoneFromEmail || metaEmail || currentUsername).trim();
      const mode: AuthMode = currentPhone || phoneFromEmail || !metaEmail.includes('@') ? 'phone' : 'email';

      saveCurrentAccountBeforeLogout({
        id: userId || identifier || currentUsername,
        name: currentName,
        identifier,
        mode,
        username: currentUsername,
        avatar: profile.avatar || undefined,
      });
    }
    await supabase.auth.signOut();
    setConfirmLogoutOpen(false);
    setLoggingOut(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="h-28 bg-gradient-to-l from-cyan-600/40 via-slate-800 to-purple-600/40" />
        <div className="-mt-12 flex flex-col items-center gap-3 px-6 pb-6">
          <img
            src={profile.avatar}
            alt=""
            className="h-24 w-24 rounded-full border-4 border-slate-900 bg-slate-800 object-cover shadow-xl"
          />
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">{currentName}</h2>
            <p className="text-sm text-cyan-400" dir="ltr">{currentUsername}</p>
          </div>
          <p className="max-w-md text-center text-sm leading-relaxed text-slate-300">{profile.bio}</p>

          <div className="mt-2 grid w-full grid-cols-3 gap-3">
            <Stat label="منشورات" value={posts.filter((p) => p.author.id === 'me').length} />
            <Stat label="جهات اتصال" value={contacts.length} />
            <Stat label="أصدقاء" value={contacts.length} />
          </div>

          <div className="mt-3 grid w-full gap-2 text-sm">
            <InfoRow icon={<Phone size={16} className="text-purple-400" />} label="رقم الهاتف" value={currentPhone} ltr />
            <InfoRow icon={<AtSign className="text-cyan-400" size={16} />} label="اسم المستخدم" value={currentUsername} ltr />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="text-emerald-400" size={18} />
          <h3 className="text-base font-bold text-white">الخصوصية</h3>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-800/40 p-4">
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 rounded-full p-2 ${profile.isPublic ? 'bg-cyan-500/15 text-cyan-400' : 'bg-purple-500/15 text-purple-400'}`}>
              {profile.isPublic ? <Globe size={18} /> : <Lock size={18} />}
            </span>
            <div>
              <p className="text-sm font-bold text-white">
                {profile.isPublic ? 'حساب عام' : 'خاص لجهات الاتصال فقط'}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                {profile.isPublic
                  ? 'يظهر حسابك في البحث العام ويمكن للجميع إرسال طلبات صداقة إليك.'
                  : 'لا يظهر حسابك إلا لجهات اتصالك المحفوظة، ولن تجدك في "اكتشف أشخاص".'}
              </p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={profile.isPublic}
            onClick={() => updateProfile({ isPublic: !profile.isPublic })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
              profile.isPublic ? 'bg-cyan-600' : 'bg-slate-600'
            }`}
            aria-label="تبديل الحساب العام"
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
                profile.isPublic ? 'right-1' : 'right-6'
              }`}
            />
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-purple-400" size={17} />
            <h3 className="text-base font-bold text-white">نبذة عني</h3>
          </div>
          {!editingBio && (
            <button
              onClick={() => {
                setBioDraft(profile.bio ?? '');
                setEditingBio(true);
              }}
              className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              <Pencil size={13} />
              تعديل
            </button>
          )}
        </div>
        {editingBio ? (
          <div className="space-y-3">
            <textarea
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="اكتب نبذة قصيرة عن نفسك..."
              className="w-full resize-none rounded-xl border border-slate-700/70 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">{bioDraft.length}/200</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingBio(false)}
                  className="rounded-full bg-slate-800 px-4 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  onClick={saveBio}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-l from-cyan-600 to-purple-600 px-4 py-1.5 text-xs font-bold text-white transition hover:brightness-110 active:scale-95"
                >
                  <Check size={14} />
                  حفظ
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-slate-300">{profile.bio || 'لا توجد نبذة بعد. أضف واحدة ليعرفك أصدقاؤك أفضل.'}</p>
        )}
      </section>

      <section className="rounded-2xl border border-rose-500/20 bg-slate-900/70 p-4 space-y-3">
        {!confirmLogoutOpen ? (
          <button
            type="button"
            onClick={() => setConfirmLogoutOpen(true)}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 py-3 text-sm font-bold text-rose-400 transition hover:bg-rose-950/50 disabled:opacity-50"
          >
            <LogOut size={16} />
            تسجيل الخروج
          </button>
        ) : (
          <div className="space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
            <p className="text-xs font-bold text-white">تسجيل الخروج وحفظ الحساب؟</p>
            <p className="text-[11px] text-slate-400">
              يمكن حفظ بيانات حسابك ({currentName}) ليظهر في شاشة الدخول السريع.
            </p>
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => performLogout(true)}
                className="w-full rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 py-2.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {loggingOut ? 'جاري التنفيذ...' : 'تسجيل خروج وحفظ الحساب'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={() => performLogout(false)}
                  className="rounded-xl border border-rose-500/30 bg-rose-950/30 py-2 text-xs font-bold text-rose-300 hover:bg-rose-950/50 disabled:opacity-50"
                >
                  خروج بدون حفظ
                </button>
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={() => setConfirmLogoutOpen(false)}
                  className="rounded-xl border border-slate-700 bg-slate-900 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-center">
      <p className="text-lg font-bold text-cyan-300">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function InfoRow({ icon, label, value, ltr }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-2.5">
      {icon}
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`ms-auto truncate text-sm font-semibold text-white ${ltr ? 'dir-ltr' : ''}`} dir={ltr ? 'ltr' : undefined}>
        {value}
      </span>
    </div>
  );
}
