import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

type AuthMode = 'phone' | 'email';
const toEmail = (p: string) => `${p.replace(/\D/g, '')}@wasl-phone.local`;

export default function AuthGate() {
  const { updateProfile } = useAppStore();
  const [isSignUp, setIsSignUp] = useState(true);
  const [mode, setMode] = useState<AuthMode>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    const digits = phone.replace(/\D/g, '');
    if (mode === 'phone' && digits.length < 7) {
      setErr('اكتب رقم صحيح (7 أرقام على الأقل).');
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
    if (isSignUp) {
      const handle = cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user';
      const { data, error } = await supabase.auth.signUp({
        email: target,
        password,
        options: { data: { full_name: cleanName, login_method: mode, phone_number: mode === 'phone' ? phone.trim() : null } },
      });
      if (error) setErr(error.message);
      else {
        updateProfile({ name: cleanName, username: `@${handle}`, ...(mode === 'phone' ? { phone: phone.trim() } : {}) });
        setMsg(data.session ? 'تم إنشاء الحساب وتسجيل الدخول.' : 'تم إنشاء الحساب بنجاح.');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email: target, password });
      if (error) setErr('البيانات غير صحيحة.');
      else if (data.user?.user_metadata?.full_name) {
        updateProfile({ name: String(data.user.user_metadata.full_name) });
      }
    }
    setLoading(false);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-purple-500/25 bg-slate-900/90 p-6 space-y-4">
        <h1 className="text-center text-2xl font-black text-white">وِصل</h1>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1">
          <button type="button" onClick={() => setMode('phone')} className={`py-2 rounded-lg text-xs font-bold ${mode === 'phone' ? 'bg-gradient-to-l from-cyan-600 to-purple-600 text-white' : 'text-slate-400'}`}>بالرقم</button>
          <button type="button" onClick={() => setMode('email')} className={`py-2 rounded-lg text-xs font-bold ${mode === 'email' ? 'bg-gradient-to-l from-cyan-600 to-purple-600 text-white' : 'text-slate-400'}`}>بالبريد</button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          {isSignUp && (
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white" />
          )}
          {mode === 'phone' ? (
            <input type="tel" dir="ltr" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxx" className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white" />
          ) : (
            <input type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white" />
          )}
          <input type="password" dir="ltr" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white" />
          {err && <p className="text-xs text-rose-400">{err}</p>}
          {msg && <p className="text-xs text-cyan-300">{msg}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 py-2.5 text-sm font-bold text-white">
            {loading ? 'جاري التنفيذ...' : isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول'}
          </button>
        </form>
        <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full text-center text-xs text-cyan-400">
          {isSignUp ? 'عندك حساب؟ سجّل الدخول' : 'ما عندك حساب؟ أنشئ حساباً جديداً'}
        </button>
      </div>
    </div>
  );
}
