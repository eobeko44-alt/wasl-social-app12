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
const toPhoneAuthEmail = (p: string) => `${p.replace(/\D/g, '')}@wasl-phone.local`;

let memoryAccounts: SavedAccount[] = [];
let memoryPassword = '';
let memoryIdentifier = '';

function isRealEmail(val: string): boolean {
  const clean = val.trim();
  return Boolean(clean && clean.includes('@') && !clean.endsWith('@wasl-phone.local'));
}

function isValidPhone(val: string): boolean {
  const clean = val.trim();
  if (!clean || clean.includes('@') || /[a-zA-Z]/.test(clean)) return false;
  const digits = clean.replace(/\D/g, '');
  return digits.length >= 7;
}

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

function resolveAccountLink(rawId: string, rawMode?: AuthMode): {
  mode: AuthMode;
  identifier: string;
} | null {
  const clean = String(rawId || '').trim();
  if (!clean) return null;

  if (rawMode === 'email') {
    return isRealEmail(clean) ? { mode: 'email', identifier: clean } : null;
  }

  if (rawMode === 'phone') {
    return isValidPhone(clean) ? { mode: 'phone', identifier: clean } : null;
  }

  if (isRealEmail(clean)) {
    return { mode: 'email', identifier: clean };
  }

  if (isValidPhone(clean)) {
    return { mode: 'phone', identifier: clean };
  }

  return null;
}

export default function AuthGate() {
  const { updateProfile } = useAppStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [mode, setMode] = useState<AuthMode>('email');

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
    const link = resolveAccountLink(acc.identifier, acc.mode);
    if (!link) return;

    const normalizedAcc: SavedAccount = {
      ...acc,
      mode: link.mode,
      identifier: link.identifier,
    };

    setSavedAccounts((prev) => {
      const base = prev.length > 0 ? prev : loadSavedAccounts();
      const filtered = base.filter(
        (item) =>
          item.id !== normalizedAcc.id &&
          item.identifier.trim().toLowerCase() !== normalizedAcc.identifier.trim().toLowerCase()
      );
      const next = [normalizedAcc, ...filtered];
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
    const rawEmail = String(user.email || '').trim();
    const isPhoneLocal = rawEmail.endsWith('@wasl-phone.local');
    const phoneDigits = isPhoneLocal ? rawEmail.replace('@wasl-phone.local', '') : '';
    const metaPhone = meta.phone_number ? String(meta.phone_number).trim() : '';

    const link = isRealEmail(rawEmail)
      ? { mode: 'email' as AuthMode, identifier: rawEmail }
      : isValidPhone(metaPhone)
      ? { mode: 'phone' as AuthMode, identifier: metaPhone }
      : isValidPhone(phoneDigits)
      ? { mode: 'phone' as AuthMode, identifier: phoneDigits }
      : null;

    if (!link) return;

    const resolvedName = meta.full_name
      ? String(meta.full_name).trim()
      : link.mode === 'email'
      ? rawEmail.split('@')[0]
      : link.identifier || 'مستخدم وِصل';

    const handle = buildUsername(resolvedName, link.identifier.replace(/\D/g, ''));
    const existing = loadSavedAccounts().find(
      (item) =>
        item.id === user.id ||
        item.identifier.trim().toLowerCase() === link.identifier.trim().toLowerCase()
    );
    if (!existing) return;

    saveAccountToList({
      id: user.id || existing.id || link.identifier,
      name: resolvedName,
      identifier: link.identifier,
      mode: link.mode,
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

  const isMatchingSavedSecret = (savedId: string, link: { mode: AuthMode; identifier: string }) => {
    const cleanSaved = savedId.trim().toLowerCase();
    const cleanTarget = link.identifier.trim().toLowerCase();
    if (!cleanSaved || !cleanTarget) return false;

    if (link.mode === 'email') {
      return cleanSaved === cleanTarget;
    }

    const digitsA = cleanSaved.replace(/\D/g, '');
    const digitsB = cleanTarget.replace(/\D/g, '');
    return Boolean(digitsA && digitsB && digitsA === digitsB);
  };

  const handleSelectSavedAccount = async (acc: SavedAccount) => {
    setErr(null);
    setMsg(null);
    setForgotOpen(false);
    setIsSignUp(false);

    const link = resolveAccountLink(acc.identifier, acc.mode);
    if (!link) {
      setShowLoginForm(true);
      return;
    }

    setMode(link.mode);
    if (link.mode === 'email') {
      setEmail(link.identifier);
      setPhone('');
    } else {
      setPhone(link.identifier);
      setEmail('');
    }
    if (acc.name) setName(acc.name);

    const effectivePassword =
      acc.password ||
      (memoryPassword && isMatchingSavedSecret(memoryIdentifier, link) ? memoryPassword : '') ||
      (() => {
        try {
          const savedId = window.localStorage.getItem(LAST_IDENTIFIER_KEY) || '';
          const savedPass = window.localStorage.getItem(LAST_PASSWORD_KEY) || '';
          if (savedPass && isMatchingSavedSecret(savedId, link)) {
            return savedPass;
          }
        } catch {
          // ignore
        }
        return '';
      })();

    if (effectivePassword) {
      setPassword(effectivePassword);
      writeLastCredentials(link.identifier, effectivePassword);
      setLoading(true);
      const authEmail =
        link.mode === 'email'
          ? link.identifier
          : toPhoneAuthEmail(link.identifier.replace(/\D/g, ''));

      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: effectivePassword,
      });
      setLoading(false);
      if (!error) {
        return;
      }
    }

    setShowLoginForm(true);
  };

  const handleForgotPassword = async () => {
    setErr(null);
    setMsg(null);

    if (mode === 'phone') {
      if (!isValidPhone(phone)) {
        setErr('اكتب رقم هاتف صحيح أولاً.');
        return;
      }
      setErr(
        'الحسابات المرتبطة برقم الهاتف لا تستقبل رابط الاستعادة عبر البريد. إذا كان حسابك مربوطاً ببريد، بدّل إلى «بالبريد».'
      );
      return;
    }

    const cleanEmail = email.trim();
    if (!isRealEmail(cleanEmail)) {
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

    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();
    const digits = cleanPhone.replace(/\D/g, '');

    if (mode === 'phone' && !isValidPhone(cleanPhone)) {
      setErr('اكتب رقم صحيح (7 أرقام على الأقل).');
      setLoading(false);
      return;
    }
    if (mode === 'email' && !isRealEmail(cleanEmail)) {
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

    const activeIdentifier = mode === 'phone' ? cleanPhone : cleanEmail;
    const target = mode === 'phone' ? toPhoneAuthEmail(digits) : cleanEmail;
    const handle = buildUsername(cleanName || 'user', digits);

    writeLastCredentials(activeIdentifier, password);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: target,
        password,
        options: {
          data: {
            full_name: cleanName,
            login_method: mode,
            phone_number: mode === 'phone' ? cleanPhone : null,
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
          ...(mode === 'phone' ? { phone: cleanPhone } : {}),
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
        if (mode === 'phone') {
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
            >
              بالرقم
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`py-2 rounded-lg text-xs font-bold ${
                mode === 'email' ? 'bg-gradient-to-l from-cyan-600 to-purple-600 text-white' : 'text-slate-400'
              }`}
            >
              بالبريد
            </button>
          </div>
        )}

        {(isSignUp || showLoginForm) && (
          <form onSubmit={onSubmit} className="space-y-3">
            {isSignUp && step === 1 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">ما اسمك؟</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="الاسم الكامل"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                />
              </div>
            )}

            {isSignUp && step === 2 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">تاريخ الميلاد</label>
                <input
                  type="date"
                  dir="ltr"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                />
              </div>
            )}

            {isSignUp && step === 3 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">النوع</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`rounded-xl border py-2.5 text-sm font-bold transition ${
                      gender === 'male'
                        ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300'
                        : 'border-slate-800 bg-slate-950 text-slate-300'
                    }`}
                  >
                    ذكر
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`rounded-xl border py-2.5 text-sm font-bold transition ${
                      gender === 'female'
                        ? 'border-purple-500 bg-purple-500/15 text-purple-300'
                        : 'border-slate-800 bg-slate-950 text-slate-300'
                    }`}
                  >
                    أنثى
                  </button>
                </div>
              </div>
            )}

            {(!isSignUp || step === 4) && (
              <>
                {isSignUp && (
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1">
                    <button
                      type="button"
                      onClick={() => setMode('phone')}
                      className={`py-2 rounded-lg text-xs font-bold ${
                        mode === 'phone' ? 'bg-gradient-to-l from-cyan-600 to-purple-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      بالرقم
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('email')}
                      className={`py-2 rounded-lg text-xs font-bold ${
                        mode === 'email' ? 'bg-gradient-to-l from-cyan-600 to-purple-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      بالبريد
                    </button>
                  </div>
                )}

                {mode === 'phone' ? (
                  <input
                    type="tel"
                    dir="ltr"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xxxxxxxx"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                  />
                ) : (
                  <input
                    type="email"
                    dir="ltr"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                  />
                )}

                <input
                  type="password"
                  dir="ltr"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="كلمة المرور"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                />

                {!isSignUp && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setForgotOpen((v) => !v)}
                      className="text-xs text-purple-300 hover:text-purple-200"
                    >
                      نسيت كلمة السر؟
                    </button>
                  </div>
                )}

                {!isSignUp && forgotOpen && (
                  <div className="space-y-2 rounded-xl border border-purple-500/25 bg-slate-950/80 p-3">
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      {mode === 'email'
                        ? 'سيتم إرسال رابط إعادة تعيين كلمة السر إلى البريد المكتوب أعلاه.'
                        : 'إذا كنت مسجلاً بالبريد، بدّل إلى «بالبريد» واكتب بريدك لإرسال رابط الاستعادة.'}
                    </p>
                    <button
                      type="button"
                      disabled={resetLoading}
                      onClick={handleForgotPassword}
                      className="w-full rounded-lg border border-purple-500/40 bg-purple-600/20 py-2 text-xs font-bold text-purple-200 hover:bg-purple-600/30 disabled:opacity-50"
                    >
                      {resetLoading ? 'جاري الإرسال...' : 'إرسال رابط استعادة كلمة السر'}
                    </button>
                  </div>
                )}
              </>
            )}

            {err && <p className="text-xs text-rose-400">{err}</p>}
            {msg && <p className="text-xs text-cyan-300">{msg}</p>}

            <div className="flex gap-2">
              {isSignUp && step > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setErr(null);
                    setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-300"
                >
                  السابق
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 py-2.5 text-sm font-bold text-white"
              >
                {loading
                  ? 'جاري التنفيذ...'
                  : isSignUp
                  ? step < 4
                    ? 'التالي'
                    : 'إنشاء حساب'
                  : 'تسجيل الدخول'}
              </button>
            </div>
          </form>
        )}

        {(isSignUp || showLoginForm) && (
          <button
            type="button"
            onClick={() => {
              setErr(null);
              setMsg(null);
              setForgotOpen(false);
              setStep(1);
              setIsSignUp(!isSignUp);
            }}
            className="w-full text-center text-xs text-cyan-400"
          >
            {isSignUp ? 'عندك حساب؟ سجّل الدخول' : 'ما عندك حساب؟ أنشئ حساباً جديداً'}
          </button>
        )}
      </div>
    </div>
  );
}
