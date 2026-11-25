import React, { useRef, useState } from 'react';

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
  onQuickPhoto?: () => void;
  onOpenComposer?: () => void;
  onSelectStory?: (story: StoryItem) => void;
  onSelectFriend?: (friend: FriendItem) => void;
  onOpenSwitchAccount?: () => void;
  onLogout?: () => void;
}

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
  onQuickPhoto,
  onOpenComposer,
  onSelectStory,
  onSelectFriend,
  onOpenSwitchAccount,
  onLogout,
}: WaslHeaderBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyImageData, setStoryImageData] = useState<string>('');
  const [storyFileName, setStoryFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // فتح معرض التلفون مباشرة من أي مكان يطلب إضافة قصة
  const openStoryGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    } else {
      setStoryModalOpen(true);
    }
  };

  const handlePickGalleryImage = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setStoryModalOpen(false);
  };

  const handleStorySave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyText.trim() && !storyImageData) return;
    onCreateStorySubmit?.(storyText.trim(), storyImageData || undefined);
    resetStoryModal();
  };

  return (
    <div dir="rtl" className="w-full bg-slate-950 text-slate-100 select-none">
      {/* مدخل المعرض العام لأي زر قصة */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePickGalleryImage}
        className="hidden"
      />

      {/* 1. الهيدر العلوي: اسم التطبيق + (+ قصة) + (🔍 بحث أصدقاء) + (☰ قائمة جانبية) */}
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

      {/* 2. شريط التبويبات العلوي (بنفس شكل فيسبوك) */}
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

      {/* 3. شريط «بم تفكر؟» */}
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
              onClick={onOpenComposer}
              className="flex-1 text-right rounded-full bg-slate-900 border border-slate-800 hover:border-purple-500/35 px-4 py-2 text-xs text-slate-400 transition"
            >
              بم تفكر؟
            </button>

            <button
              type="button"
              onClick={onQuickPhoto}
              className="flex flex-col items-center justify-center rounded-xl px-2.5 py-1 text-emerald-400 hover:bg-slate-900 transition"
            >
              <span className="text-base leading-none">🖼️</span>
              <span className="text-[10px] font-bold text-slate-300 mt-0.5">صورة</span>
            </button>
          </div>

          {/* 4. شريط القصص */}
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

      {/* نافذة إتمام ونشر القصة بعد اختيار الصورة من المعرض */}
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
          <div className="w-72 max-w-[82vw] h-full bg-slate-900 border-l border-purple-500/25 p-4 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
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
