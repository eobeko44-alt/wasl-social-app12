import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Globe, MessageCircle, Users, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthGate from '@/components/AuthGate';
import { WaslHeaderBar, WaslTabKey, FriendItem } from '@/components/WaslHeaderBar';
import { useAppStore } from '@/store/useAppStore';
import FeedTab from '@/components/feed/FeedTab';
import ChatsTab from '@/components/chats/ChatsTab';
import ContactsTab from '@/components/contacts/ContactsTab';
import ProfileTab from '@/components/profile/ProfileTab';

type Tab = 'feed' | 'chats' | 'contacts' | 'profile';

const TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: 'feed', label: 'العام', icon: Globe },
  { id: 'chats', label: 'المحادثات', icon: MessageCircle },
  { id: 'contacts', label: 'جهات الاتصال', icon: Users },
  { id: 'profile', label: 'حسابي', icon: User },
];

function applySessionToProfile(s: Session | null) {
  const meta = s?.user?.user_metadata;
  if (!meta) return;
  const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  const phoneNum = typeof meta.phone_number === 'string' ? meta.phone_number.trim() : '';
  const patch: { name?: string; phone?: string; username?: string } = {};
  if (fullName) {
    patch.name = fullName;
    const cleanHandle = fullName.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanHandle) patch.username = `@${cleanHandle}`;
  }
  if (phoneNum) patch.phone = phoneNum;
  if (Object.keys(patch).length > 0) {
    useAppStore.getState().updateProfile(patch);
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('feed');
  const store = useAppStore();
  const { totalUnread, profile } = store;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      applySessionToProfile(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      applySessionToProfile(s);
      setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center text-sm"
      >
        جاري التحقق...
      </div>
    );
  }

  if (!session) {
    return <AuthGate />;
  }

  const switchTab = (t: Tab | WaslTabKey) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  // تجهيز قائمة الأصدقاء للبحث باسم الحساب من الـ store إن وجدت
  const rawContacts = Array.isArray((store as Record<string, unknown>).contacts)
    ? ((store as Record<string, unknown>).contacts as Array<Record<string, unknown>>)
    : [];

  const friends: FriendItem[] = rawContacts.map((c, idx) => {
    const cName = String(c.name || c.full_name || `مستخدم ${idx + 1}`);
    const rawUser = String(c.username || c.handle || cName.toLowerCase().replace(/[^a-z0-9_]/g, '') || `user${idx + 1}`);
    return {
      id: String(c.id || idx),
      name: cName,
      username: rawUser.startsWith('@') ? rawUser : `@${rawUser}`,
      avatar: typeof c.avatar === 'string' ? c.avatar : undefined,
    };
  });

  const navItems = TABS.map(({ id, label, icon: Icon }) => {
    const active = tab === id;
    return (
      <button
        key={id}
        onClick={() => switchTab(id)}
        className={`relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-bold transition md:flex-none md:flex-row md:gap-3 md:px-4 md:py-3 md:text-sm ${
          active
            ? 'md:bg-gradient-to-l md:from-cyan-600/20 md:to-purple-600/15 md:text-white text-cyan-400'
            : 'text-slate-400 hover:text-slate-200 md:hover:bg-slate-800/60'
        }`}
      >
        <span className="relative">
          <Icon size={active ? 22 : 20} className={active ? 'md:text-cyan-400' : ''} />
          {id === 'chats' && totalUnread > 0 && (
            <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white md:-left-2 md:-top-1 md:right-auto">
              {totalUnread}
            </span>
          )}
        </span>
        {label}
        {active && (
          <span className="absolute -bottom-0 h-0.5 w-8 rounded-full bg-gradient-to-l from-cyan-400 to-purple-400 md:hidden" />
        )}
      </button>
    );
  });

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl">
        {/* القائمة الجانبية للشاشات الكبيرة */}
        <aside className="fixed inset-y-0 right-0 z-40 hidden w-60 flex-col border-l border-slate-800/70 bg-slate-950/90 p-4 lg:flex xl:w-64">
          <Logo large />
          <nav className="mt-8 flex flex-1 flex-col gap-1.5">{navItems}</nav>
          <p className="px-2 text-[10px] leading-relaxed text-slate-600">
            وِصل — شبكتك الاجتماعية ومحادثاتك الخاصة في مكان واحد
          </p>
        </aside>

        {/* المحتوى الرئيسي مع الهيدر والتبويبات العلوية */}
        <main className="min-h-screen w-full pb-12 md:px-6 md:pb-8 md:pt-4 lg:me-60 lg:w-[calc(100%-15rem)] xl:me-64 xl:w-[calc(100%-16rem)]">
          <div className="md:hidden">
            <WaslHeaderBar
              activeTab={tab}
              onSelectTab={switchTab}
              unreadChatsCount={totalUnread}
              currentUserName={profile?.name || 'مستخدم وِصل'}
              currentUserHandle={profile?.username || '@wasl_user'}
              userAvatar={profile?.avatar}
              friends={friends}
              onSelectFriend={() => switchTab('chats')}
              onLogout={async () => {
                await supabase.auth.signOut();
              }}
            />
          </div>

          <div className="px-3 pt-3 md:px-0 md:pt-0">
            {tab === 'feed' && <FeedTab />}
            {tab === 'chats' && <ChatsTab />}
            {tab === 'contacts' && <ContactsTab />}
            {tab === 'profile' && <ProfileTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

function Logo({ large }: { large?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 font-black text-white shadow-lg shadow-cyan-900/40 md:h-10 md:w-10">
        و
      </span>
      <span className={`font-black tracking-tight text-white ${large ? 'text-xl' : 'text-lg'}`}>
        وِصل
      </span>
    </div>
  );
}
