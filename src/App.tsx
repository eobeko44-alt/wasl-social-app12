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
          <h1 className="text-2xl font-black tracking-tight text-white">
