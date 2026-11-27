import React, { Component, useEffect, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowRight,
  Image as ImageIcon,
  Music,
  UserPlus,
  MapPin,
  Smile,
  MessageCircle,
  Calendar,
  Video,
  ChevronLeft,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthGate from '@/components/AuthGate';
import { WaslHeaderBar, WaslTabKey, FriendItem } from '@/components/WaslHeaderBar';
import { activateUser, deactivateUser, useAppStore } from '@/store/useAppStore';
import FeedTab from '@/components/feed/FeedTab';
import ChatsTab from '@/components/chats/ChatsTab';
import { FriendsTab } from '@/components/FriendsTab';
import ProfileTab from '@/components/profile/ProfileTab';

type Tab = 'feed' | 'chats' | 'contacts' | 'profile';

const MEDIA_BUCKET = 'wasl-media';

class TabErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // تجاهل لتفادي تعليق التطبيق
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-5 text-center space-y-3">
          <p className="text-xs font-bold text-rose-200">
            تعذر عرض هذا القسم مؤقتاً.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onReset?.();
            }}
            className="rounded-xl bg-[#1877F2] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#166fe5] transition"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

function getFallbackIdentity(s: Session) {
  const meta = s.user.user_metadata || {};
  const rawName =
    typeof meta.full_name === 'string'
      ? meta.full_name.trim()
      : typeof meta.name === 'string'
        ? meta.name.trim()
        : s.user.email
          ? s.user.email.split('@')[0]
          : 'حساب وِصل';

  const avatarUrl =
    typeof meta.avatar_url === 'string'
      ? meta.avatar_url.trim()
      : typeof meta.avatar === 'string'
        ? meta.avatar.trim()
        : '';

  const phoneNum = typeof meta.phone_number === 'string' ? meta.phone_number.trim() : '';
  const cleanHandle = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '');

  return {
    uid: s.user.id,
    name: rawName,
    username: cleanHandle ? `@${cleanHandle}` : '@user',
    avatar: avatarUrl || undefined,
    phone: phoneNum || undefined,
  };
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('feed');
  const [composerOpen, setComposerOpen] = useState(false);
  const [activeUserName, setActiveUserName] = useState<string>('');
  const [activeUserAvatar, setActiveUserAvatar] = useState<string>('');

  const activeUidRef = useRef<string | null>(null);

  const store = useAppStore();
  const profile = store.profile || {};
  const createPost = store.createPost;
  const addPost = store.addPost;

  const handleSelectTab = (nextTab: Tab) => {
    setTab(nextTab);
  };

  const displayName =
    activeUserName ||
    (typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : '') ||
    (session?.user?.email ? session.user.email.split('@')[0] : '') ||
    'حساب وِصل';

  const rawHandle =
    typeof profile.username === 'string' && profile.username.trim()
      ? profile.username.trim()
      : displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user';
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

  const hydrateProfileInBackground = async (uid: string, baseName: string, baseAvatar?: string) => {
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', uid)
        .maybeSingle();

      if (activeUidRef.current !== uid) return;

      const resolvedName =
        prof?.full_name && typeof prof.full_name === 'string' && prof.full_name.trim()
          ? prof.full_name.trim()
          : baseName;

      const resolvedAvatar =
        prof?.avatar_url && typeof prof.avatar_url === 'string' && prof.avatar_url.trim()
          ? prof.avatar_url.trim()
          : baseAvatar || '';

      setActiveUserName(resolvedName);
      setActiveUserAvatar(resolvedAvatar);

      const cleanHandle = resolvedName.toLowerCase().replace(/[^a-z0-9_]/g, '');
      activateUser(uid, {
        name: resolvedName,
        ...(cleanHandle ? { username: `@${cleanHandle}` } : {}),
        ...(resolvedAvatar ? { avatar: resolvedAvatar } : {}),
      });
    } catch {
      // تجاهل خطأ الجلب في الخلفية
    }
  };

  const applySessionFast = (nextSession: Session | null) => {
    const nextUid = nextSession?.user?.id ?? null;

    if (!nextSession || !nextUid) {
      activeUidRef.current = null;
      setSession(null);
      setActiveUserName('');
      setActiveUserAvatar('');
      deactivateUser();
      return;
    }

    const identity = getFallbackIdentity(nextSession);
    const isNewUser = activeUidRef.current !== nextUid;

    activeUidRef.current = nextUid;
    setSession(nextSession);

    if (isNewUser) {
      setActiveUserName(identity.name);
      setActiveUserAvatar(identity.avatar || '');
      activateUser(nextUid, {
        name: identity.name,
        username: identity.username,
        ...(identity.avatar ? { avatar: identity.avatar } : {}),
        ...(identity.phone ? { phone: identity.phone } : {}),
      });
    }

    void hydrateProfileInBackground(nextUid, identity.name, identity.avatar);
  };

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      applySessionFast(data.session);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      applySessionFast(nextSession);
      setChecking(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogoutEverywhere = async () => {
    applySessionFast(null);
    handleSelectTab('feed');
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // تجاهل
    }
  };

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

  const uploadToWaslMedia = async (uid: string, file: File, fallbackUrl: string): Promise<string> => {
    try {
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

  const handlePublishFromModal = () => {
    const finalContent = buildFinalContent();
    const rawMedia = imageUrl.trim();
    if ((!finalContent && !rawMedia) || submitting) return;

    const fileToUpload = selectedFile;
    const authorNameSnapshot = displayName;
    const authorHandleSnapshot = displayHandle;
    const userIdSnapshot = session?.user?.id ?? activeUidRef.current ?? null;
    const localId = `post-${Date.now()}`;

    if (createPost) {
      createPost(finalContent, rawMedia || undefined);
    } else if (addPost) {
      addPost({
        id: localId,
        authorName: authorNameSnapshot,
        authorHandle: authorHandleSnapshot,
        content: finalContent,
        image: rawMedia || undefined,
        imageUrl: rawMedia || undefined,
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
    handleSelectTab('feed');

    void (async () => {
      setSubmitting(true);
      try {
        let finalMediaUrl = rawMedia || undefined;
        if (fileToUpload && rawMedia && userIdSnapshot) {
          finalMediaUrl = await uploadToWaslMedia(userIdSnapshot, fileToUpload, rawMedia);
        }

        await supabase.from('posts').insert({
          user_id: userIdSnapshot,
          author_name: authorNameSnapshot,
          author_handle: authorHandleSnapshot,
          headline: finalMediaUrl ? `نشر ${authorNameSnapshot} صورة` : `نشر ${authorNameSnapshot}`,
          content: finalContent || null,
          image_url: finalMediaUrl || null,
          kind: finalMediaUrl ? 'photo' : 'post',
        });
      } catch {
        // تجاهل خطأ المزامنة الخلفية
      } finally {
        setSubmitting(false);
      }
    })();
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
  const effectiveAvatar = activeUserAvatar || profile.avatar || undefined;

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
        onSelectTab={(t) => handleSelectTab(t as Tab)}
        currentUserName={displayName}
        userAvatar={effectiveAvatar}
        onLogout={() => void handleLogoutEverywhere()}
        onSelectFriend={(_friend: FriendItem) => handleSelectTab('chats')}
      />

      <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-4">
        <TabErrorBoundary onReset={() => handleSelectTab('feed')}>
          {tab === 'feed' && <FeedTab />}
          {tab === 'chats' && <ChatsTab />}
          {tab === 'contacts' && (
            <FriendsTab onOpenChatWithUser={() => handleSelectTab('chats')} />
          )}
          {tab === 'profile' && <ProfileTab />}
        </TabErrorBoundary>
      </main>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#1c1d21] text-white shadow-2xl flex flex-col justify-between">
            <div>
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
                  onClick={handlePublishFromModal}
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

              <div className="px-4 pt-3.5 pb-2">
                <div className="flex items-center gap-3">
                  {effectiveAvatar ? (
                    <img
                      src={effectiveAvatar}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full border border-white/15 object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white border border-white/15">
                      {displayName.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{displayName}</p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-white/15 bg-[#2a2b30] px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                      <span>العامة</span>
                      <span>▾</span>
                    </div>
                  </div>
                </div>

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

            <div className="sticky bottom-0 bg-[#1c1d21] p-3 border-t border-white/10">
              <button
                type="button"
                onClick={handlePublishFromModal}
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
