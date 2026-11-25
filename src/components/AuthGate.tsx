import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

type AuthMode = 'phone' | 'email';
type Gender = 'male' | 'female' | '';

interface SavedAccount {
  id: string;
  name: string;
  identifier: string;
  mode: AuthMode;
  username: string;
  avatar?: string;
  password?: string;
}

const SAVED_ACCOUNTS_KEY = 'wasl_saved_accounts_v1';
const LAST_PASSWORD_KEY = 'wasl_last_session_pass_v1';
const LAST_IDENTIFIER_KEY = 'wasl_last_session_id_v1';
const toEmail = (p: string) => `${p.replace(/\D/g, '')}@wasl-phone.local`;

let memoryAccounts: SavedAccount[] = [];
let memoryPassword = '';
let memoryIdentifier = '';

function writeLastCredentials(identifier: string, secret: string) {
  const cleanPass = secret.trim();
  const cleanId = identifier.trim();
  if (cleanPass) memoryPassword = cleanPass;
  if (cleanId) memoryIdentifier = cleanId;
  try {
    if (cleanPass) {
      window.localStorage.setItem(LAST_PASSWORD_KEY, cleanPass);
      window.sessionStorage?.setItem(LAST_PASSWORD_KEY, cleanPass);
    }
    if (cleanId) {
      window.localStorage.setItem(LAST_IDENTIFIER_KEY, cleanId);
      window.sessionStorage?.setItem(LAST_IDENTIFIER_KEY, cleanId);
    }
  } catch {
    // ignore storage errors
  }
}

function buildUsername(name: string, digits: string): string {
  const latin = name.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (latin.length >= 2) return `@${latin}`;
  if (digits.length >= 4) return `@u_${digits.slice(-4)}`;
  return '@wasl_user';
}

function loadSavedAccounts(): SavedAccount[] {
  try {
    const raw = window.localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryAccounts = parsed;
        return parsed;
      }
    }
  } catch {
    // ignore storage read error
  }
  return memoryAccounts;
}

function persistSavedAccounts(list: SavedAccount[]) {
  const sliced = list.slice(0, 8);
  memoryAccounts = sliced;
  try {
    window.localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(sliced));
  } catch {
    // ignore storage write error
  }
}

export default function AuthGate() {
  const { updateProfile } = useAppStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [mode, setMode] = useState<AuthMode>('phone');

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => loadSavedAccounts());
  const [showLoginForm, setShowLoginForm] = useState<boolean>(() => loadSavedAccounts().length === 0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const saveAccountToList = (acc: SavedAccount) => {
    setSavedAccounts((prev) => {
      const base = prev.length > 0 ? prev : loadSavedAccounts();
      const filtered = base.filter(
        (item) => item.id !== acc.id && item.identifier !== acc.identifier
      );
      const next = [acc, ...filtered];
      persistSavedAccounts(next);
      return next;
    });
  };

  const captureSessionAccount = (user: {
    id?: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null) => {
    if (!user) return;
    const meta = user.user_metadata || {};
    const rawEmail = String(user.email || '');
    const isPhoneLocal = rawEmail.endsWith('@wasl-phone.local');
    const phoneDigits = isPhoneLocal ? rawEmail.replace('@wasl-phone.local', '') : '';
    const resolvedPhone = meta.phone_number ? String(meta.phone_number).trim() : phoneDigits;
    const resolvedName = meta.full_name
      ? String(meta.full_name).trim()
      : resolvedPhone || (rawEmail ? rawEmail.split('@')[0] : 'مستخدم وِصل');
    const accMode: AuthMode = isPhoneLocal || resolvedPhone ? 'phone' : 'email';
    const identifier = accMode === 'phone' ? resolvedPhone : rawEmail;
    if (!identifier) return;

    const handle = buildUsername(resolvedName, phoneDigits || resolvedPhone.replace(/\D/g, ''));
    const existing = loadSavedAccounts().find(
      (item) => item.id === user.id || item.identifier === identifier
    );
    if (!existing) return;

    saveAccountToList({
      id: user.id || identifier,
      name: resolvedName,
      identifier,
      mode: accMode,
      username: handle,
      avatar: meta.avatar_url ? String(meta.avatar_url) : existing.avatar,
      password: existing.password,
    });
  };

  useEffect(() => {
    const list = loadSavedAccounts();
    setSavedAccounts(list);
    if (list.length > 0) {
      setShowLoginForm(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        captureSessionAccount(data.session.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        captureSessionAccount(session.user);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const removeSavedAccount = (id: string) => {
    setSavedAccounts((prev) => {
      const next = prev.filter((item) => item.id !== id);
      persistSavedAccounts(next);
      if (next.length === 0) {
        setShowLoginForm(true);
      }
      return next;
    });
  };

  const handleSelectSavedAccount = async (acc: SavedAccount) => {
    setErr(null);
    setMsg(null);
    setForgotOpen(false);
    setIsSignUp(false);
    setMode(acc.mode);

    const digits = acc.identifier.replace(/\D/g, '');
    if (acc.mode === 'phone') {
      setPhone(acc.identifier);
    } else {
      setEmail(acc.identifier);
    }
    if (acc.name) setName(acc.name);

    const effectivePassword =
      acc.password ||
      (memoryIdentifier === acc.identifier ? memoryPassword : '') ||
      (() => {
        try {
          const savedId = window.localStorage.getItem(LAST_IDENTIFIER_KEY);
          if (savedId && savedId === acc.identifier) {
            return window.localStorage.getItem(LAST_PASSWORD_KEY) || '';
          }
        } catch {
          // ignore
        }
        return '';
      })();

    if (effectivePassword) {
      setPassword(effectivePassword);
      writeLastCredentials(acc.identifier, effectivePassword);
      setLoading(true);
      const target = acc.mode === 'phone' ? toEmail(digits) : acc.identifier.trim();
      const { error } = await supabase.auth.signInWithPassword({
        email: target,
        password: effectivePassword,
      });
      setLoading(false);
      if (!error) {
        return;
      }
      setErr('تعذر الدخول تلقائياً، اكتب كلمة المرور لإكمال الدخول.');
    }

    setShowLoginForm(true);
  };

  const handleForgotPassword = async () => {
    setErr(null);
    setMsg(null);

    if (mode === 'phone') {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 7) {
        setErr('اكتب رقم الهاتف أولاً لمعرفة حالة الحساب.');
        return;
      }
      setErr(
        'الحسابات المسجلة برقم الهاتف لا تملك بريداً إلكترونياً لاستقبال رابط الاستعادة. يمكنك تحديث كلمة المرور من لوحة Supabase أو تسجيل الدخول بحساب آخر.'
      );
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErr('اكتب بريدك الإلكتروني أولاً لإرسال رابط استعادة كلمة السر.');
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    setResetLoading(false);

    if (error) {
      setErr(error.message || 'تعذر إرسال رابط الاستعادة.');
    } else {
      setMsg('تم إرسال رابط إعادة تعيين كلمة السر إلى بريدك الإلكتروني.');
    }
  };

  const goNextStep = () => {
    setErr(null);
    if (step === 1 && name.trim().length < 2) {
      setErr('اكتب اسمك (حرفين على الأقل).');
      return;
    }
    if (step === 2 && !birthDate) {
      setErr('اختر تاريخ ميلادك.');
      return;
    }
    if (step === 3 && !gender) {
      setErr('اختر النوع (ذكر أو أنثى).');
      return;
    }
    if (step < 4) setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && step < 4) {
      goNextStep();
      return;
    }

    setLoading(true);
    setErr(null);
    setMsg(null);

    const digits = phone.replace(/\D/g, '');
    if (mode === 'phone' && digits.length < 7) {
      setErr('اكتب رقم صحيح (7 أرقام على الأقل).');
      setLoading(false);
      return;
    }
    if (mode === 'email' && !email.trim()) {
      setErr('اكتب بريدك الإلكتروني.');
      setLoading(false);
      return;
    }

    const cleanName = name.trim();
    if (isSignUp && cleanName.length < 2) {
      setErr('اكتب اسمك عشان يظهر في ملفك.');
      setLoading(false);
      return;
    }

    const target = mode === 'phone' ? toEmail(digits) : email.trim();
    const handle = buildUsername(cleanName || 'user', digits);
    const cleanPhone = mode === 'phone' ? phone.trim() : '';
    const cleanEmail = mode === 'email' ? email.trim() : '';
    const activeIdentifier = mode === 'phone' ? cleanPhone : cleanEmail;

    writeLastCredentials(activeIdentifier, password);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: target,
        password,
        options: {
          data: {
            full_name: cleanName,
            login_method: mode,
            phone_number: cleanPhone || null,
            birth_date: birthDate || null,
            gender: gender || null,
            username: handle.replace(/^@/, ''),
          },
        },
      });
      if (error) {
        setErr(error.message);
      } else {
        updateProfile({
          name: cleanName,
          username: handle,
          ...(cleanPhone ? { phone: cleanPhone } : {}),
        });
        setMsg(data.session ? 'تم إنشاء الحساب وتسجيل الدخول.' : 'تم إنشاء الحساب بنجاح.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: target, password });
      if (error) {
        setErr('البيانات غير صحيحة.');
      } else {
        const resolvedName =
          cleanName || (mode === 'phone' ? cleanPhone : cleanEmail.split('@')[0]) || 'مستخدم وِصل';
        const resolvedHandle = buildUsername(resolvedName, digits);
        const patch: { name?: string; phone?: string; username?: string } = {
          name: resolvedName,
          username: resolvedHandle,
        };
        if (cleanPhone) {
          patch.phone = cleanPhone;
        }
        updateProfile(patch);
      }
    }
    setLoading(false);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-purple-500/25 bg-slate-900/90 p-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-l from-cyan-500 to-purple-600 text-xl font-black text-white shadow-lg shadow-purple-900/40">
            و
          </div>
          <h1 className="text-2xl font-black text-white">وِصل</h1>
          <p className="text-xs text-slate-400">
            {isSignUp
              ? `إنشاء حساب جديد — خطوة ${step} من 4`
              : savedAccounts.length > 0 && !showLoginForm
              ? 'اختر حساباً للدخول السريع'
              : 'تسجيل الدخول إلى حسابك'}
          </p>
        </div>

        {!isSignUp && savedAccounts.length > 0 && (
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-0.5">
            {savedAccounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/85 px-3.5 py-3 hover:border-purple-500/35 transition"
              >
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSelectSavedAccount(acc)}
                  className="flex flex-1 items-center gap-3 text-right min-w-0 disabled:opacity-60"
                >
                  {acc.avatar ? (
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      className="h-11 w-11 shrink-0 rounded-full object-cover border border-cyan-500/30"
                    />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-l from-cyan-600/30 to-purple-600/30 text-sm font-black text-cyan-300 border border-cyan-500/25">
                      {(acc.name || 'و').slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{acc.name}</p>
                    <p className="truncate text-[11px] text-slate-400" dir="ltr">
                      {acc.identifier}
                    </p>
                  </div>
                  <span className="text-slate-500 text-base font-bold px-1">&lt;</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeSavedAccount(acc.id)}
                  title="إزالة الحساب"
                  className="rounded-lg px-2 py-1 text-[11px] text-slate-500 hover:bg-rose-950/40 hover:text-rose-400"
                >
                  إزالة
                </button>
              </div>
            ))}
          </div>
        )}

        {!isSignUp && savedAccounts.length > 0 && !showLoginForm && (
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setErr(null);
                setMsg(null);
                setPhone('');
                setEmail('');
                setPassword('');
                setShowLoginForm(true);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 text-xs font-bold text-slate-200 hover:border-cyan-500/40 transition"
            >
              استخدام ملف شخصي آخر
            </button>
            <button
              type="button"
              onClick={() => {
                setErr(null);
                setMsg(null);
                setStep(1);
                setIsSignUp(true);
              }}
              className="w-full rounded-xl border border-cyan-500/50 bg-cyan-500/10 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/15 transition"
            >
              إنشاء حساب جديد
            </button>
          </div>
        )}

        {isSignUp && (
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`h-1.5 rounded-full transition-colors ${
                  step >= n ? 'bg-gradient-to-l from-cyan-500 to-purple-500' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        )}

        {!isSignUp && showLoginForm && (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setMode('phone')}
              className={`py-2 rounded-lg text-xs font-bold ${
                mode === 'phone' ? 'bg-gradient-to-l from-cyan-600 to-purple-600 text-white' : 'text-slate-400'
              }`}
