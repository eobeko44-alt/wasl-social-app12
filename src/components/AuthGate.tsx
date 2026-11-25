import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

type AuthMode = 'phone' | 'email';
type Gender = 'male' | 'female' | '';

const toEmail = (p: string) => `${p.replace(/\D/g, '')}@wasl-phone.local`;

function buildUsername(name: string, digits: string): string {
  const latin = name.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (latin.length >= 2) return `@${latin}`;
  if (digits.length >= 4) return `@u_${digits.slice(-4)}`;
  return '@wasl_user';
}

export default function AuthGate() {
  const { updateProfile } = useAppStore();
  const [isSignUp, setIsSignUp] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [mode, setMode] = useState<AuthMode>('phone');

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
      const { data, error } = await supabase.auth.signInWithPassword({ email: target, password });
      if (error) {
        setErr('البيانات غير صحيحة.');
      } else {
        const meta = data.user?.user_metadata;
        const patch: { name?: string; phone?: string; username?: string } = {};
        if (meta?.full_name) {
          const full = String(meta.full_name).trim();
          patch.name = full;
          patch.username = buildUsername(full, digits);
        }
        if (meta?.phone_number) {
          patch.phone = String(meta.phone_number).trim();
        }
        if (Object.keys(patch).length > 0) {
          updateProfile(patch);
        }
      }
    }
    setLoading(false);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-purple-500/25 bg-slate-900/90 p-6 space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-white">وِصل</h1>
          <p className="text-xs text-slate-400">
            {isSignUp ? `إنشاء حساب جديد — خطوة ${step} من 4` : 'تسجيل الدخول إلى حسابك'}
          </p>
        </div>

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

        {!isSignUp && (
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

        <button
          type="button"
          onClick={() => {
            setErr(null);
            setMsg(null);
            setStep(1);
            setIsSignUp(!isSignUp);
          }}
          className="w-full text-center text-xs text-cyan-400"
        >
          {isSignUp ? 'عندك حساب؟ سجّل الدخول' : 'ما عندك حساب؟ أنشئ حساباً جديداً'}
        </button>
      </div>
    </div>
  );
}
