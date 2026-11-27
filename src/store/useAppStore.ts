import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Conversation, Post, Story, User } from '@/types';
import { currentUser, mockConversations, mockPosts, mockStories, mockUsers } from '@/data/mockData';

/* =====================================================================
 *  أدوات مساعدة
 * ===================================================================== */

let idCounter = 100;
// معرّف فريد حتى لا يتعارض مع بيانات محفوظة سابقاً
const nextId = () => `new-${Date.now().toString(36)}-${idCounter++}`;

function clone<T>(value: T): T {
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch {
    // نتابع إلى الطريقة البديلة
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/* =====================================================================
 *  حالة التطبيق المرتبطة بالمستخدم (user_id)
 * ===================================================================== */

interface SharedState {
  users: User[];
  posts: Post[];
  conversations: Conversation[];
  stories: Story[];
  profile: User;
  activeConversationId: string | null;
}

// كل مفاتيح التخزين الخاصة بالحساب تبدأ بهذه البادئة + user_id
const USER_KEY_PREFIX = 'wasl_user_';
const ACTIVE_USER_KEY = 'wasl_active_user_id';

const storageKeyFor = (userId: string) => `${USER_KEY_PREFIX}${userId}_state`;

function createInitialState(): SharedState {
  return {
    users: clone(mockUsers),
    posts: clone(mockPosts),
    conversations: clone(mockConversations),
    stories: clone(mockStories),
    profile: clone(currentUser),
    activeConversationId: mockConversations[0]?.id ?? null,
  };
}

let activeUserId: string | null = null;
let state: SharedState = createInitialState();
const stateListeners = new Set<() => void>();

function emit() {
  stateListeners.forEach((fn) => fn());
}

function subscribeState(listener: () => void) {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

function getState(): SharedState {
  return state;
}

/** حفظ حالة الحساب الحالي فقط، تحت مفتاح يحمل user_id الخاص به */
function persistState() {
  if (!activeUserId) return;
  try {
    localStorage.setItem(storageKeyFor(activeUserId), JSON.stringify(state));
    localStorage.setItem(ACTIVE_USER_KEY, activeUserId);
  } catch {
    // تجاهل أخطاء التخزين (امتلاء المساحة أو الوضع الخاص)
  }
}

function loadPersistedState(userId: string): SharedState | null {
  try {
    const raw = localStorage.getItem(storageKeyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SharedState>;
    const base = createInitialState();
    return {
      users: Array.isArray(parsed.users) ? parsed.users : base.users,
      posts: Array.isArray(parsed.posts) ? parsed.posts : base.posts,
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : base.conversations,
      stories: Array.isArray(parsed.stories) ? parsed.stories : base.stories,
      profile: parsed.profile ? { ...base.profile, ...parsed.profile, id: userId } : { ...base.profile, id: userId },
      activeConversationId:
        parsed.activeConversationId !== undefined ? parsed.activeConversationId : base.activeConversationId,
    };
  } catch {
    return null;
  }
}

/**
 * حذف بيانات الحسابات من التخزين المحلي.
 * - إن مُرّر exceptUserId: تُحذف بيانات كل الحسابات الأخرى ويبقى هذا الحساب.
 * - إن لم يُمرَّر: تُحذف بيانات كل الحسابات (تسجيل الخروج).
 * لا يمس مفتاح الثيم لأنه إعداد للجهاز وليس للحساب.
 */
function wipeUserStorage(exceptUserId?: string | null) {
  const keepKey = exceptUserId ? storageKeyFor(exceptUserId) : null;

  const wipeFrom = (storage: Storage) => {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        if (key === ACTIVE_USER_KEY) {
          if (!exceptUserId) toRemove.push(key);
          continue;
        }
        if (key.startsWith(USER_KEY_PREFIX) && key !== keepKey) toRemove.push(key);
      }
      toRemove.forEach((k) => storage.removeItem(k));
    } catch {
      // تجاهل
    }
  };

  wipeFrom(localStorage);
  wipeFrom(sessionStorage);
}

function updateState(updater: (s: SharedState) => Partial<SharedState>) {
  state = { ...state, ...updater(state) };
  persistState();
  emit();
}

/* =====================================================================
 *  واجهات التحكم بالحساب (تُستدعى من AuthGate)
 * ===================================================================== */

/**
 * تفعيل حساب بعد تسجيل الدخول أو عند استعادة الجلسة.
 * - إذا كان user_id مختلفاً عن الحساب النشط: تُفرَّغ بيانات الحساب السابق
 *   من الذاكرة ومن التخزين المحلي بالكامل، ثم تُحمَّل بيانات الحساب الجديد.
 * - seed: بيانات أولية للملف الشخصي (الاسم، الصورة...) للحسابات الجديدة فقط.
 */
export function activateUser(userId: string | null | undefined, seed?: Partial<User>) {
  if (!userId) {
    deactivateUser();
    return;
  }
  if (activeUserId === userId) return;

  // حذف بيانات أي حساب آخر (حتى لو كانت من جلسة سابقة قبل إغلاق المتصفح)
  wipeUserStorage(userId);

  const persisted = loadPersistedState(userId);
  if (persisted) {
    state = persisted;
  } else {
    const fresh = createInitialState();
    state = { ...fresh, profile: { ...fresh.profile, ...(seed ?? {}), id: userId } };
  }

  activeUserId = userId;
  persistState();
  emit();
}

/** تسجيل الخروج: تفريغ كل بيانات الحساب من الحالة ومن التخزين المحلي */
export function deactivateUser() {
  wipeUserStorage();
  activeUserId = null;
  state = createInitialState();
  emit();
}

export function getActiveUserId(): string | null {
  return activeUserId;
}

/* =====================================================================
 *  الثيم (إعداد للجهاز، لا يُمسح عند تسجيل الخروج)
 * ===================================================================== */

const THEME_STORAGE_KEY = 'wasl_dark_mode';

function readInitialDarkMode(): boolean {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === null) return true;
    return saved === 'true';
  } catch {
    return true;
  }
}

let sharedDarkMode = readInitialDarkMode();
const themeListeners = new Set<(next: boolean) => void>();

function applyThemeToDocument(isDark: boolean) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, String(isDark));
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }
  } catch {
    // تجاهل أخطاء التخزين
  }
}

function setSharedDarkMode(next: boolean) {
  sharedDarkMode = next;
  applyThemeToDocument(next);
  themeListeners.forEach((fn) => fn(next));
}

/* =====================================================================
 *  الإجراءات (على مستوى الملف، تعمل على الحالة المشتركة للحساب الحالي)
 * ===================================================================== */

function addFriend(user: User) {
  updateState((s) => ({
    users: s.users.map((u) => (u.id === user.id ? { ...u, isFriend: true } : u)),
    posts: s.posts.map((p) =>
      p.author.id === user.id ? { ...p, author: { ...p.author, isFriend: true } } : p
    ),
  }));
}

function addContact(user: User) {
  updateState((s) => ({
    users: s.users.map((u) => (u.id === user.id ? { ...u, isContact: true, isFriend: true } : u)),
    posts: s.posts.map((p) =>
      p.author.id === user.id ? { ...p, author: { ...p.author, isContact: true, isFriend: true } } : p
    ),
  }));
}

function addContactByHandle(handle: string): { ok: boolean; error?: string } {
  const clean = handle.trim().replace(/^@/, '').replace(/\s+/g, '');
  if (!clean) return { ok: false, error: 'الرجاء إدخال رقم هاتف أو اسم مستخدم' };
  const found = state.users.find(
    (u) =>
      u.username.replace(/^@/, '') === clean.replace(/^@/, '') ||
      u.phone.replace(/\s+/g, '') === clean.replace(/^\+?966/, '+966').replace(/\s+/g, '')
  );
  if (!found) return { ok: false, error: 'لم نجد مستخدماً بهذا الاسم أو الرقم' };
  if (found.isContact) return { ok: false, error: 'هذا الشخص موجود مسبقاً في جهات اتصالك' };
  addContact(found);
  return { ok: true };
}

function toggleLike(postId: string) {
  updateState((s) => ({
    posts: s.posts.map((p) =>
      p.id === postId
        ? { ...p, likedByMe: !p.likedByMe, likes: p.likedByMe ? p.likes - 1 : p.likes + 1 }
        : p
    ),
  }));
}

function addComment(postId: string, text: string) {
  updateState((s) => ({
    posts: s.posts.map((p) =>
      p.id === postId
        ? {
            ...p,
            comments: [...p.comments, { id: nextId(), author: s.profile, text, createdAt: 'الآن' }],
          }
        : p
    ),
  }));
}

function createPost(text: string, imageUrl?: string) {
  updateState((s) => ({
    posts: [
      {
        id: nextId(),
        author: s.profile,
        text,
        imageUrl,
        createdAt: 'الآن',
        likes: 0,
        likedByMe: false,
        comments: [],
      },
      ...s.posts,
    ],
  }));
}

function addPost(newPost: Post | Record<string, any>) {
  updateState((s) => {
    const normalized: Post = {
      id: String(newPost.id || nextId()),
      author: newPost.author || s.profile,
      text: String(newPost.text ?? newPost.content ?? ''),
      imageUrl: newPost.imageUrl || newPost.image,
      createdAt: String(newPost.createdAt || 'الآن'),
      likes: Number(newPost.likes ?? 0),
      likedByMe: Boolean(newPost.likedByMe ?? false),
      comments: Array.isArray(newPost.comments) ? newPost.comments : [],
    };
    return {
      posts: s.posts.some((p) => p.id === normalized.id) ? s.posts : [normalized, ...s.posts],
    };
  });
}

function sendMessage(conversationId: string, text: string) {
  updateState((s) => ({
    conversations: s.conversations.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            messages: [...c.messages, { id: nextId(), senderId: 'me', text, createdAt: 'الآن' }],
          }
        : c
    ),
  }));
}

function openConversation(conversationId: string) {
  updateState((s) => ({
    activeConversationId: conversationId,
    conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)),
  }));
}

function startConversationWith(user: User) {
  const existing = state.conversations.find((c) => c.user.id === user.id);
  if (existing) {
    openConversation(existing.id);
    return;
  }
  const id = nextId();
  updateState((s) => ({
    conversations: [{ id, user, messages: [], unread: 0 }, ...s.conversations],
    activeConversationId: id,
  }));
}

function markStorySeen(storyId: string) {
  updateState((s) => ({
    stories: s.stories.map((st) => (st.id === storyId ? { ...st, seen: true } : st)),
  }));
}

function updateProfile(updates: Partial<User>) {
  // لا يُسمح بتغيير المعرّف: يبقى مرتبطاً بـ user_id الخاص بالجلسة
  const { id: _ignored, ...safeUpdates } = updates as Partial<User> & { id?: string };
  updateState((s) => ({ profile: { ...s.profile, ...safeUpdates } }));
}

/* =====================================================================
 *  الـ Hook
 * ===================================================================== */

export function useAppStore() {
  const snapshot = useSyncExternalStore(subscribeState, getState, getState);
  const [darkMode, setDarkMode] = useState<boolean>(sharedDarkMode);

  useEffect(() => {
    applyThemeToDocument(sharedDarkMode);
    setDarkMode(sharedDarkMode);
    themeListeners.add(setDarkMode);
    return () => {
      themeListeners.delete(setDarkMode);
    };
  }, []);

  const toggleDarkMode = useCallback(() => {
    setSharedDarkMode(!sharedDarkMode);
  }, []);

  const { users, posts, conversations, stories, profile, activeConversationId } = snapshot;

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unread, 0),
    [conversations]
  );

  const discoverPeople = useMemo(() => users.filter((u) => !u.isFriend), [users]);
  const contacts = useMemo(() => users.filter((u) => u.isContact), [users]);

  return {
    users,
    posts,
    conversations,
    stories,
    profile,
    activeConversationId,
    totalUnread,
    discoverPeople,
    contacts,
    darkMode,
    toggleDarkMode,
    addFriend,
    addContact,
    addContactByHandle,
    toggleLike,
    addComment,
    createPost,
    addPost,
    sendMessage,
    openConversation,
    startConversationWith,
    markStorySeen,
    updateProfile,
  };
}
