import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Globe, MessageCircle, Users, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import FeedTab from '@/components/feed/FeedTab';
import ChatsTab from '@/components/chats/ChatsTab';
import ContactsTab from '@/components/contacts/ContactsTab';
import ProfileTab from '@/components/profile/ProfileTab';

type Tab = 'feed' | 'chats' | 'contacts' | 'profile';
type AuthMode = 'phone' | 'email';

const TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: 'feed', label: 'العام', icon: Globe },
  { id: 'chats', label: 'المحادثات', icon: MessageCircle },
  { id: 'contacts', label: 'جهات الاتصال', icon: Users },
  { id: 'profile', label: 'حسابي', icon: User },
];

function phoneToInternalEmail(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  return `${digits}@wasl-phone.local`;
}

function AuthGate() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setMessage(null);

    let targetEmail = email.trim();

    if (authMode === 'phone') {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 7) {
        setErrorMsg('اكتب رقم صحيح (7 أرقام على الأقل).');
        setLoading(false);
        return;
      }
      targetEmail = phoneToInternalEmail(digits);
    }

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: targetEmail,
        password,
        options: {
          data: {
            login_method: authMode,
            phone_number: authMode === 'phone' ? phone.trim() : null,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.session) {
        setMessage('تم إنشاء الحساب وتسجيل الدخول بنجاح.');
      } else {
        setMessage(
          authMode === 'email'
            ? 'تم إنشاء الحساب. راجع بريدك للتأكيد ثم سجّل الدخول.'
            : 'تم إنشاء الحساب. لو لم يدخل تلقائياً، أوقف Confirm email في Supabase.'
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (error) {
        setErrorMsg(
          authMode === 'phone'
            ? 'الرقم أو كلمة المرور غير صحيحة.'
            : 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
        );
      }
    }

    setLoading(false);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-purple-500/25 bg-slate-900/90 p-6 space-y-5 shadow-2xl">
        <div className="text-center space-y-1">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 font-black text-xl text-white shadow-lg shadow-cyan-900/40">
            و
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">وِصل</h1>
          <p className="text-xs text-slate-400">
            {isSignUp
              ? 'أنشئ حساباً جديداً عشان تدخل التطبيق'
              : 'سجّل الدخول عشان تفتح التطبيق'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMode('phone');
              setErrorMsg(null);
              setMessage(null);
            }}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              authMode === 'phone'
                ? 'bg-gradient-to-l from-cyan-600 to-purple-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            بالرقم
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('email');
              setErrorMsg(null);
              setMessage(null);
            }}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              authMode === 'email'
                ? 'bg-gradient-to-l from-cyan-600 to-purple-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            بالبريد الإلكتروني
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'phone' ? (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">الرقم</label>
              <input
                type="tel"
                dir="ltr"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xxxxxxxx"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">البريد الإلكتروني</label>
              <input
                type="email"
                dir="ltr"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300">كلمة المرور</label>
            <input
              type="password"
              dir="ltr"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-xl p-3">
              {errorMsg}
            </p>
          )}

          {message && (
            <p className="text-xs text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-3">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-900/30 disabled:opacity-50"
          >
            {loading
              ? 'جاري التنفيذ...'
              : isSignUp
              ? 'إنشاء حساب'
              : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
              setMessage(null);
            }}
            className="text-xs text-cyan-400 hover:underline"
          >
            {isSignUp
              ? 'عندك حساب؟ سجّل الدخول'
              : 'ما عندك حساب؟ أنشئ حساباً جديداً'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [tab, setTab] = useState<Tab>('feed');
  const { totalUnread } = useAppStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingAuth(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingAuth(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (checkingAuth) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center text-sm">
        جاري التحقق من الحساب...
      </div>
    );
  }

  if (!session) {
    return <AuthGate />;
  }

  const switchTab = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const navItems = TABS.map(({ id, label, icon: Icon }) => {
    const active = tab === id;
    return (
      <button
        key={id}
        onClick={() => switchTab(id)}
        className={`relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-bold transition md:flex-none md:flex-row md:gap-3 md:px-4 md:py-3 md:text-sm ${
          active
            ? 'md:bg-gradient-to-l md:from-cyan-600/20 md:to-purple-600/15 md:text-white'
            : 'text-slate-400 hover:text-slate-200 md:hover:bg-slate-800/60'
        } ${active ? 'text-cyan-400' : ''}`}
      >
        <span className="relative">
          <Icon size={active ? 22 : 20} className={active ? 'md:text-cyan-400' : ''} />
          {id === 'chats' && totalUnread > 
