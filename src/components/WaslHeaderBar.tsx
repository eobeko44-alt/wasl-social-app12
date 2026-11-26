import React, { useEffect, useRef, useState } from 'react';
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

export type WaslTabKey = 'feed' | 'chats' | 'contacts' | 'profile';

export interface StoryItem {
  id: string;
  title: string;
  image?: string;
  badgeCount?: number;
  isCreate?: boolean;
  isMusic?: boolean;
}

export interface FriendItem {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

interface WaslHeaderBarProps {
  activeTab: WaslTabKey;
  onSelectTab: (tab: WaslTabKey) => void;
  unreadChatsCount?: number;
  currentUserName?: string;
  currentUserHandle?: string;
  userAvatar?: string;
  friends?: FriendItem[];
  stories?: StoryItem[];
  onCreateStorySubmit?: (storyText: string, storyImage?: string) => void;
  onCreatePostSubmit?: (postText: string, postImage?: string) => void;
  onSelectStory?: (story: StoryItem) => void;
  onSelectFriend?: (friend: FriendItem) => void;
  onOpenSwitchAccount?: () => void;
  onLogout?: () => void;
}

const MEDIA_BUCKET = 'wasl-media';
const PRIVACY_STORAGE_KEY = 'wasl_account_is_public_v1';
const DARK_MODE_STORAGE_KEY = 'wasl_dark_mode_v1';
const LANG_STORAGE_KEY = 'wasl_lang_v1';

const BG_THEMES = [
  { id: 'none', label: 'افتراضي', className: 'bg-transparent text-white' },
  {
    id: 'sunset',
    label: 'غروب',
    className:
      'bg-gradient-to-br from-amber-500 via-orange-500 to-pink-600 text-white rounded-2xl p-4 min-h-[135px] flex items-center',
  },
  {
    id: 'violet',
    label: 'بنفسجي',
    className:
      'bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl p-4 min-h-[135px] flex items-center',
  },
  {
    id: 'berry',
    label: 'توتي',
    className:
      'bg-gradient-to-br from-pink-600 via-rose-600 to-purple-700 text-white rounded-2xl p-4 min-h-[135px] flex items-center',
  },
  {
    id: 'dark',
    label: 'داكن',
    className:
      'bg-slate-950 text-white rounded-2xl p-4 min-h-[135px] flex items-center border border-slate-700',
  },
  {
    id: 'crimson',
    label: 'قرمزي',
    className:
      'bg-gradient-to-br from-rose-600 to-red-700 text-white rounded-2xl p-4 min-h-[135px] flex items-center',
  },
  {
    id: 'neon',
    label: 'نيون',
    className:
      'bg-gradient-to-br from-fuchsia-600 to-purple-700 text-white rounded-2xl p-4 min-h-[135px] flex items-center',
  },
  {
    id: 'light',
    label: 'أبيض',
    className: 'bg-white text-slate-900 rounded-2xl p-4 min-h-[135px] flex items-center',
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

export function WaslHeaderBar({
  activeTab,
  onSelectTab,
  unreadChatsCount = 0,
  currentUserName = 'مستخدم وِصل',
  currentUserHandle = '@wasl_user',
  userAvatar,
  friends = [],
  stories = [
    { id: 'create', title: 'إنشاء قصة', isCreate: true },
    { id: 'music', title: 'موسيقى', isMusic: true },
  ],
  onCreateStorySubmit,
  onCreatePostSubmit,
  onSelectStory,
  onSelectFriend,
  onOpenSwitchAccount,
  onLogout,
}: WaslHeaderBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [settingsMenuOpen, setSettingsMenuOpen] = useState(true);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  const [isPublicAccount, setIsPublicAccount] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(PRIVACY_STORAGE_KEY);
      if (saved !== null) return saved === 'true';
      const profileRaw = localStorage.getItem('wasl_profile_meta_v3');
      if (profileRaw) {
        const parsed = JSON.parse(profileRaw);
        if (typeof parsed?.isPublicAccount === 'boolean') return parsed.isPublicAccount;
      }
    } catch {
      // تجاهل خطأ القراءة
    }
    return true;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(DARK_MODE_STORAGE_KEY);
      if (saved !== null) return saved === 'true';
    } catch {
      // تجاهل
    }
    return true;
  });

  const [language, setLanguage] = useState<'ar' | 'en'>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'ar') return saved;
    } catch {
      // تجاهل
    }
    return 'ar';
  });

  useEffect(() => {
    try {
      localStorage.setItem(PRIVACY_STORAGE_KEY, String(isPublicAccount));
      const profileRaw = localStorage.getItem('wasl_profile_meta_v3');
      if (profileRaw) {
        const parsed = JSON.parse(profileRaw);
        localStorage.setItem(
          'wasl_profile_meta_v3',
          JSON.stringify({ ...parsed, isPublicAccount })
        );
      }
    } catch {
      // تجاهل خطأ التخزين
    }
  }, [isPublicAccount]);

  useEffect(() => {
    try {
      localStorage.setItem(DARK_MODE_STORAGE_KEY, String(darkMode));
      document.documentElement.classList.toggle('dark', darkMode);
    } catch {
      // تجاهل
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, language);
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    } catch {
      // تجاهل
    }
  }, [language]);

  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyImageData, setStoryImageData] = useState<string>('');
  const [storyFileName, setStoryFileName] = useState<string>('');
  const storyFileInputRef = useRef<HTMLInputElement | null>(null);

  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postText, setPostText] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('none');
  const [activeExtraType, setActiveExtraType] = useState<string | null>(null);
  const [extraValue, setExtraValue] = useState('');
  const [postImageData, setPostImageData] = useState<string>('');
  const [postSelectedFile, setPostSelectedFile] = useState<File | null>(null);
  const [publishingPost, setPublishingPost] = useState(false);
  const postFileInputRef = useRef<HTMLInputElement | null>(null);
  const themeStripRef = useRef<HTMLDivElement | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase().replace(/^@/, '');
  const filteredFriends = normalizedQuery
    ? friends.filter(
        (f) =>
          f.name.toLowerCase().includes(normalizedQuery) ||
          f.username.toLowerCase().replace(/^@/, '').includes(normalizedQuery)
      )
    : friends;

  const tabs: { key: WaslTabKey; label: string; icon: string; badge?: number }[] = [
    { key: 'feed', label: 'العام', icon: '🌐' },
    {
      key: 'chats',
      label: 'المحادثات',
      icon: '💬',
      badge: unreadChatsCount > 0 ? unreadChatsCount : undefined,
    },
    { key: 'contacts', label: 'جهات الاتصال', icon: '👥' },
    { key: 'profile', label: 'حسابي', icon: '👤' },
  ];

  const openStoryGallery = () => {
    if (storyFileInputRef.current) {
      storyFileInputRef.current.value = '';
      storyFileInputRef.current.click();
    } else {
      setStoryModalOpen(true);
    }
  };

  const handlePickStoryImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStoryFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setStoryImageData(reader.result);
        setStoryModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetStoryModal = () => {
    setStoryText('');
    setStoryImageData('');
    setStoryFileName('');
    if (storyFileInputRef.current) storyFileInputRef.current.value = '';
    setStoryModalOpen(false);
  };

  const handleStorySave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyText.trim() && !storyImageData) return;
    onCreateStorySubmit?.(storyText.trim(), storyImageData || undefined);
    resetStoryModal();
  };

  const openPostGallery = () => {
    if (postFileInputRef.current) {
      postFileInputRef.current.value = '';
      postFileInputRef.current.click();
    } else {
      setPostModalOpen(true);
    }
  };

  const handlePickPostImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPostImageData(reader.result);
        setSelectedTheme('none');
        setPostModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetPostModal = () => {
    setPostText('');
    setPostImageData('');
    setPostSelectedFile(null);
    setSelectedTheme('none');
    setActiveExtraType(null);
    setExtraValue('');
    if (postFileInputRef.current) postFileInputRef.current.value = '';
    setPostModalOpen(false);
  };

  const buildFinalPostContent = (): string => {
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

  const uploadPostImageToStorage = async (file: File, fallbackUrl: string): Promise<string> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id || 'guest';
      const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
      const path = `posts/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext || 'jpg'}`;

      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { upsert: false });

      if (error) return fallbackUrl;

      const { data: publicInfo } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      return publicInfo?.publicUrl || fallbackUrl;
    } catch {
      return fallbackUrl;
    }
  };

  const handlePublishPostModal = async () => {
    const finalContent = buildFinalPostContent();
    if ((!finalContent && !postImageData) || publishingPost) return;

    setPublishingPost(true);
    try {
      let finalImageUrl: string | undefined = postImageData || undefined;
      if (postSelectedFile && postImageData) {
        finalImageUrl = await uploadPostImageToStorage(postSelectedFile, postImageData);
      }

      const normalizedHandle = currentUserHandle.startsWith('@')
        ? currentUserHandle
        : `@${currentUserHandle}`;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;

      await supabase.from('posts').insert({
        user_id: userId,
        author_name: currentUserName,
        author_handle: normalizedHandle,
        headline: finalImageUrl ? `نشر ${currentUserName} صورة` : `نشر ${currentUserName}`,
        content: finalContent || null,
        image_url: finalImageUrl || null,
        kind: finalImageUrl ? 'photo' : 'post',
      });

      onCreatePostSubmit?.(finalContent, finalImageUrl);
      resetPostModal();
    } finally {
      setPublishingPost(false);
    }
  };

  const canSubmitPost = Boolean(buildFinalPostContent() || postImageData) && !publishingPost;
  const activeThemeObj = BG_THEMES.find((t) => t.id === selectedTheme) || BG_THEMES[0];
  const isLightTheme = selectedTheme === 'light';

  const composerOptions = [
    {
      id: 'media',
      label: 'صور/مقاطع فيديو',
      icon: <ImageIcon size={18} className="text-emerald-400" />,
      onClick: openPostGallery,
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
    <div dir="rtl" className="w-full bg-slate-950 text-slate-100 select-none">
      <input
        ref={storyFileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePickStoryImage}
        className="hidden"
      />
      <input
        ref={postFileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePickPostImage}
        className="hidden"
      />

      {/* 1. الهيدر العلوي */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-2xl font-black tracking-tight bg-gradient-to-l from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          وِصل
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openStoryGallery}
            title="إضافة قصة"
            aria-label="إضافة قصة"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-lg font-bold text-slate-100 hover:border-cyan-500/40 transition"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchOpen((prev) => !prev);
              setSearchQuery('');
            }}
            title="بحث عن أصدقاء باسم الحساب"
            aria-label="بحث عن أصدقاء باسم الحساب"
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm transition ${
              searchOpen
                ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-100 hover:border-purple-500/40'
            }`}
          >
            🔍
          </button>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            title="القائمة الجانبية"
            aria-label="القائمة الجانبية"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-base font-bold text-slate-100 hover:border-purple-500/40 transition"
          >
            ☰
          </button>
        </div>
      </div>

      {/* شريط البحث عن الأصدقاء باسم الحساب */}
      {searchOpen && (
        <div className="px-4 pb-2.5 space-y-2 border-b border-slate-800/80 bg-slate-950">
          <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-purple-500/25 px-3 py-2">
            <span className="text-xs text-cyan-400">@</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن صديق بالاسم أو اسم الحساب..."
              autoFocus
              className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {normalizedQuery && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/90 divide-y divide-slate-800/70">
              {filteredFriends.length > 0 ? (
                filteredFriends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => {
                      onSelectFriend?.(friend);
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-right hover:bg-slate-800/70 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {friend.avatar ? (
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="h-8 w-8 shrink-0 rounded-full object-cover border border-cyan-500/25"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-l from-cyan-600/30 to-purple-600/30 border border-cyan-500/25 text-xs font-black text-cyan-300">
                          {friend.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">{friend.name}</p>
                        <p className="truncate text-[10px] text-slate-400" dir="ltr">
                          {friend.username}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-cyan-400">عرض</span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-3 text-center text-xs text-slate-400">
                  لا يوجد حساب مطابق لـ «{searchQuery}»
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. شريط التبويبات العلوي */}
      <nav
        aria-label="أقسام التطبيق"
        className="sticky top-0 z-30 grid grid-cols-4 bg-slate-950/95 backdrop-blur border-b border-purple-500/20"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectTab(tab.key)}
              className={`relative flex flex-col items-center justify-center gap-1 py-2.5 px-1 transition ${
                isActive
                  ? 'text-cyan-300 bg-gradient-to-t from-purple-600/15 to-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <div className="relative flex items-center justify-center text-lg leading-none">
                <span>{tab.icon}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -left-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-l from-cyan-500 to-purple-600 px-1 text-[10px] font-black text-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold truncate max-w-full">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 inset-x-2 h-0.5 rounded-full bg-gradient-to-l from-cyan-400 to-purple-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. شريط «بم تفكر؟» + شريط القصص */}
      {activeTab === 'feed' && (
        <>
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-900">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={currentUserName}
                className="h-10 w-10 shrink-0 rounded-full object-cover border border-cyan-500/35"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-l from-cyan-600/30 to-purple-600/30 border border-purple-500/30 text-sm font-black text-cyan-300">
                {currentUserName.slice(0, 1)}
              </div>
            )}

            <button
              type="button"
              onClick={() => setPostModalOpen(true)}
              className="flex-1 text-right rounded-full bg-slate-900 border border-slate-800 hover:border-purple-500/35 px-4 py-2 text-xs text-slate-400 transition"
            >
              بم تفكر؟
            </button>

            <button
              type="button"
              onClick={openPostGallery}
              className="flex flex-col items-center justify-center rounded-xl px-2.5 py-1 text-emerald-400 hover:bg-slate-900 transition"
            >
              <span className="text-base leading-none">🖼️</span>
              <span className="text-[10px] font-bold text-slate-300 mt-0.5">صورة</span>
            </button>
          </div>

          <div className="flex gap-2.5 overflow-x-auto px-4 pt-2.5 pb-3.5 border-b border-slate-800/80">
            {stories.map((story) => {
              if (story.isCreate) {
                return (
                  <button
                    key={story.id}
                    type="button"
                    onClick={openStoryGallery}
                    className="relative flex h-40 w-28 shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-center shadow"
                  >
                    <div className="flex-1 w-full bg-slate-800/60 flex items-center justify-center">
                      {story.image ? (
                        <img
                          src={story.image}
                          alt={story.title}
                          className="h-full w-full object-cover opacity-75"
                        />
                      ) : (
                        <span className="text-2xl text-slate-400">👤</span>
                      )}
                    </div>
                    <div className="relative bg-slate-900 pt-5 pb-2.5 px-1.5">
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-l from-cyan-500 to-purple-600 text-white font-black text-base border-2 border-slate-900">
                        +
                      </span>
                      <span className="block text-[11px] font-bold text-white truncate">
                        {story.title}
                      </span>
                    </div>
                  </button>
                );
              }

              if (story.isMusic) {
                return (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => onSelectStory?.(story)}
                    className="flex h-40 w-28 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-cyan-500 to-purple-600 p-2 text-white shadow"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-xl">
                      🎵
                    </span>
                    <span className="text-xs font-extrabold">{story.title}</span>
                  </button>
                );
              }

              return (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => onSelectStory?.(story)}
                  className="relative flex h-40 w-28 shrink-0 flex-col justify-end overflow-hidden rounded-2xl border border-purple-500/25 bg-slate-900 text-right shadow"
                >
                  {story.image && (
                    <img
                      src={story.image}
                      alt={story.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                  {typeof story.badgeCount === 'number' && story.badgeCount > 0 && (
                    <span className="absolute top-2 right-2 rounded-md bg-cyan-500 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                      {story.badgeCount}
                    </span>
                  )}
                  <span className="relative z-10 p-2 text-[11px] font-bold text-white truncate">
                    {story.title}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* نافذة إنشاء منشور بالشكل الجديد */}
      {postModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#1c1d21] text-white shadow-2xl flex flex-col justify-between">
            <div>
              {/* الهيدر العلوي */}
              <div className="flex items-center justify-between border-b border-white/10 bg-[#242529] px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={resetPostModal}
                    aria-label="رجوع"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-200 hover:bg-white/10 transition"
                  >
                    <ArrowRight size={18} />
                  </button>
                  <span className="text-sm font-bold text-white">إنشاء منشور</span>
                </div>

                <button
                  type="button"
                  onClick={() => void handlePublishPostModal()}
                  disabled={!canSubmitPost}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    canSubmitPost
                      ? 'bg-[#1877F2] text-white hover:bg-[#166fe5]'
                      : 'text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {publishingPost ? 'جاري...' : 'نشر'}
                </button>
              </div>

              {/* معلومات الحساب والخصوصية */}
              <div className="px-4 pt-3.5 pb-2">
                <div className="flex items-center gap-3">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={currentUserName}
                      className="h-11 w-11 shrink-0 rounded-full border border-white/15 object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white border border-white/15">
                      {currentUserName.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{currentUserName}</p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-white/15 bg-[#2a2b30] px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                      <span>{isPublicAccount ? 'العامة' : 'خاص'}</span>
                      <span>▾</span>
                    </div>
                  </div>
                </div>

                {/* مساحة الكتابة */}
                <div className="mt-3.5">
                  <textarea
                    rows={selectedTheme === 'none' ? 3 : 4}
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="شارك لحظة بارزة من يومك..."
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
                      aria-label="إغلاق الإضافة"
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {postImageData && (
                  <div className="mt-3 relative">
                    <img
                      src={postImageData}
                      alt="معاينة الصورة"
                      className="max-h-56 w-full rounded-xl object-cover border border-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPostImageData('');
                        setPostSelectedFile(null);
                        if (postFileInputRef.current) postFileInputRef.current.value = '';
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
                {composerOptions.map((item) => (
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
                onClick={() => void handlePublishPostModal()}
                disabled={!canSubmitPost}
                className="w-full rounded-lg bg-[#1877F2] py-2.5 text-sm font-extrabold text-white shadow transition enabled:hover:bg-[#166fe5] enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {publishingPost ? 'جاري النشر...' : 'نشر'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إتمام ونشر القصة */}
      {storyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleStorySave}
            className="w-full max-w-sm rounded-2xl border border-purple-500/30 bg-slate-900 p-4 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-black text-white">إضافة قصة جديدة</h3>
              <button
                type="button"
                onClick={resetStoryModal}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {storyImageData && (
              <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                <img
                  src={storyImageData}
                  alt={storyFileName || 'صورة القصة'}
                  className="h-44 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={openStoryGallery}
                  className="absolute bottom-2 right-2 rounded-lg bg-slate-950/85 px-2.5 py-1 text-[10px] font-bold text-cyan-300 hover:text-cyan-200"
                >
                  تغيير الصورة
                </button>
              </div>
            )}

            <textarea
              rows={3}
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder="اكتب نص قصتك..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none"
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={resetStoryModal}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 py-2 text-xs font-bold text-slate-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 py-2 text-xs font-bold text-white"
              >
                نشر القصة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* القائمة الجانبية عند الضغط على ☰ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-start bg-black/65 backdrop-blur-xs">
          <div className="w-80 max-w-[85vw] h-full overflow-y-auto bg-slate-900 border-l border-purple-500/25 p-4 flex flex-col justify-between shadow-2xl space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{currentUserName}</p>
                  <p className="truncate text-[11px] text-cyan-400" dir="ltr">
                    {currentUserHandle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    openStoryGallery();
                  }}
                  className="w-full flex items-center justify-between rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-100 hover:border-cyan-500/40 transition"
                >
                  <span>إضافة قصة جديدة</span>
                  <span className="text-cyan-400 font-black">+</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setSearchOpen(true);
                  }}
                  className="w-full flex items-center justify-between rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-100 hover:border-purple-500/40 transition"
                >
                  <span>بحث عن أصدقاء باسم الحساب</span>
                  <span>🔍</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onSelectTab('profile');
                  }}
                  className="w-full flex items-center justify-between rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-100 hover:border-cyan-500/40 transition"
                >
                  <span>الملف الشخصي</span>
                  <span>👤</span>
                </button>

                {onOpenSwitchAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onOpenSwitchAccount();
                    }}
                    className="w-full flex items-center justify-between rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-100 hover:border-purple-500/40 transition"
                  >
                    <span>تبديل الحساب</span>
                    <span>⇄</span>
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-purple-500/20 bg-slate-950/75 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSettingsMenuOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-black text-white hover:bg-slate-900/70 transition"
                >
                  <span className="flex items-center gap-2">
                    <span>⚙️</span>
                    <span>الإعدادات والخصوصية</span>
                  </span>
                  <span className="text-cyan-400 text-xs">{settingsMenuOpen ? '⌃' : '⌄'}</span>
                </button>

                {settingsMenuOpen && (
                  <div className="border-t border-slate-800/90 p-2 space-y-1.5 bg-slate-950/90">
                    <button
                      type="button"
                      onClick={() => setAccountSettingsOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between rounded-xl bg-slate-900/85 border border-slate-800 px-3 py-2.5 text-xs font-bold text-slate-100 hover:border-cyan-500/35 transition"
                    >
                      <span className="flex items-center gap-2">
                        <span>👤</span>
                        <span>الإعدادات</span>
                      </span>
                      <span className="text-[11px] text-cyan-400">
                        {accountSettingsOpen ? 'إغلاق' : 'فتح'}
                      </span>
                    </button>

                    {accountSettingsOpen && (
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-300">
                            نوع الحساب: <strong>{isPublicAccount ? 'عام 🌐' : 'خاص 🔒'}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsPublicAccount((prev) => !prev)}
                            className="rounded-lg bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-1 text-[10px] font-bold text-cyan-300"
                          >
                            تغيير
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setDrawerOpen(false);
                            onSelectTab('profile');
                          }}
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-slate-800 transition"
                        >
                          إدارة بيانات الملف الشخصي
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between rounded-xl bg-slate-900/85 border border-slate-800 px-3 py-2.5">
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-100">
                        <span>🌙</span>
                        <span>الوضع المظلم</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setDarkMode((prev) => !prev)}
                        aria-label="تبديل الوضع المظلم"
                        className={`relative h-6 w-11 rounded-full transition ${
                          darkMode ? 'bg-cyan-500' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                            darkMode ? '-translate-x-6' : '-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLanguage((prev) => (prev === 'ar' ? 'en' : 'ar'))}
                      className="w-full flex items-center justify-between rounded-xl bg-slate-900/85 border border-slate-800 px-3 py-2.5 text-xs font-bold text-slate-100 hover:border-purple-500/35 transition"
                    >
                      <span className="flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-black text-cyan-300">
                          Aa
                        </span>
                        <span>اللغة</span>
                      </span>
                      <span className="rounded-lg bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-bold text-purple-300">
                        {language === 'ar' ? 'العربية' : 'English'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onLogout();
                }}
                className="w-full rounded-xl border border-rose-500/30 bg-rose-950/30 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-950/50 transition"
              >
                تسجيل الخروج
              </button>
            )}
          </div>

          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
        </div>
      )}
    </div>
  );
}
