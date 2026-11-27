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
  ChevronRight,
  Search,
  ShieldCheck,
  Lock,
  KeyRound,
  UserCog,
  CheckCircle2,
  SlidersHorizontal,
  Trash2,
  X,
  MoreHorizontal,
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
  avatar?: string;
}

interface SwitchableAccount {
  id: string;
  name: string;
  avatar?: string;
  phoneOrEmail?: string;
  lastUsedAt: number;
}

interface WaslHeaderBarProps {
  activeTab: WaslTabKey;
  onSelectTab: (tab: WaslTabKey) => void;
  unreadChatsCount?: number;
  currentUserName?: string;
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
const SAVED_ACCOUNTS_KEY = 'wasl_saved_accounts_v1';
const NAME_COOLDOWN_DAYS = 7;
const NAME_COOLDOWN_MS = NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

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

function isValidAvatarUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/')
  );
}

function getScopedProfileKey(uid: string | null): string {
  return `wasl_account_profile_${uid || 'guest'}`;
}

function getScopedNameLockKey(uid: string | null): string {
  return `wasl_account_name_lock_${uid || 'guest'}`;
}

function readScopedAccountProfile(uid: string | null): {
  name: string;
  avatar?: string;
  lastNameChangedAt: number | null;
} {
  if (!uid) {
    return { name: '', avatar: undefined, lastNameChangedAt: null };
  }
  try {
    const raw = localStorage.getItem(getScopedProfileKey(uid));
    const lockRaw = localStorage.getItem(getScopedNameLockKey(uid));
    const parsedLock = lockRaw ? Number(lockRaw) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      const n =
        typeof parsed?.name === 'string'
          ? parsed.name.trim()
          : typeof parsed?.full_name === 'string'
            ? parsed.full_name.trim()
            : '';
      const av = isValidAvatarUrl(parsed?.avatar || parsed?.avatar_url)
        ? String(parsed.avatar || parsed.avatar_url).trim()
        : undefined;
      return {
        name: n,
        avatar: av,
        lastNameChangedAt:
          typeof parsedLock === 'number' && !Number.isNaN(parsedLock) && parsedLock > 0
            ? parsedLock
            : null,
      };
    }
  } catch {
    // تجاهل
  }
  return { name: '', avatar: undefined, lastNameChangedAt: null };
}

function writeScopedAccountProfile(
  uid: string | null,
  data: { name?: string; avatar?: string; lastNameChangedAt?: number | null }
): void {
  if (!uid) return;
  try {
    const key = getScopedProfileKey(uid);
    const prevRaw = localStorage.getItem(key);
    const prev = prevRaw ? JSON.parse(prevRaw) : {};
    const nextName = data.name !== undefined ? data.name.trim() : prev.name || '';
    const nextAvatar =
      data.avatar !== undefined
        ? isValidAvatarUrl(data.avatar)
          ? data.avatar.trim()
          : undefined
        : prev.avatar;

    localStorage.setItem(
      key,
      JSON.stringify({
        ...prev,
        id: uid,
        name: nextName,
        full_name: nextName,
        avatar: nextAvatar || null,
        avatar_url: nextAvatar || null,
      })
    );

    if (typeof data.lastNameChangedAt === 'number' && data.lastNameChangedAt > 0) {
      localStorage.setItem(getScopedNameLockKey(uid), String(data.lastNameChangedAt));
    }
  } catch {
    // تجاهل
  }
}

function readLocalSavedAccounts(): SwitchableAccount[] {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: any, idx: number) => ({
        id: String(item?.id || `acc-${idx}`),
        name: String(item?.name || 'مستخدم وِصل'),
        avatar: isValidAvatarUrl(item?.avatar) ? String(item.avatar).trim() : undefined,
        phoneOrEmail:
          typeof item?.phoneOrEmail === 'string' && item.phoneOrEmail
            ? item.phoneOrEmail
            : undefined,
        lastUsedAt: typeof item?.lastUsedAt === 'number' ? item.lastUsedAt : Date.now(),
      }))
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  } catch {
    return [];
  }
}

function writeLocalSavedAccounts(list: SwitchableAccount[]): void {
  try {
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    // تجاهل
  }
}

function getNameCooldownInfo(lastChangedAt: number | null): {
  isLocked: boolean;
  remainingLabel: string;
} {
  if (!lastChangedAt) {
    return { isLocked: false, remainingLabel: '' };
  }
  const elapsed = Date.now() - lastChangedAt;
  if (elapsed >= NAME_COOLDOWN_MS) {
    return { isLocked: false, remainingLabel: '' };
  }
  const remainingMs = NAME_COOLDOWN_MS - elapsed;
  const totalHours = Math.ceil(remainingMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0 && hours > 0) {
    return {
      isLocked: true,
      remainingLabel: `${days} يوم و${hours} ساعة`,
    };
  }
  if (days > 0) {
    return {
      isLocked: true,
      remainingLabel: `${days} ${days === 1 ? 'يوم' : 'أيام'}`,
    };
  }
  return {
    isLocked: true,
    remainingLabel: `${Math.max(1, totalHours)} ساعة`,
  };
}

export function WaslHeaderBar({
  activeTab,
  onSelectTab,
  unreadChatsCount = 0,
  currentUserName = '',
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
  const [globalAccounts, setGlobalAccounts] = useState<FriendItem[]>([]);
  const [searchingAccounts, setSearchingAccounts] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // شريط التحميل العلوي الخفيف عند التنقل
  const [topBarLoading, setTopBarLoading] = useState(false);
  const topBarTimerRef = useRef<number | null>(null);

  const triggerTopProgress = () => {
    setTopBarLoading(true);
    if (topBarTimerRef.current) {
      window.clearTimeout(topBarTimerRef.current);
    }
    topBarTimerRef.current = window.setTimeout(() => {
      setTopBarLoading(false);
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (topBarTimerRef.current) {
        window.clearTimeout(topBarTimerRef.current);
      }
    };
  }, []);

  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [switchAccountsList, setSwitchAccountsList] = useState<SwitchableAccount[]>([]);
  const [switchManageMode, setSwitchManageMode] = useState(false);

  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [overrideName, setOverrideName] = useState<string>('');
  const [lastNameChangedAt, setLastNameChangedAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const uid = data?.session?.user?.id ?? null;
      setCurrentUid(uid);
      if (uid) {
        const scoped = readScopedAccountProfile(uid);
        if (scoped.lastNameChangedAt) setLastNameChangedAt(scoped.lastNameChangedAt);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const uid = session?.user?.id ?? null;
      setCurrentUid(uid);
      setOverrideName('');
      if (uid) {
        const scoped = readScopedAccountProfile(uid);
        setLastNameChangedAt(scoped.lastNameChangedAt);
      } else {
        setLastNameChangedAt(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!searchOpen || !trimmed) {
      setGlobalAccounts([]);
      setSearchingAccounts(false);
      return;
    }

    let cancelled = false;
    setSearchingAccounts(true);

    const safetyTimeout = setTimeout(() => {
      if (!cancelled) {
        setSearchingAccounts(false);
      }
    }, 2500);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .ilike('full_name', `%${trimmed}%`)
            .limit(12);

          if (cancelled) return;

          if (!error && Array.isArray(data)) {
            const mapped: FriendItem[] = data
              .filter((row: any) => row?.id && row.id !== currentUid)
              .map((row: any) => ({
                id: String(row.id),
                name:
                  typeof row.full_name === 'string' && row.full_name.trim()
                    ? row.full_name.trim()
                    : 'حساب وِصل',
                avatar: isValidAvatarUrl(row.avatar_url)
                  ? String(row.avatar_url).trim()
                  : undefined,
              }));

            setGlobalAccounts(mapped);
          } else {
            const localFallback = friends.filter((f) =>
              f.name.toLowerCase().includes(trimmed.toLowerCase())
            );
            setGlobalAccounts(localFallback);
          }
        } catch {
          if (!cancelled) {
            const localFallback = friends.filter((f) =>
              f.name.toLowerCase().includes(trimmed.toLowerCase())
            );
            setGlobalAccounts(localFallback);
          }
        } finally {
          clearTimeout(safetyTimeout);
          if (!cancelled) {
            setSearchingAccounts(false);
          }
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(safetyTimeout);
    };
  }, [searchOpen, searchQuery, currentUid, friends]);

  const triggerOpenSwitchAccount = () => {
    setSwitchManageMode(false);
    setSwitchAccountsList(readLocalSavedAccounts());
    setSwitchModalOpen(true);
    onOpenSwitchAccount?.();
  };

  const handleStartFreshAccountOrProfile = async () => {
    setSwitchModalOpen(false);
    setOverrideName('');
    if (onLogout) {
      onLogout();
    } else {
      await supabase.auth.signOut({ scope: 'local' });
      window.dispatchEvent(new Event('wasl-auth-reset'));
    }
  };

  const handleTriggerLogout = async () => {
    setDrawerOpen(false);
    setOverrideName('');
    if (onLogout) {
      onLogout();
    } else {
      await supabase.auth.signOut({ scope: 'local' });
      window.dispatchEvent(new Event('wasl-auth-reset'));
    }
  };

  useEffect(() => {
    const handleEvent = () => {
      triggerOpenSwitchAccount();
    };
    window.addEventListener('wasl-open-switch-account', handleEvent);
    return () => {
      window.removeEventListener('wasl-open-switch-account', handleEvent);
    };
  });

  const handlePickAccountFromModal = (acc: SwitchableAccount) => {
    if (switchManageMode) return;
    const now = Date.now();
    setOverrideName(acc.name);

    const updatedList = [
      { ...acc, lastUsedAt: now },
      ...switchAccountsList.filter((item) => item.id !== acc.id),
    ].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    setSwitchAccountsList(updatedList);
    writeLocalSavedAccounts(updatedList);

    setSwitchModalOpen(false);
    triggerTopProgress();
    onSelectTab('feed');
  };

  const handleDeleteAccountFromModal = (id: string) => {
    const filtered = switchAccountsList.filter((item) => item.id !== id);
    setSwitchAccountsList(filtered);
    writeLocalSavedAccounts(filtered);
  };

  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [editError, setEditError] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  const [settingsMenuOpen, setSettingsMenuOpen] = useState(true);
  const [settingsScreenOpen, setSettingsScreenOpen] = useState(false);
  const [settingsSearch, setSettingsSearch] = useState('');
  const [settingsNotice, setSettingsNotice] = useState('');

  const effectiveName = overrideName || currentUserName || 'حساب وِصل';
  const effectiveAvatar = isValidAvatarUrl(userAvatar) ? userAvatar?.trim() : undefined;

  const [isPublicAccount, setIsPublicAccount] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(PRIVACY_STORAGE_KEY);
      if (saved !== null) return saved === 'true';
    } catch {
      // تجاهل
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

  const showTempNotice = (msg: string) => {
    setSettingsNotice(msg);
    setTimeout(() => {
      setSettingsNotice('');
    }, 2000);
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(DARK_MODE_STORAGE_KEY, String(next));
        document.documentElement.classList.toggle('dark', next);
      } catch {
        // تجاهل
      }
      return next;
    });
  };

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar';
      try {
        localStorage.setItem(LANG_STORAGE_KEY, next);
        document.documentElement.lang = next;
        document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
      } catch {
        // تجاهل
      }
      return next;
    });
  };

  const togglePrivacy = () => {
    setIsPublicAccount((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PRIVACY_STORAGE_KEY, String(next));
      } catch {
        // تجاهل
      }
      showTempNotice(next ? 'تم تحويل الحساب إلى عام' : 'تم تحويل الحساب إلى خاص');
      return next;
    });
  };

  const lockInfo = getNameCooldownInfo(lastNameChangedAt);

  const openEditDetailsModal = () => {
    setEditNameInput(effectiveName);
    setEditError('');
    setEditDetailsOpen(true);
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = editNameInput.trim();
    if (!cleanedName) {
      setEditError('الرجاء إدخال الاسم أولاً');
      return;
    }

    const nameChanged = cleanedName !== effectiveName.trim();
    const currentLockState = getNameCooldownInfo(lastNameChangedAt);

    if (nameChanged && currentLockState.isLocked) {
      setEditError(
        `لا يمكنك تغيير الاسم الآن؛ مسموح بتغيير الاسم كل ${NAME_COOLDOWN_DAYS} أيام. المتبقي: ${currentLockState.remainingLabel}.`
      );
      return;
    }

    const nextLockTs = nameChanged ? Date.now() : lastNameChangedAt;
    if (nameChanged && nextLockTs) {
      setLastNameChangedAt(nextLockTs);
    }

    setOverrideName(cleanedName);
    setEditDetailsOpen(false);
    showTempNotice(
      nameChanged
        ? `تم حفظ الاسم ويمكنك تغييره مجدداً بعد ${NAME_COOLDOWN_DAYS} أيام`
        : 'تم حفظ بيانات الحساب بنجاح'
    );

    if (currentUid) {
      writeScopedAccountProfile(currentUid, {
        name: cleanedName,
        avatar: effectiveAvatar,
        lastNameChangedAt: nextLockTs,
      });

      setSavingDetails(true);
      void supabase
        .from('profiles')
        .upsert(
          {
            id: currentUid,
            full_name: cleanedName,
            avatar_url: effectiveAvatar || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .then(() => {
          setSavingDetails(false);
        });
    }
  };

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

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const tabs: { key: WaslTabKey; label: string; icon: string; badge?: number }[] = [
    { key: 'feed', label: 'العام', icon: '🌐' },
    {
      key: 'chats',
      label: 'المحادثات',
      icon: '💬',
      badge: unreadChatsCount > 0 ? unreadChatsCount : undefined,
    },
    { key: 'contacts', label: 'الأصدقاء', icon: '👥' },
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
      const uid = currentUid || 'guest';
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

  const handlePublishPostModal = () => {
    const finalContent = buildFinalPostContent();
    if ((!finalContent && !postImageData) || publishingPost) return;

    const fileSnapshot = postSelectedFile;
    const imageSnapshot = postImageData;
    const authorLabel = effectiveName;
    const userIdSnapshot = currentUid;

    onCreatePostSubmit?.(finalContent, imageSnapshot || undefined);
    resetPostModal();

    void (async () => {
      setPublishingPost(true);
      try {
        let finalImageUrl: string | undefined = imageSnapshot || undefined;
        if (fileSnapshot && imageSnapshot) {
          finalImageUrl = await uploadPostImageToStorage(fileSnapshot, imageSnapshot);
        }

        await supabase.from('posts').insert({
          user_id: userIdSnapshot,
          author_name: authorLabel,
          headline: finalImageUrl ? `نشر ${authorLabel} صورة` : `نشر ${authorLabel}`,
          content: finalContent || null,
          image_url: finalImageUrl || null,
          kind: finalImageUrl ? 'photo' : 'post',
        });
      } finally {
        setPublishingPost(false);
      }
    })();
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

  const qSettings = settingsSearch.trim().toLowerCase();
  const matchSettingsItem = (label: string) =>
    !qSettings || label.toLowerCase().includes(qSettings);

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
        <span className="text-2xl font-black tracking-tight text-cyan-400">
          وِصل
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openStoryGallery}
            title="إضافة قصة"
            aria-label="إضافة قصة"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-lg font-bold text-slate-100"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchOpen((prev) => !prev);
              setSearchQuery('');
              setGlobalAccounts([]);
            }}
            title="بحث عام في وِصل"
            aria-label="بحث عام في وِصل"
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm ${
              searchOpen
                ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            🔍
          </button>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            title="القائمة الجانبية"
            aria-label="القائمة الجانبية"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-base font-bold text-slate-100"
          >
            ☰
          </button>
        </div>
      </div>

      {/* شريط البحث العام عن أي حساب مسجل في وِصل بالاسم */}
      {searchOpen && (
        <div className="px-4 pb-2.5 space-y-2 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2">
            <Search size={14} className="text-cyan-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم أي حساب في وِصل..."
              autoFocus
              className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setGlobalAccounts([]);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {normalizedQuery && (
            <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
              {searchingAccounts ? (
                <p className="px-3 py-3 text-center text-xs text-slate-400">
                  جاري البحث في حسابات وِصل...
                </p>
              ) : globalAccounts.length > 0 ? (
                globalAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => {
                      onSelectFriend?.(account);
                      setSearchOpen(false);
                      setSearchQuery('');
                      setGlobalAccounts([]);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-right hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {account.avatar ? (
                        <img
                          src={account.avatar}
                          alt={account.name}
                          loading="lazy"
                          decoding="async"
                          className="h-8 w-8 shrink-0 rounded-full object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-xs font-black text-cyan-300">
                          {account.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">{account.name}</p>
                        <p className="text-[10px] text-slate-400">حساب في وِصل</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-cyan-400">مراسلة</span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-3 text-center text-xs text-slate-400">
                  لا يوجد حساب باسم «{searchQuery.trim()}» في وِصل
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. شريط التبويبات العلوي + شريط التحميل الرفيع */}
      <nav
        aria-label="أقسام التطبيق"
        className="relative grid grid-cols-4 bg-slate-950 border-b border-slate-800 overflow-hidden"
      >
        {topBarLoading && (
          <div className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-slate-800/60 overflow-hidden z-20">
            <div className="h-full w-1/2 bg-[#1877F2] animate-pulse" />
          </div>
        )}

        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                triggerTopProgress();
                onSelectTab(tab.key);
              }}
              className={`relative flex flex-col items-center justify-center gap-1 py-2.5 px-1 ${
                isActive
                  ? 'text-cyan-400 bg-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative flex items-center justify-center text-lg leading-none">
                <span>{tab.icon}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -left-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-black text-slate-950">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold truncate max-w-full">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 inset-x-3 h-0.5 bg-cyan-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. شريط «بم تفكر؟» + شريط القصص */}
      {activeTab === 'feed' && (
        <>
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-900">
            <button
              type="button"
              onClick={() => {
                triggerTopProgress();
                onSelectTab('profile');
              }}
              title="فتح الملف الشخصي"
              aria-label="فتح الملف الشخصي"
              className="shrink-0 rounded-full focus:outline-none"
            >
              {effectiveAvatar ? (
                <img
                  src={effectiveAvatar}
                  alt={effectiveName}
                  loading="lazy"
                  decoding="async"
                  className="h-10 w-10 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-sm font-black text-cyan-300">
                  {effectiveName.slice(0, 1)}
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setPostModalOpen(true)}
              className="flex-1 text-right rounded-full bg-slate-900 border border-slate-800 px-4 py-2 text-xs text-slate-400"
            >
              بم تفكر؟
            </button>

            <button
              type="button"
              onClick={openPostGallery}
              className="flex flex-col items-center justify-center rounded-xl px-2.5 py-1 text-emerald-400"
            >
              <span className="text-base leading-none">🖼️</span>
              <span className="text-[10px] font-bold text-slate-300 mt-0.5">صورة</span>
            </button>
          </div>

          <div className="flex gap-2.5 overflow-x-auto px-4 pt-2.5 pb-3.5 border-b border-slate-800">
            {stories.map((story) => {
              if (story.isCreate) {
                return (
                  <button
                    key={story.id}
                    type="button"
                    onClick={openStoryGallery}
                    className="relative flex h-40 w-28 shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-center"
                  >
                    <div className="flex-1 w-full bg-slate-800/60 flex items-center justify-center">
                      {story.image ? (
                        <img
                          src={story.image}
                          alt={story.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover opacity-75"
                        />
                      ) : (
                        <span className="text-2xl text-slate-400">👤</span>
                      )}
                    </div>
                    <div className="relative bg-slate-900 pt-5 pb-2.5 px-1.5">
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-slate-950 font-black text-base border-2 border-slate-900">
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
                    className="flex h-40 w-28 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-cyan-600 to-purple-700 p-2 text-white"
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
                  className="relative flex h-40 w-28 shrink-0 flex-col justify-end overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-right"
                >
                  {story.image && (
                    <img
                      src={story.image}
                      alt={story.title}
                      loading="lazy"
                      decoding="async"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#1c1d21] text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 bg-[#242529] px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={resetPostModal}
                    aria-label="رجوع"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-200 hover:bg-white/10"
                  >
                    <ArrowRight size={18} />
                  </button>
                  <span className="text-sm font-bold text-white">إنشاء منشور</span>
                </div>

                <button
                  type="button"
                  onClick={handlePublishPostModal}
                  disabled={!canSubmitPost}
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${
                    canSubmitPost
                      ? 'bg-[#1877F2] text-white'
                      : 'text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {publishingPost ? 'جاري...' : 'نشر'}
                </button>
              </div>

              <div className="px-4 pt-3.5 pb-2">
                <div className="flex items-center gap-3">
                  {effectiveAvatar ? (
                    <img
                      src={effectiveAvatar}
                      alt={effectiveName}
                      loading="lazy"
                      decoding="async"
                      className="h-11 w-11 shrink-0 rounded-full border border-white/15 object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white border border-white/15">
                      {effectiveName.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{effectiveName}</p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-white/15 bg-[#2a2b30] px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                      <span>{isPublicAccount ? 'العامة' : 'خاص'}</span>
                      <span>▾</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5">
                  <textarea
                    rows={selectedTheme === 'none' ? 3 : 4}
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="شارك لحظة بارزة من يومك..."
                    className={`w-full resize-none outline-none ${
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
                      loading="lazy"
                      decoding="async"
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

              <div className="flex items-center gap-2 border-t border-white/10 bg-[#242529]/80 px-3 py-2">
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
                        className={`h-7 w-7 shrink-0 rounded-lg ${SWATCH_COLORS[theme.id]} ${
                          active ? 'ring-2 ring-white' : 'opacity-90'
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
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#32343a] text-slate-200"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

              <div className="divide-y divide-white/5 border-t border-white/10 bg-[#1c1d21]">
                {composerOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-right text-xs font-semibold text-slate-100 hover:bg-white/5"
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
                onClick={handlePublishPostModal}
                disabled={!canSubmitPost}
                className="w-full rounded-lg bg-[#1877F2] py-2.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                {publishingPost ? 'جاري النشر...' : 'نشر'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إتمام ونشر القصة */}
      {storyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleStorySave}
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3"
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
                  loading="lazy"
                  decoding="async"
                  className="h-44 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={openStoryGallery}
                  className="absolute bottom-2 right-2 rounded-lg bg-slate-950/85 px-2.5 py-1 text-[10px] font-bold text-cyan-300"
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
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
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
                className="flex-1 rounded-xl bg-cyan-600 py-2 text-xs font-bold text-white"
              >
                نشر القصة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* القائمة الجانبية عند الضغط على ☰ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-start bg-black/65">
          <div className="w-80 max-w-[85vw] h-full overflow-y-auto bg-slate-900 border-l border-slate-800 p-4 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{effectiveName}</p>
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
                  className="w-full flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-100"
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
                  className="w-full flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-100"
                >
                  <span>بحث عام في وِصل</span>
                  <span>🔍</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    triggerTopProgress();
                    onSelectTab('profile');
                  }}
                  className="w-full flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-100"
                >
                  <span>الملف الشخصي</span>
                  <span>👤</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    triggerOpenSwitchAccount();
                  }}
                  className="w-full flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs font-bold text-cyan-200"
                >
                  <span>تبديل الحساب</span>
                  <span>⇄</span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSettingsMenuOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-black text-white"
                >
                  <span className="flex items-center gap-2">
                    <span>⚙️</span>
                    <span>الإعدادات والخصوصية</span>
                  </span>
                  <span className="text-cyan-400 text-xs">{settingsMenuOpen ? '⌃' : '⌄'}</span>
                </button>

                {settingsMenuOpen && (
                  <div className="border-t border-slate-800 p-2 space-y-1.5 bg-slate-950">
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false);
                        setSettingsSearch('');
                        setSettingsScreenOpen(true);
                      }}
                      className="w-full flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5 text-xs font-bold text-slate-100"
                    >
                      <span className="flex items-center gap-2">
                        <span>👤</span>
                        <span>الإعدادات</span>
                      </span>
                      <span className="text-[11px] text-cyan-400">فتح</span>
                    </button>

                    <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5">
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-100">
                        <span>🌙</span>
                        <span>الوضع المظلم</span>
                      </span>
                      <button
                        type="button"
                        onClick={toggleDarkMode}
                        aria-label="تبديل الوضع المظلم"
                        className={`relative h-6 w-11 rounded-full ${
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
                      onClick={toggleLanguage}
                      className="w-full flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5 text-xs font-bold text-slate-100"
                    >
                      <span className="flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-black text-cyan-300">
                          Aa
                        </span>
                        <span>اللغة</span>
                      </span>
                      <span className="rounded-lg bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-cyan-300">
                        {language === 'ar' ? 'العربية' : 'English'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleTriggerLogout()}
                className="shrink-0 w-full flex items-center justify-between rounded-xl border border-rose-500/35 bg-rose-950/35 px-3.5 py-2.5 text-xs font-bold text-rose-300"
              >
                <span>تسجيل الخروج</span>
                <span>🚪</span>
              </button>
            </div>
          </div>

          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      {/* نافذة تبديل الحساب المفعّلة */}
      {switchModalOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[70] flex flex-col justify-between bg-[#18191a] text-[#e4e6eb] overflow-y-auto"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between bg-[#18191a] px-4 pt-4 pb-2">
            <button
              type="button"
              onClick={() => setSwitchModalOpen(false)}
              aria-label="إغلاق"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/10"
            >
              <X size={20} />
            </button>

            <button
              type="button"
              onClick={() => setSwitchManageMode((prev) => !prev)}
              aria-label="إدارة الحسابات المحفوظة"
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                switchManageMode
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <MoreHorizontal size={22} />
            </button>
          </div>

          <div className="mx-auto w-full max-w-md flex-1 px-4 py-3 space-y-3">
            {switchManageMode && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-3.5 py-2 text-center text-xs font-bold text-amber-200">
                اختر أي حساب لإزالته
              </div>
            )}

            {switchAccountsList.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#242526] p-8 text-center space-y-2">
                <p className="text-sm font-bold text-white">لا توجد حسابات محفوظة بعد</p>
                <p className="text-xs text-slate-400">سيتم حفظ الحسابات للدخول السريع.</p>
              </div>
            ) : (
              switchAccountsList.map((acc) => {
                const avatarSrc = isValidAvatarUrl(acc.avatar) ? acc.avatar : undefined;
                return (
                  <div
                    key={acc.id}
                    onClick={() => handlePickAccountFromModal(acc)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handlePickAccountFromModal(acc);
                    }}
                    className="flex items-center justify-between rounded-2xl border border-white/15 bg-[#242526] px-4 py-3.5 hover:bg-[#2d2f31] cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={acc.name}
                          loading="lazy"
                          decoding="async"
                          className="h-12 w-12 shrink-0 rounded-full object-cover border border-white/15"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#3a3b3c] text-lg font-black text-slate-200">
                          {acc.name.slice(0, 1)}
                        </div>
                      )}
                      <span className="truncate text-sm font-bold text-white">{acc.name}</span>
                    </div>

                    {switchManageMode ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAccountFromModal(acc.id);
                        }}
                        aria-label={`إزالة ${acc.name}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <ChevronLeft size={20} className="shrink-0 text-slate-400" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="mx-auto w-full max-w-md px-4 pt-3 pb-6 space-y-3">
            <button
              type="button"
              onClick={() => void handleStartFreshAccountOrProfile()}
              className="w-full rounded-full bg-[#2d2f31] py-3 text-xs font-extrabold text-white"
            >
              استخدام ملف شخصي آخر
            </button>

            <button
              type="button"
              onClick={() => void handleStartFreshAccountOrProfile()}
              className="w-full rounded-full border border-[#3b82f6] bg-transparent py-3 text-xs font-extrabold text-[#4599FF]"
            >
              إنشاء حساب جديد
            </button>

            <div className="pt-2 text-center">
              <span className="text-xs font-black tracking-wide text-slate-400">وِصل</span>
            </div>
          </div>
        </div>
      )}

      {/* شاشة الإعدادات والخصوصية الكاملة عند الضغط على «الإعدادات» */}
      {settingsScreenOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#18191a] text-[#e4e6eb]"
        >
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#242526] px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSettingsScreenOpen(false)}
                aria-label="رجوع"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-200 hover:bg-white/10"
              >
                <ChevronRight size={22} />
              </button>
              <h2 className="text-base font-extrabold text-white">الإعدادات والخصوصية</h2>
            </div>

            <button
              type="button"
              onClick={() => setSettingsScreenOpen(false)}
              aria-label="إغلاق"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/10"
            >
              <Search size={18} />
            </button>
          </div>

          <div className="mx-auto max-w-2xl space-y-5 p-4 pb-10">
            <div className="flex items-center gap-2.5 rounded-full bg-[#3a3b3c] px-4 py-2.5">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={settingsSearch}
                onChange={(e) => setSettingsSearch(e.target.value)}
                placeholder="بحث في الإعدادات"
                className="w-full bg-transparent text-xs text-white placeholder:text-slate-400 outline-none"
              />
              {settingsSearch && (
                <button
                  type="button"
                  onClick={() => setSettingsSearch('')}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {settingsNotice && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-300">
                {settingsNotice}
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-[#242526] p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black tracking-wide text-cyan-400">وِصل</span>
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-white">حساب وِصل</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  يمكنك إدارة بيانات ملفك الشخصي، الخصوصية، وتفضيلات الحساب في وِصل.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {matchSettingsItem('التفاصيل الشخصية الملف الشخصي') && (
                  <button
                    type="button"
                    onClick={openEditDetailsModal}
                    className="flex w-full items-center justify-between text-right py-1.5 px-2 -mx-2 rounded-xl hover:bg-white/5"
                  >
                    <span className="flex items-center gap-3 text-xs font-bold text-slate-200">
                      <UserCog size={18} className="text-cyan-400 shrink-0" />
                      <span>التفاصيل الشخصية</span>
                    </span>
                    <span className="text-[11px] font-bold text-cyan-400">{effectiveName}</span>
                  </button>
                )}

                {matchSettingsItem('كلمة السر والأمان') && (
                  <button
                    type="button"
                    onClick={() => showTempNotice('حماية الحساب نشطة وجلساتك مؤمنة')}
                    className="flex w-full items-center justify-between text-right py-1"
                  >
                    <span className="flex items-center gap-3 text-xs font-bold text-slate-200">
                      <KeyRound size={18} className="text-slate-400 shrink-0" />
                      <span>كلمة السر والأمان</span>
                    </span>
                    <span className="text-[11px] text-slate-400">نشط</span>
                  </button>
                )}

                {matchSettingsItem('تفضيلات المحتوى') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsScreenOpen(false);
                      triggerTopProgress();
                      onSelectTab('feed');
                    }}
                    className="flex w-full items-center justify-between text-right py-1"
                  >
                    <span className="flex items-center gap-3 text-xs font-bold text-slate-200">
                      <SlidersHorizontal size={18} className="text-slate-400 shrink-0" />
                      <span>تفضيلات المحتوى</span>
                    </span>
                    <span className="text-[11px] text-slate-400">العام</span>
                  </button>
                )}

                {matchSettingsItem('التحقق') && (
                  <button
                    type="button"
                    onClick={() => showTempNotice('حالة الحساب موثّقة في وِصل')}
                    className="flex w-full items-center justify-between text-right py-1"
                  >
                    <span className="flex items-center gap-3 text-xs font-bold text-slate-200">
                      <CheckCircle2 size={18} className="text-slate-400 shrink-0" />
                      <span>التحقق</span>
                    </span>
                    <span className="text-[11px] text-emerald-400">مفعّل</span>
                  </button>
                )}
              </div>

              <div className="border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={openEditDetailsModal}
                  className="text-xs font-bold text-[#4599FF] hover:underline"
                >
                  إدارة بيانات الملف الشخصي
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <h3 className="text-sm font-extrabold text-white">الأدوات والموارد</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  تساعدك الأدوات التي نوفرها على التحكم في خصوصيتك وإدارتها.
                </p>
              </div>

              <div className="space-y-2">
                {matchSettingsItem('نوع الحساب عام خاص الخصوصية') && (
                  <div className="flex items-center justify-between rounded-xl bg-[#242526] border border-white/10 px-3.5 py-3">
                    <span className="flex items-center gap-3 text-xs font-bold text-white">
                      <Lock size={18} className="text-slate-300 shrink-0" />
                      <span>نوع الحساب: {isPublicAccount ? 'عام' : 'خاص'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={togglePrivacy}
                      className="rounded-lg bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 text-[11px] font-bold text-cyan-300"
                    >
                      تغيير
                    </button>
                  </div>
                )}

                {matchSettingsItem('التحقق من الخصوصية') && (
                  <button
                    type="button"
                    onClick={() =>
                      showTempNotice(
                        isPublicAccount
                          ? 'حسابك عام ويمكن للجميع متابعة منشوراتك'
                          : 'حسابك خاص ويقتصر على جهات اتصالك'
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-xl bg-[#242526] border border-white/10 px-3.5 py-3 text-right text-xs font-bold text-white hover:bg-white/5"
                  >
                    <ShieldCheck size={18} className="text-slate-300 shrink-0" />
                    <span>التحقق من الخصوصية</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <h3 className="text-sm font-extrabold text-white">التفضيلات</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  يمكنك تخصيص تجربتك على تطبيق وِصل.
                </p>
              </div>

              <div className="space-y-2">
                {matchSettingsItem('الوضع المظلم') && (
                  <div className="flex items-center justify-between rounded-xl bg-[#242526] border border-white/10 px-3.5 py-3">
                    <span className="flex items-center gap-3 text-xs font-bold text-white">
                      <span>🌙</span>
                      <span>الوضع المظلم</span>
                    </span>
                    <button
                      type="button"
                      onClick={toggleDarkMode}
                      aria-label="تبديل الوضع المظلم"
                      className={`relative h-6 w-11 rounded-full ${
                        darkMode ? 'bg-cyan-500' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                          darkMode ? '-translate-x-6' : '-translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {matchSettingsItem('اللغة العربية English') && (
                  <button
                    type="button"
                    onClick={toggleLanguage}
                    className="flex w-full items-center justify-between rounded-xl bg-[#242526] border border-white/10 px-3.5 py-3 text-xs font-bold text-white hover:bg-white/5"
                  >
                    <span className="flex items-center gap-3">
                      <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-black text-cyan-300">
                        Aa
                      </span>
                      <span>اللغة</span>
                    </span>
                    <span className="rounded-lg bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-cyan-300">
                      {language === 'ar' ? 'العربية' : 'English'}
                    </span>
                  </button>
                )}

                {matchSettingsItem('مسح الكاش المحلي') && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.removeItem(PRIVACY_STORAGE_KEY);
                        localStorage.removeItem(DARK_MODE_STORAGE_KEY);
                        localStorage.removeItem(LANG_STORAGE_KEY);
                        showTempNotice('تم مسح الكاش المؤقت وبيانات الحساب محفوظة');
                      } catch {
                        showTempNotice('تعذر مسح الكاش الآن');
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-xl bg-[#242526] border border-white/10 px-3.5 py-3 text-right text-xs font-bold text-rose-300 hover:bg-white/5"
                  >
                    <Trash2 size={18} className="text-rose-400 shrink-0" />
                    <span>مسح الكاش المؤقت</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعديل الاسم عند الضغط على «التفاصيل الشخصية» */}
      {editDetailsOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"
        >
          <form
            onSubmit={handleSaveDetails}
            className="w-full max-w-sm rounded-2xl border border-slate-700 bg-[#242526] p-4 space-y-4 text-white"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 className="text-sm font-black text-white">تعديل التفاصيل الشخصية</h3>
              <button
                type="button"
                onClick={() => setEditDetailsOpen(false)}
                aria-label="إغلاق"
                className="rounded-lg bg-white/5 p-1 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {lockInfo.isLocked && (
              <div className="rounded-xl border border-amber-500/35 bg-amber-950/40 px-3 py-2 text-[11px] font-bold text-amber-200 leading-relaxed">
                تغيير الاسم مقفل مؤقتاً (كل {NAME_COOLDOWN_DAYS} أيام). يمكنك تغيير الاسم مجدداً بعد:{' '}
                <span className="text-amber-300">{lockInfo.remainingLabel}</span>.
              </div>
            )}

            {editError && (
              <div className="rounded-xl border border-rose-500/35 bg-rose-950/40 px-3 py-2 text-[11px] font-bold text-rose-200 leading-relaxed">
                {editError}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  الاسم في الملف الشخصي
                </label>
                <span className="text-[10px] text-slate-400">
                  متاح كل {NAME_COOLDOWN_DAYS} أيام
                </span>
              </div>
              <input
                type="text"
                value={editNameInput}
                disabled={lockInfo.isLocked}
                onChange={(e) => {
                  setEditError('');
                  setEditNameInput(e.target.value);
                }}
                placeholder="اكتب اسمك..."
                className="w-full rounded-xl border border-white/15 bg-[#18191a] px-3.5 py-2.5 text-xs font-bold text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditDetailsOpen(false)}
                className="flex-1 rounded-xl border border-white/10 bg-[#18191a] py-2.5 text-xs font-bold text-slate-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingDetails}
                className="flex-1 rounded-xl bg-cyan-600 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
              >
                {savingDetails ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
