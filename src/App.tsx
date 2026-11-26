import React, { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Globe,
  MessageCircle,
  Users,
  User,
  Plus,
  ArrowRight,
  Image as ImageIcon,
  Music,
  UserPlus,
  MapPin,
  Smile,
  Calendar,
  Video,
  ChevronLeft,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthGate from '@/components/AuthGate';
import { WaslHeaderBar, WaslTabKey, FriendItem } from '@/components/WaslHeaderBar';
import { useAppStore } from '@/store/useAppStore';
import FeedTab from '@/components/feed/FeedTab';
import ChatsTab from '@/components/chats/ChatsTab';
import ContactsTab from '@/components/contacts/ContactsTab';
import ProfileTab from '@/components/profile/ProfileTab';

type Tab = 'feed' | 'chats' | 'contacts' | 'profile';

const MEDIA_BUCKET = 'wasl-media';

const TABS: { id: Tab; label: string; icon: typesOfIcon }[] = [
  { id: 'feed', label: 'العام', icon: Globe },
  { id: 'chats', label: 'المحادثات', icon: MessageCircle },
  { id: 'contacts', label: 'جهات الاتصال', icon: Users },
  { id: 'profile', label: 'حسابي', icon: User },
];

type typesOfIcon = React.ComponentType<{ size?: number; className?: string }>;

const BG_THEMES = [
  { id: 'none', label: 'افتراضي', className: 'bg-transparent text-white' },
  {
    id: 'sunset',
    label: 'غروب',
    className:
      'bg-gradient-to-br from-amber-500 via-orange-500 to-pink-600 text-white rounded-2xl p-4 min-h-[130px] flex items-center',
  },
  {
    id: 'violet',
    label: 'بنفسجي',
    className:
      'bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl p-4 min-h-[130px] flex items-center',
  },
  {
    id: 'berry',
    label: 'توتي',
    className:
      'bg-gradient-to-br from-pink-600 via-rose-600 to-purple-700 text-white rounded-2xl p-4 min-h-[130px] flex items-center',
  },
  {
    id: 'dark',
    label: 'داكن',
    className:
      'bg-slate-950 text-white rounded-2xl p-4 min-h-[130px] flex items-center border border-slate-700',
  },
  {
    id: 'crimson',
    label: 'قرمزي',
    className:
      'bg-gradient-to-br from-rose-600 to-red-700 text-white rounded-2xl p-4 min-h-[130px] flex items-center',
  },
  {
    id: 'neon',
    label: 'نيون',
    className:
      'bg-gradient-to-br from-fuchsia-600 to-purple-700 text-white rounded-2xl p-4 min-h-[130px] flex items-center',
  },
  {
    id: 'light',
    label: 'أبيض',
    className: 'bg-white text-slate-900 rounded-2xl p-4 min-h-[130px] flex items-center',
  },
];

const SWATCH_COLORS: Record<string, string> = {
  none: 'bg-slate-800 border border-slate-600',
  sunset: 'bg-gradient-to-tr from-amber-500 to-pink-500',
  violet: 'bg-purple-500',
  berry: 'bg-gradient-to-tr from-pink-600 to-purple-700',
  dark: 'bg-black border border-slate-600',
  crimson: 'bg-rose-600',
  neon: 'bg-fuchsia-600',
  light: 'bg-white',
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function applySessionToProfile(s: Session | null) {
  const meta = s?.user?.user_metadata;
  if (!meta) return;
  const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  const phoneNum = typeof meta.phone_number === 'string' ? meta.phone_number.trim() : '';
  const storeState = useAppStore.getState() as Record<string, any>;
  const currentProfile = storeState.profile || {};
  const patch: Record<string, string> = {};

  if (fullName && (!currentProfile.name || currentProfile.name === 'أنت')) {
    patch.name = fullName;
    const cleanHandle = fullName.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanHandle && (!currentProfile.username || currentProfile.username === '@you')) {
      patch.username = `@${cleanHandle}`;
    }
  }
  if (phoneNum && !currentProfile.phone) {
    patch.phone = phoneNum;
  }
  if (Object.keys(patch).length > 0 && typeof storeState.updateProfile === 'function') {
    storeState.updateProfile(patch);
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('feed');
  const [composerOpen, setComposerOpen] = useState(false);

  const store = useAppStore() as Record<string, any>;
  const totalUnread: number = typeof store.totalUnread === 'number' ? store.totalUnread : 0;
  const profile = store.profile || {};
  const createPost = typeof store.createPost === 'function' ? store.createPost : null;
  const addPost = typeof store.addPost === 'function' ? store.addPost : null;

  const displayName =
    profile.name && profile.name !== 'أنت' ? String(profile.name) : 'abobaker096605';
  const rawHandle = profile.username || '@abobaker096605';
  const displayHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

  const [postText, setPostText] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('none');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeExtraType, setActiveExtraType] = useState<string | null>(null);
  const [extraValue, setExtraValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const themeStripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      applySessionToProfile(data.session);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      applySessionToProfile(s);
      setChecking(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setSelectedFile(file);
    if (dataUrl) {
      setImageUrl(dataUrl);
      setSelectedTheme('none');
    }
    e.target.value = '';
  };

  const uploadToWaslMedia = async (file: File, fallbackUrl: string): Promise<string> => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id || session?.user?.id || 'guest';
      const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
      const filePath = `posts/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext || 'jpg'}`;

      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, file, { upsert: false });

      if (error) return fallbackUrl;

      const { data: publicData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
      return publicData?.publicUrl || fallbackUrl;
    } catch {
      return fallbackUrl;
    }
  };

  const buildFinalContent = (): string => {
    const main = postText.trim();
    const detail = extraValue.trim();
    if (!activeExtraType || !detail) return main;

    const prefixMap: Record<string, string> = {
      music: '🎵 يستمع إلى:',
      tag: '👥 مع:',
      location: '📍 في:',
      feeling: '😊 يشعر بـ:',
      messages: '💬 رسالة:',
      event: '📅 مناسبة:',
      live: '🔴 بث:',
    };
    const prefix = prefixMap[activeExtraType] || '';
    const extraLine = `${prefix} ${detail}`.trim();
    return main ? `${main}\n${extraLine}` : extraLine;
  };

  const handlePublishFromModal = async () => {
    const finalContent = buildFinalContent();
    const rawMedia = imageUrl.trim();
    if ((!finalContent && !rawMedia) || submitting) return;

    setSubmitting(true);
    try {
      let finalMediaUrl = rawMedia || undefined;
      if (selectedFile && rawMedia) {
        finalMediaUrl = await uploadToWaslMedia(selectedFile, rawMedia);
      }

      if (createPost) {
        createPost(finalContent, finalMediaUrl);
      }

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? session?.user?.id ?? null;

      const { data: inserted } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          author_name: displayName,
          author_handle: displayHandle,
          headline: finalMediaUrl ? `نشر ${displayName} صورة` : `نشر ${displayName}`,
          content: finalContent || null,
          image_url: finalMediaUrl || null,
          kind: finalMediaUrl ? 'photo' : 'post',
        })
        .select()
        .single();

      if (!createPost && addPost) {
        addPost({
          id: inserted?.id ? `cloud-${String(inserted.id)}` : `post-${Date.now()}`,
          dbId: inserted?.id ? String(inserted.id) : undefined,
          authorName: displayName,
          authorHandle: displayHandle,
          content: finalContent,
          image: finalMediaUrl,
          imageUrl: finalMediaUrl,
          createdAt: 'الآن',
        });
      }

      setPostText('');
      setImageUrl('');
      setSelectedFile(null);
      setActiveExtraType(null);
      setExtraValue('');
      setSelectedTheme('none');
      setComposerOpen(false);
      setTab('feed');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center text-sm"
      >
        ...جاري التحقق
      </div>
    );
  }

  if (!session) {
    return <AuthGate />;
  }

  const canSubmit = Boolean(buildFinalContent() || imageUrl.trim()) && !submitting;
  const activeThemeObj = BG_THEMES.find((t) => t.id === selectedTheme) || BG_THEMES[0];
  const isLightTheme = selectedTheme === 'light';

  const modalOptions = [
    {
      id: 'media',
      label: 'صور/مقاطع فيديو',
      icon: <ImageIcon size={18} className="text-emerald-400" />,
      onClick: () => fileInputRef.current?.click(),
    },
    {
      id: 'music',
      label: 'الموسيقى',
      icon: <Music size={18} className="text-pink-400" />,
      onClick: () => {
        setActiveExtraType('music');
        setExtraValue('');
      },
    },
    {
      id: 'tag',
      label: 'إشارة إلى الأشخاص',
      icon: <UserPlus size={18} className="text-sky-400" />,
      onClick: () => {
        setActiveExtraType('tag');
        setExtraValue('');
      },
    },
    {
      id: 'location',
      label: 'إضافة موقع',
      icon: <MapPin size={18} className="text-rose-400" />,
      onClick: () => {
        setActiveExtraType('location');
        setExtraValue('');
      },
    },
    {
      id: 'feeling',
      label: 'شعور/نشاط',
      icon: <Smile size={18} className="text-amber-400" />,
      onClick: () => {
        setActiveExtraType('feeling');
        setExtraValue('');
      },
    },
    {
      id: 'messages',
      label: 'تلقى الرسائل',
      icon: <MessageCircle size={18} className="text-blue-400" />,
      onClick: () => {
        setActiveExtraType('messages');
        setExtraValue('مفتوح للرسائل');
      },
    },
    {
      id: 'event',
      label: 'إنشاء مناسبة',
      icon: <Calendar size={18} className="text-red-400" />,
      onClick: () => {
        setActiveExtraType('event');
        setExtraValue('');
      },
    },
    {
      id: 'live',
      label: 'بث مباشر',
      icon: <Video size={18} className="text-rose-500" />,
      onClick: () => {
        setActiveExtraType('live');
        setExtraValue('مباشر الآن');
      },
    },
  ];

  const extraPlaceholderMap: Record<string, string> = {
    music: 'اكتب اسم الأغنية أو الفنان...',
    tag: 'اكتب اسم الشخص للإشارة إليه...',
    location: 'اكتب المدينة أو المكان...',
    feeling: 'اكتب شعورك أو نشاطك الحالي...',
    messages: 'اكتب ملاحظة حول استقبال الرسائل...',
    event: 'اكتب اسم المناسبة أو موعدها...',
    live: 'اكتب عنوان البث المباشر...',
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => void handleFileChange(e)}
        className="hidden"
      />

      <WaslHeaderBar
        activeTab={tab as WaslTabKey}
        onSelectTab={(t) => setTab(t as Tab)}
        onOpenCreatePost={() => setComposerOpen(true)}
        onSelectFriend={(_friend: FriendItem) => setTab('chats')}
      />

      {/* شريط التبويبات */}
      <nav className="sticky top-0 z-20 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-bold transition ${
                  active ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon size={19} />
                  {id === 'chats' && totalUnread > 0 && (
                    <span className="absolute -top-1.5 -left-2.5 rounded-full bg-purple-600 px-1.5 text-[10px] font-black text-white">
                      {totalUnread}
                    </span>
                  )}
                </div>
                <span>{label}</span>
                {active && (
                  <span className="absolute bottom-0 h-0.5 w-14 rounded-full bg-gradient-to-l from-cyan-400 to-purple-500" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-4">
        {tab === 'feed' && <FeedTab />}
        {tab === 'chats' && <ChatsTab />}
        {tab === 'contacts' && <ContactsTab />}
        {tab === 'profile' && <ProfileTab />}
      </main>

      {/* زر إضافة سريع عائم */}
      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        aria-label="إنشاء منشور"
        className="fixed bottom-5 left-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-l from-cyan-600 to-purple-600 text-white shadow-xl shadow-black/40 hover:brightness-110 transition"
      >
        <Plus size={22} />
      </button>

      {/* نافذة إنشاء منشور المنبثقة */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#1c1d21] text-white shadow-2xl flex flex-col justify-between">
            <div>
              {/* هيدر النافذة */}
              <div className="flex items-center justify-between border-b border-white/10 bg-[#242529] px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setComposerOpen(false)}
                    aria-label="رجوع"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-200 hover:bg-white/10 transition"
                  >
                    <ArrowRight size={18} />
                  </button>
                  <span className="text-sm font-bold text-white">إنشاء منشور</span>
                </div>

                <button
                  type="button"
                  onClick={() => void handlePublishFromModal()}
                  disabled={!canSubmit}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    canSubmit
                      ? 'bg-[#1877F2] text-white hover:bg-[#166fe5]'
                      : 'text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {submitting ? 'جاري...' : 'نشر'}
                </button>
              </div>

              {/* الحساب والخصوصية */}
              <div className="px-4 pt-3.5 pb-2">
                <div className="flex items-center gap-3">
                  <img
                    src={profile.avatar}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full border border-white/15 object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{displayName}</p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-white/15 bg-[#2a2b30] px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                      <span>العامة</span>
                      <span>▾</span>
                    </div>
                  </div>
                </div>

                {/* منطقة النص */}
                <div className="mt-3.5">
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="شارك لحظة بارزة من يومك..."
                    rows={selectedTheme === 'none' ? 3 : 4}
                    className={`w-full resize-none outline-none transition ${
                      selectedTheme === 'none'
                        ? 'bg-transparent text-base text-white placeholder:text-slate-400'
                        : `${activeThemeObj.className} text-center text-lg font-bold ${
                            isLightTheme ? 'placeholder:text-slate-500' : 'placeholder:text-white/75'
                          }`
                    }`}
                  />
                </div>

                {activeExtraType && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-[#2a2b30] px-3 py-2">
                    <input
                      type="text"
                      value={extraValue}
                      onChange={(e) => setExtraValue(e.target.value)}
                      placeholder={extraPlaceholderMap[activeExtraType] || 'أدخل التفاصيل...'}
                      className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveExtraType(null);
                        setExtraValue('');
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {imageUrl && (
                  <div className="mt-3 relative">
                    <img
                      src={imageUrl}
                      alt="معاينة المنشور"
                      className="max-h-52 w-full rounded-xl object-cover border border-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl('');
                        setSelectedFile(null);
                      }}
                      className="mt-1.5 rounded-lg bg-rose-950/70 border border-rose-500/30 px-2.5 py-1 text-[11px] font-bold text-rose-200"
                    >
                      إزالة الصورة
                    </button>
                  </div>
                )}
              </div>

              {/* شريط الألوان */}
              <div className="flex items-center gap-2 border-t border-white/10 bg-[#242529]/80 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setPostText((prev) => `${prev}@`)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#32343a] text-sm font-bold text-white hover:bg-[#3e4047]"
                >
                  @
                </button>

                <div
                  ref={themeStripRef}
                  className="flex flex-1 items-center gap-2 overflow-x-auto py-0.5"
                >
                  {BG_THEMES.map((theme) => {
                    const active = selectedTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedTheme(theme.id)}
                        aria-label={theme.label}
                        className={`h-7 w-7 shrink-0 rounded-lg transition ${SWATCH_COLORS[theme.id]} ${
                          active ? 'ring-2 ring-white scale-105' : 'opacity-90 hover:opacity-100'
                        }`}
                      />
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    themeStripRef.current?.scrollBy({ left: -120, behavior: 'smooth' });
                  }}
                  aria-label="المزيد من الألوان"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#32343a] text-slate-200 hover:bg-[#3e4047]"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

              {/* قائمة الخيارات */}
              <div className="divide-y divide-white/5 border-t border-white/10 bg-[#1c1d21]">
                {modalOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-right text-xs font-semibold text-slate-100 hover:bg-white/5 transition"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* زر النشر العريض في الأسفل */}
            <div className="sticky bottom-0 bg-[#1c1d21] p-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => void handlePublishFromModal()}
                disabled={!canSubmit}
                className="w-full rounded-lg bg-[#1877F2] py-2.5 text-sm font-extrabold text-white shadow transition enabled:hover:bg-[#166fe5] enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting ? 'جاري النشر...' : 'نشر'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
