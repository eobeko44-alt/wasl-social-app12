import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  MapPin,
  Home,
  Cake,
  GraduationCap,
  Gamepad2,
  Plus,
  Edit3,
  Users,
  Image as ImageIcon,
  Sparkles,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Send,
  UserPlus,
  X,
  UserCheck,
  MoreHorizontal,
  BellOff,
  Bell,
  Bookmark,
  MessageSquare,
  Tag,
  Globe,
  Megaphone,
  Pencil,
  Link2,
  Lock,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';

type ProfileSectionTab = 'all' | 'photos' | 'about';
type FollowModalTab = 'followers' | 'following';
type PostPrivacy = 'public' | 'friends' | 'only_me';
type CommentAudience = 'everyone' | 'friends' | 'followers' | 'off';

interface FollowerPerson {
  id: string;
  name: string;
  handleOrCity: string;
  avatar?: string;
}

interface PostCommentItem {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

interface ActivityPostItem {
  id: string;
  dbId?: string;
  authorName: string;
  authorAvatar?: string;
  headline: string;
  content?: string;
  image?: string;
  createdAt: string;
  kind: 'avatar' | 'cover' | 'photo' | 'post';
  liked?: boolean;
  likesCount?: number;
  sharesCount?: number;
  comments?: PostCommentItem[];
  mutedNotifications?: boolean;
  saved?: boolean;
  privacy?: PostPrivacy;
  commentAudience?: CommentAudience;
  taggedPeople?: string[];
  boosted?: boolean;
}

interface PersistedProfileData {
  name?: string;
  coverImage: string;
  avatarImage: string;
  bio: string;
  city: string;
  hometown: string;
  birthday: string;
  education: string;
  interestsText: string;
  isPublicAccount: boolean;
  followersCount: number;
  followingCount: number;
  followersList: FollowerPerson[];
  followingList: FollowerPerson[];
  highlights: Array<{ id: string; title: string; image?: string }>;
  posts: ActivityPostItem[];
}

const VERIFIED_FOUNDER_IDS = new Set<string>([
  '9925c38d-c91d-47b6-9da2-f9042d4142d4',
]);

const VERIFIED_FOUNDER_EMAILS = new Set<string>([
  'abobaker096605@gmail.com',
]);

const SAMPLE_FOLLOWER_NAMES = [
  'أحمد الطيب',
  'محمد عثمان',
  'عمر الفاروق',
  'ياسر حسن',
  'معتز إبراهيم',
  'طارق النور',
  'وليد عبد الله',
  'مازن صلاح',
  'هيثم كمال',
  'أنس محمود',
  'رامي خالد',
  'حاتم مصطفى',
];

function formatCompactCount(num: number): string {
  if (!Number.isFinite(num) || num < 0) return '0';
  if (num >= 1_000_000) {
    const millions = num / 1_000_000;
    const formatted = Number.isInteger(millions)
      ? String(millions)
      : millions.toFixed(1).replace(/\.0$/, '');
    return `${formatted}M`;
  }
  if (num >= 1_000) {
    const thousands = num / 1_000;
    const formatted = Number.isInteger(thousands)
      ? String(thousands)
      : thousands.toFixed(1).replace(/\.0$/, '');
    return `${formatted}K`;
  }
  return String(num);
}

function buildDisplayFollowers(
  customList: FollowerPerson[],
  totalCount: number,
  prefixLabel: string
): FollowerPerson[] {
  const result: FollowerPerson[] = [...customList];
  const targetLength = Math.max(customList.length, Math.min(totalCount, 100));

  let idx = 0;
  while (result.length < targetLength) {
    const sampleName = SAMPLE_FOLLOWER_NAMES[idx % SAMPLE_FOLLOWER_NAMES.length];
    const extraNum = Math.floor(idx / SAMPLE_FOLLOWER_NAMES.length) + 1;
    const displayTitle = extraNum > 1 ? `${sampleName} ${extraNum}` : sampleName;
    result.push({
      id: `${prefixLabel}-auto-${idx}`,
      name: displayTitle,
      handleOrCity: 'شندي · متابع على وِصل',
    });
    idx += 1;
  }

  return result;
}

function isVerifiedFounder(userId?: string | null, email?: string | null): boolean {
  if (userId && typeof userId === 'string' && VERIFIED_FOUNDER_IDS.has(userId.trim())) {
    return true;
  }
  if (
    email &&
    typeof email === 'string' &&
    VERIFIED_FOUNDER_EMAILS.has(email.trim().toLowerCase())
  ) {
    return true;
  }
  return false;
}

function VerifiedBlueBadge({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="حساب موثّق رسمياً"
      className="inline-block shrink-0 align-middle"
    >
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        d="M8.5 12.3L10.8 14.6L15.8 9.6"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DefaultAvatar({
  src,
  alt = 'صورة الملف الشخصي',
  sizeClass = 'h-10 w-10',
  iconSizeClass = 'h-7 w-7',
  className = '',
}: {
  src?: string | null;
  alt?: string;
  sizeClass?: string;
  iconSizeClass?: string;
  className?: string;
}) {
  const cleanSrc = typeof src === 'string' ? src.trim() : '';

  if (cleanSrc) {
    return (
      <img
        src={cleanSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`${sizeClass} shrink-0 rounded-full object-cover border border-cyan-500/25 ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={`${sizeClass} shrink-0 rounded-full bg-slate-800/95 border border-purple-500/25 flex items-center justify-center overflow-hidden select-none shadow-inner ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className={`${iconSizeClass} text-slate-400 translate-y-1`}
      >
        <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2.5c-4.418 0-8 2.239-8 5v1.5c0 .552.448 1 1 1h14c.552 0 1-.448 1-1v-1.5c0-2.761-3.582-5-8-5z" />
      </svg>
    </div>
  );
}

const STORAGE_PREFIX = 'wasl_p5_';
const DB_NAME = 'wasl_profile_db_v6';
const DB_STORE = 'profile_state_by_user';
const MEDIA_BUCKET = 'wasl-media';

const DEFAULT_BIO = 'مطوّر ومحب للتكنولوجيا. أعيش لحظاتي بهدوء.';
const DEFAULT_CITY = 'شندي';
const DEFAULT_HOMETOWN = 'شندي';
const DEFAULT_BIRTHDAY = '٢٠ سبتمبر ٢٠٠٢';
const DEFAULT_EDUCATION = 'كلية التربية - معلمين';
const DEFAULT_INTERESTS = 'PUBG Mobile، Garena Free Fire';
const DEFAULT_FOLLOWERS = 20_000_000;
const DEFAULT_FOLLOWING = 120;

function scopedKey(uid: string, suffix: string): string {
  return `${STORAGE_PREFIX}${uid}_${suffix}`;
}

function openProfileDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveToIndexedDB(uid: string, data: PersistedProfileData): Promise<void> {
  if (!uid) return;
  const db = await openProfileDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(data, uid);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function loadFromIndexedDB(uid: string): Promise<Partial<PersistedProfileData> | null> {
  if (!uid) return null;
  const db = await openProfileDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(uid);
      req.onsuccess = () => resolve((req.result as Partial<PersistedProfileData>) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function loadLocalSnapshot(uid: string): Partial<PersistedProfileData> {
  if (!uid) return {};
  const result: Partial<PersistedProfileData> = {};
  try {
    const savedAvatar = localStorage.getItem(scopedKey(uid, 'avatar'));
    if (savedAvatar) result.avatarImage = savedAvatar;
  } catch {
    // تجاهل
  }
  try {
    const savedCover = localStorage.getItem(scopedKey(uid, 'cover'));
    if (savedCover) result.coverImage = savedCover;
  } catch {
    // تجاهل
  }
  try {
    const metaRaw = localStorage.getItem(scopedKey(uid, 'meta'));
    if (metaRaw) {
      Object.assign(result, JSON.parse(metaRaw));
    }
  } catch {
    // تجاهل
  }
  try {
    const postsRaw = localStorage.getItem(scopedKey(uid, 'posts'));
    if (postsRaw) {
      result.posts = JSON.parse(postsRaw) as ActivityPostItem[];
    }
  } catch {
    // تجاهل
  }
  return result;
}

async function saveAllPersistence(uid: string, data: PersistedProfileData): Promise<void> {
  if (!uid) return;
  const { posts, avatarImage, coverImage, ...metaOnly } = data;
  try {
    localStorage.setItem(scopedKey(uid, 'meta'), JSON.stringify(metaOnly));
  } catch {
    // تجاهل
  }
  try {
    const lightPosts = posts.slice(0, 25).map(({ image, ...rest }) => ({
      ...rest,
      image: image && image.startsWith('data:') ? undefined : image,
    }));
    localStorage.setItem(scopedKey(uid, 'posts'), JSON.stringify(lightPosts));
  } catch {
    // تجاهل
  }
  await saveToIndexedDB(uid, data);
}

function readRawFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

export default function ProfileTab() {
  const store = useAppStore() as Record<string, any>;
  const profile = store.profile || {};
  const friends: Array<Record<string, any>> = Array.isArray(store.friends)
    ? store.friends
    : Array.isArray(store.contacts)
      ? store.contacts
      : [];

  const [currentUid, setCurrentUid] = useState<string>('');
  const [currentEmail, setCurrentEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('مستخدم وِصل');
  const [activeSubTab, setActiveSubTab] = useState<ProfileSectionTab>('all');
  const [coverImage, setCoverImage] = useState<string>('');
  const [avatarImage, setAvatarImage] = useState<string>('');
  const [isPublicAccount, setIsPublicAccount] = useState<boolean>(true);

  const [followersCount, setFollowersCount] = useState<number>(DEFAULT_FOLLOWERS);
  const [followingCount, setFollowingCount] = useState<number>(DEFAULT_FOLLOWING);
  const [followersList, setFollowersList] = useState<FollowerPerson[]>([]);
  const [followingList, setFollowingList] = useState<FollowerPerson[]>([]);

  const [showFollowModal, setShowFollowModal] = useState<boolean>(false);
  const [followModalTab, setFollowModalTab] = useState<FollowModalTab>('followers');
  const [isEditingFollowCounts, setIsEditingFollowCounts] = useState<boolean>(false);
  const [draftFollowers, setDraftFollowers] = useState<string>(String(DEFAULT_FOLLOWERS));
  const [draftFollowing, setDraftFollowing] = useState<string>(String(DEFAULT_FOLLOWING));
  const [newFollowerName, setNewFollowerName] = useState<string>('');

  const [editingDetails, setEditingDetails] = useState(false);
  const [bio, setBio] = useState<string>(DEFAULT_BIO);
  const [city, setCity] = useState<string>(DEFAULT_CITY);
  const [hometown, setHometown] = useState<string>(DEFAULT_HOMETOWN);
  const [birthday, setBirthday] = useState<string>(DEFAULT_BIRTHDAY);
  const [education, setEducation] = useState<string>(DEFAULT_EDUCATION);
  const [interestsText, setInterestsText] = useState<string>(DEFAULT_INTERESTS);

  const [highlights, setHighlights] = useState<Array<{ id: string; title: string; image?: string }>>(
    []
  );

  const [activityPosts, setActivityPosts] = useState<ActivityPostItem[]>([]);
  const [hydratedUid, setHydratedUid] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostText, setEditingPostText] = useState<string>('');
  const [tagModalPostId, setTagModalPostId] = useState<string | null>(null);
  const [tagInputValue, setTagInputValue] = useState<string>('');
  const [audienceModalPostId, setAudienceModalPostId] = useState<string | null>(null);
  const [privacyModalPostId, setPrivacyModalPostId] = useState<string | null>(null);
  const [adModalPostId, setAdModalPostId] = useState<string | null>(null);
  const [adBudgetDays, setAdBudgetDays] = useState<string>('3 أيام · وصول موسّع');

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const highlightInputRef = useRef<HTMLInputElement | null>(null);

  const isFounderAccount = isVerifiedFounder(currentUid, currentEmail);

  const notifyUser = (msg: string) => {
    setStatusMessage(msg);
    window.setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? '' : prev));
    }, 2400);
  };

  const resetLocalViewForNewUser = (
    fallbackTitle: string,
    uid?: string | null,
    email?: string | null
  ) => {
    const founder = isVerifiedFounder(uid, email);
    setDisplayName(fallbackTitle);
    setCoverImage('');
    setAvatarImage('');
    setBio(DEFAULT_BIO);
    setCity(DEFAULT_CITY);
    setHometown(DEFAULT_HOMETOWN);
    setBirthday(DEFAULT_BIRTHDAY);
    setEducation(DEFAULT_EDUCATION);
    setInterestsText(DEFAULT_INTERESTS);
    setIsPublicAccount(true);
    setFollowersCount(founder ? DEFAULT_FOLLOWERS : 0);
    setFollowingCount(founder ? DEFAULT_FOLLOWING : 0);
    setFollowersList([]);
    setFollowingList([]);
    setHighlights([]);
    setActivityPosts([]);
    setEditingDetails(false);
    setOpenCommentsPostId(null);
    setShowFollowModal(false);
    setIsEditingFollowCounts(false);
    setMenuPostId(null);
  };

  useEffect(() => {
    let active = true;

    async function loadForSessionUser(
      uid: string | null,
      email?: string | null,
      meta?: Record<string, any>
    ) {
      if (!active) return;

      if (!uid) {
        setCurrentUid('');
        setCurrentEmail('');
        setHydratedUid('');
        resetLocalViewForNewUser('مستخدم وِصل', null, null);
        return;
      }

      if (currentUid && currentUid !== uid) {
        setHydratedUid('');
      }

      setCurrentUid(uid);
      setCurrentEmail(email || '');

      const founder = isVerifiedFounder(uid, email);
      const fallbackFollowers = founder ? DEFAULT_FOLLOWERS : 0;
      const fallbackFollowing = founder ? DEFAULT_FOLLOWING : 0;

      const metaName =
        typeof meta?.full_name === 'string' && meta.full_name.trim()
          ? meta.full_name.trim()
          : typeof meta?.name === 'string' && meta.name.trim()
            ? meta.name.trim()
            : '';
      const metaAvatar =
        typeof meta?.avatar_url === 'string' && meta.avatar_url.trim()
          ? meta.avatar_url.trim()
          : '';

      const localSnap = loadLocalSnapshot(uid);
      const initialName =
        localSnap.name ||
        metaName ||
        (email ? email.split('@')[0] : '') ||
        (typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : '') ||
        `مستخدم ${uid.slice(0, 6)}`;

      setDisplayName(initialName);
      if (localSnap.avatarImage || metaAvatar) {
        setAvatarImage(localSnap.avatarImage || metaAvatar);
      }
      if (localSnap.coverImage) {
        setCoverImage(localSnap.coverImage);
      }
      if (localSnap.bio) setBio(String(localSnap.bio));
      if (localSnap.city) setCity(String(localSnap.city));
      if (localSnap.hometown) setHometown(String(localSnap.hometown));
      if (localSnap.birthday) setBirthday(String(localSnap.birthday));
      if (localSnap.education) setEducation(String(localSnap.education));
      if (localSnap.interestsText) setInterestsText(String(localSnap.interestsText));
      setFollowersCount(
        typeof localSnap.followersCount === 'number' ? localSnap.followersCount : fallbackFollowers
      );
      setFollowingCount(
        typeof localSnap.followingCount === 'number' ? localSnap.followingCount : fallbackFollowing
      );
      if (Array.isArray(localSnap.followersList)) setFollowersList(localSnap.followersList);
      if (Array.isArray(localSnap.followingList)) setFollowingList(localSnap.followingList);
      if (Array.isArray(localSnap.highlights)) setHighlights(localSnap.highlights);
      if (Array.isArray(localSnap.posts)) setActivityPosts(localSnap.posts);

      const dbData = await loadFromIndexedDB(uid);
      if (!active) return;

      if (dbData) {
        if (dbData.name) setDisplayName(dbData.name);
        if (dbData.avatarImage) setAvatarImage(dbData.avatarImage);
        if (dbData.coverImage) setCoverImage(dbData.coverImage);
        if (dbData.bio) setBio(String(dbData.bio));
        if (dbData.city) setCity(String(dbData.city));
        if (dbData.hometown) setHometown(String(dbData.hometown));
        if (dbData.birthday) setBirthday(String(dbData.birthday));
        if (dbData.education) setEducation(String(dbData.education));
        if (dbData.interestsText) setInterestsText(String(dbData.interestsText));
        if (typeof dbData.followersCount === 'number') setFollowersCount(dbData.followersCount);
        if (typeof dbData.followingCount === 'number') setFollowingCount(dbData.followingCount);
        if (Array.isArray(dbData.followersList)) setFollowersList(dbData.followersList);
        if (Array.isArray(dbData.followingList)) setFollowingList(dbData.followingList);
        if (typeof dbData.isPublicAccount === 'boolean') {
          setIsPublicAccount(dbData.isPublicAccount);
        }
        if (Array.isArray(dbData.highlights) && dbData.highlights.length > 0) {
          setHighlights(dbData.highlights);
        }
        if (Array.isArray(dbData.posts) && dbData.posts.length > 0) {
          setActivityPosts(dbData.posts);
        }
      }

      try {
        const { data: remoteProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .maybeSingle();

        if (!active) return;

        let resolvedName = initialName;
        if (remoteProfile) {
          if (typeof remoteProfile.full_name === 'string' && remoteProfile.full_name.trim()) {
            resolvedName = remoteProfile.full_name.trim();
            setDisplayName(resolvedName);
          }
          if (remoteProfile.avatar_url) setAvatarImage(String(remoteProfile.avatar_url));
          if (remoteProfile.cover_url) setCoverImage(String(remoteProfile.cover_url));
          if (remoteProfile.bio) setBio(String(remoteProfile.bio));
          if (remoteProfile.city) setCity(String(remoteProfile.city));
          if (remoteProfile.hometown) setHometown(String(remoteProfile.hometown));
          if (remoteProfile.birthday) setBirthday(String(remoteProfile.birthday));
          if (remoteProfile.education) setEducation(String(remoteProfile.education));
        }

        const { data: supaPosts, error } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!active) return;

        if (!error && Array.isArray(supaPosts) && supaPosts.length > 0) {
          const mappedRemote: ActivityPostItem[] = supaPosts.map((row: Record<string, any>) => {
            const kindVal: ActivityPostItem['kind'] =
              row.kind === 'avatar' ||
              row.kind === 'cover' ||
              row.kind === 'photo' ||
              row.kind === 'post'
                ? row.kind
                : row.image_url
                  ? 'photo'
                  : 'post';

            return {
              id: `supa-${String(row.id)}`,
              dbId: String(row.id),
              authorName: String(row.author_name || resolvedName),
              headline:
                String(row.headline || '') ||
                (kindVal === 'avatar'
                  ? `قام ${row.author_name || resolvedName} بتحديث صورة ملفه الشخصي`
                  : kindVal === 'cover'
                    ? `قام ${row.author_name || resolvedName} بتحديث صورة الغلاف`
                    : kindVal === 'photo'
                      ? `نشر ${row.author_name || resolvedName} صورة`
                      : `نشر ${row.author_name || resolvedName}`),
              content: row.content ? String(row.content) : undefined,
              image: row.image_url ? String(row.image_url) : undefined,
              createdAt: row.created_at
                ? new Date(String(row.created_at)).toLocaleDateString('ar')
                : 'الآن',
              kind: kindVal,
              liked: false,
              likesCount: 0,
              sharesCount: 0,
              comments: [],
              privacy: 'public',
              commentAudience: 'everyone',
              taggedPeople: [],
            };
          });

          setActivityPosts((prev) => {
            const existingDbIds = new Set(prev.map((p) => p.dbId).filter(Boolean));
            const existingIds = new Set(prev.map((p) => p.id));
            const uniqueRemote = mappedRemote.filter(
              (r) => !existingDbIds.has(r.dbId) && !existingIds.has(r.id)
            );
            return [...prev, ...uniqueRemote];
          });
        }
      } catch {
        // يظل الحفظ المحلي الخاص بالمستخدم شغالاً
      }

      if (active) {
        setHydratedUid(uid);
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      void loadForSessionUser(u?.id ?? null, u?.email, u?.user_metadata);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const u = nextSession?.user;
      void loadForSessionUser(u?.id ?? null, u?.email, u?.user_metadata);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUid || hydratedUid !== currentUid) return;
    const timer = window.setTimeout(() => {
      void saveAllPersistence(currentUid, {
        name: displayName,
        coverImage,
        avatarImage,
        bio,
        city,
        hometown,
        birthday,
        education,
        interestsText,
        isPublicAccount,
        followersCount,
        followingCount,
        followersList,
        followingList,
        highlights,
        posts: activityPosts,
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    currentUid,
    hydratedUid,
    displayName,
    coverImage,
    avatarImage,
    bio,
    city,
    hometown,
    birthday,
    education,
    interestsText,
    isPublicAccount,
    followersCount,
    followingCount,
    followersList,
    followingList,
    highlights,
    activityPosts,
  ]);

  async function syncProfileToSupabase(overrides?: {
    avatar_url?: string;
    cover_url?: string;
    bio?: string;
    city?: string;
    hometown?: string;
    birthday?: string;
    education?: string;
  }): Promise<void> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id || currentUid;
      if (!userId) return;

      await supabase.from('profiles').upsert(
        {
          id: userId,
          full_name: displayName,
          avatar_url: overrides?.avatar_url !== undefined ? overrides.avatar_url : avatarImage || null,
          cover_url: overrides?.cover_url !== undefined ? overrides.cover_url : coverImage || null,
          bio: overrides?.bio !== undefined ? overrides.bio : bio,
          city: overrides?.city !== undefined ? overrides.city : city,
          hometown: overrides?.hometown !== undefined ? overrides.hometown : hometown,
          birthday: overrides?.birthday !== undefined ? overrides.birthday : birthday,
          education: overrides?.education !== undefined ? overrides.education : education,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch {
      // يظل الحفظ المحلي الخاص بالمستخدم شغالاً
    }
  }

  async function uploadToWaslMedia(file: File, fallbackDataUrl: string): Promise<string> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id || currentUid;
      if (!uid) return fallbackDataUrl;
      const safeExt = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
      const filePath = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${safeExt || 'jpg'}`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        return fallbackDataUrl;
      }

      const { data: publicData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
      return publicData?.publicUrl || fallbackDataUrl;
    } catch {
      return fallbackDataUrl;
    }
  }

  async function persistPostToSupabase(item: ActivityPostItem): Promise<void> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id ?? (currentUid || null);
      if (!userId) return;

      const { data: inserted, error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          author_name: item.authorName,
          headline: item.headline,
          content: item.content || null,
          image_url: item.image || null,
          kind: item.kind,
        })
        .select()
        .single();

      if (!error && inserted?.id) {
        setActivityPosts((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, dbId: String(inserted.id) } : p))
        );
      }
    } catch {
      // يظل محفوظاً محلياً ضمن مساحة المستخدم
    }
  }

  const photoPosts = activityPosts.filter((p) => Boolean(p.image));
  const interestsList = interestsText
    .split(/[,،\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const openFollowListModal = (tab: FollowModalTab) => {
    setFollowModalTab(tab);
    setDraftFollowers(String(followersCount));
    setDraftFollowing(String(followingCount));
    setIsEditingFollowCounts(false);
    setNewFollowerName('');
    setShowFollowModal(true);
  };

  const handleSaveFollowCounts = (e: React.FormEvent) => {
    e.preventDefault();
    const nextFollowers = Math.max(0, Number.parseInt(draftFollowers, 10) || 0);
    const nextFollowing = Math.max(0, Number.parseInt(draftFollowing, 10) || 0);
    setFollowersCount(nextFollowers);
    setFollowingCount(nextFollowing);
    setIsEditingFollowCounts(false);
    notifyUser('تم تحديث أعداد المتابعين');
    if (typeof store.updateProfile === 'function') {
      store.updateProfile({
        followersCount: nextFollowers,
        followingCount: nextFollowing,
      });
    }
  };

  const handleAddPersonToList = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFollowerName.trim();
    if (!cleanName) return;

    const person: FollowerPerson = {
      id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      handleOrCity: city || 'شندي',
    };

    if (followModalTab === 'followers') {
      setFollowersList((prev) => [person, ...prev]);
      setFollowersCount((prev) => prev + 1);
      setDraftFollowers((prev) => String((Number.parseInt(prev, 10) || 0) + 1));
    } else {
      setFollowingList((prev) => [person, ...prev]);
      setFollowingCount((prev) => prev + 1);
      setDraftFollowing((prev) => String((Number.parseInt(prev, 10) || 0) + 1));
    }
    setNewFollowerName('');
  };

  const displayedFollowPeople =
    followModalTab === 'followers'
      ? buildDisplayFollowers(followersList, followersCount, 'follower')
      : buildDisplayFollowers(followingList, followingCount, 'following');

  const handlePickImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoaded: (imageUrl: string, fileName: string, file: File) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rawDataUrl = await readRawFileAsDataUrl(file);
    if (!rawDataUrl) return;
    onLoaded(rawDataUrl, file.name, file);
    notifyUser('تم تحديث الصورة');
    e.target.value = '';
  };

  const pushActivityPost = (item: ActivityPostItem): void => {
    const fullItem: ActivityPostItem = {
      ...item,
      liked: false,
      likesCount: 0,
      sharesCount: 0,
      comments: [],
      mutedNotifications: false,
      saved: false,
      privacy: 'public',
      commentAudience: 'everyone',
      taggedPeople: [],
      boosted: false,
    };
    setActivityPosts((prev) => [fullItem, ...prev]);

    void persistPostToSupabase(fullItem);

    if (typeof store.addPost === 'function') {
      store.addPost({
        id: fullItem.id,
        authorName: fullItem.authorName,
        authorAvatar: fullItem.authorAvatar,
        content: fullItem.content ? `${fullItem.headline} — ${fullItem.content}` : fullItem.headline,
        image: fullItem.image,
        createdAt: fullItem.createdAt,
      });
    }
  };

  const handleCoverChange = (imageUrl: string, file?: File): void => {
    setCoverImage(imageUrl);
    if (typeof store.updateProfile === 'function') {
      store.updateProfile({ coverImage: imageUrl, cover: imageUrl });
    }
    const postId = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    pushActivityPost({
      id: postId,
      authorName: displayName,
      authorAvatar: avatarImage || undefined,
      headline: `قام ${displayName} بتحديث صورة الغلاف`,
      image: imageUrl,
      createdAt: 'الآن',
      kind: 'cover',
    });

    void (async () => {
      const finalUrl = file ? await uploadToWaslMedia(file, imageUrl) : imageUrl;
      if (finalUrl !== imageUrl) {
        setCoverImage(finalUrl);
        setActivityPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, image: finalUrl } : p))
        );
      }
      await syncProfileToSupabase({ cover_url: finalUrl });
    })();
  };

  const handleAvatarChange = (imageUrl: string, file?: File): void => {
    setAvatarImage(imageUrl);
    if (typeof store.updateProfile === 'function') {
      store.updateProfile({ avatar: imageUrl });
    }
    const postId = `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    pushActivityPost({
      id: postId,
      authorName: displayName,
      authorAvatar: imageUrl,
      headline: `قام ${displayName} بتحديث صورة ملفه الشخصي`,
      image: imageUrl,
      createdAt: 'الآن',
      kind: 'avatar',
    });

    void (async () => {
      const finalUrl = file ? await uploadToWaslMedia(file, imageUrl) : imageUrl;
      if (finalUrl !== imageUrl) {
        setAvatarImage(finalUrl);
        setActivityPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, image: finalUrl, authorAvatar: finalUrl } : p))
        );
      }
      await syncProfileToSupabase({ avatar_url: finalUrl });
    })();
  };

  const handleAddHighlight = (imageUrl: string, fileName: string): void => {
    const cleanTitle = fileName.replace(/\.[^/.]+$/, '').slice(0, 18) || 'قصة بارزة';
    setHighlights((prev) => [
      ...prev,
      {
        id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: cleanTitle,
        image: imageUrl,
      },
    ]);
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setEditingDetails(false);
    if (typeof store.updateProfile === 'function') {
      store.updateProfile({
        bio: bio.trim(),
        city: city.trim(),
        hometown: hometown.trim(),
        birthday: birthday.trim(),
        education: education.trim(),
        interests: interestsList,
        isPublic: isPublicAccount,
      });
    }
    void syncProfileToSupabase({
      bio: bio.trim(),
      city: city.trim(),
      hometown: hometown.trim(),
      birthday: birthday.trim(),
      education: education.trim(),
    });
  };

  const handleToggleLike = (postId: string) => {
    setActivityPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextLiked = !p.liked;
        const currentCount = p.likesCount || 0;
        return {
          ...p,
          liked: nextLiked,
          likesCount: nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1),
        };
      })
    );
  };

  const handleAddComment = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const targetPost = activityPosts.find((p) => p.id === postId);
    if (targetPost?.commentAudience === 'off') {
      notifyUser('التعليقات متوقفة لهذا المنشور');
      return;
    }

    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    const newComment: PostCommentItem = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: displayName,
      text,
      createdAt: 'الآن',
    };

    setActivityPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [...(p.comments || []), newComment],
            }
          : p
      )
    );
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
  };

  const handleSharePost = async (post: ActivityPostItem) => {
    setActivityPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              sharesCount: (p.sharesCount || 0) + 1,
            }
          : p
      )
    );

    const shareText = `${post.headline}${post.content ? ` — ${post.content}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.headline,
          text: shareText,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        notifyUser('تم نسخ نص المنشور للمشاركة');
      }
    } catch {
      // تجاهل إلغاء المشاركة من المتصفح
    }
  };

  const handleDeletePost = (postId: string) => {
    const target = activityPosts.find((p) => p.id === postId);
    setActivityPosts((prev) => prev.filter((p) => p.id !== postId));
    setMenuPostId(null);

    if (target?.dbId) {
      void supabase.from('posts').delete().eq('id', target.dbId);
    }
    notifyUser('تم حذف المنشور');
  };

  const handleTogglePostNotifications = (post: ActivityPostItem) => {
    const nextMuted = !post.mutedNotifications;
    setActivityPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, mutedNotifications: nextMuted } : p))
    );
    setMenuPostId(null);
    notifyUser(
      nextMuted
        ? 'تم إيقاف تشغيل الإشعارات لهذا المنشور'
        : 'تم تفعيل الإشعارات لهذا المنشور'
    );
  };

  const handleToggleSavePost = (post: ActivityPostItem) => {
    const nextSaved = !post.saved;
    setActivityPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, saved: nextSaved } : p))
    );
    setMenuPostId(null);
    notifyUser(
      nextSaved
        ? 'تم حفظ المنشور في العناصر المحفوظة'
        : 'تمت إزالة المنشور من المحفوظات'
    );
  };

  const handleCopyPostLink = async (post: ActivityPostItem) => {
    const postUrl = `${window.location.origin}/post/${encodeURIComponent(post.id)}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(postUrl);
      }
    } catch {
      // تجاهل
    }
    setMenuPostId(null);
    notifyUser('تم نسخ رابط المنشور');
  };

  const handleOpenEditPost = (post: ActivityPostItem) => {
    setEditingPostId(post.id);
    setEditingPostText(post.content || post.headline);
    setMenuPostId(null);
  };

  const handleConfirmEditPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPostId) return;
    const clean = editingPostText.trim();
    setActivityPosts((prev) =>
      prev.map((p) => (p.id === editingPostId ? { ...p, content: clean } : p))
    );
    setEditingPostId(null);
    setEditingPostText('');
    notifyUser('تم تحديث المنشور');
  };

  const handleAddTagToPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagModalPostId) return;
    const name = tagInputValue.trim();
    if (!name) return;

    setActivityPosts((prev) =>
      prev.map((p) =>
        p.id === tagModalPostId
          ? {
              ...p,
              taggedPeople: Array.from(new Set([...(p.taggedPeople || []), name])),
            }
          : p
      )
    );
    setTagInputValue('');
    setTagModalPostId(null);
    notifyUser(`تمت الإشارة إلى ${name}`);
  };

  const handleSelectCommentAudience = (audience: CommentAudience) => {
    if (!audienceModalPostId) return;
    setActivityPosts((prev) =>
      prev.map((p) => (p.id === audienceModalPostId ? { ...p, commentAudience: audience } : p))
    );
    setAudienceModalPostId(null);
    notifyUser('تم تحديث إعدادات التعليق على المنشور');
  };

  const handleSelectPrivacy = (privacy: PostPrivacy) => {
    if (!privacyModalPostId) return;
    setActivityPosts((prev) =>
      prev.map((p) => (p.id === privacyModalPostId ? { ...p, privacy } : p))
    );
    setPrivacyModalPostId(null);
    notifyUser('تم تحديث خصوصية المنشور');
  };

  const handleConfirmBoostAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adModalPostId) return;
    setActivityPosts((prev) =>
      prev.map((p) => (p.id === adModalPostId ? { ...p, boosted: true } : p))
    );
    setAdModalPostId(null);
    notifyUser('تم تفعيل الإعلان الترويجي للمنشور');
  };

  const activeMenuPost = activityPosts.find((p) => p.id === menuPostId) || null;

  const renderPrivacyIcon = (privacy?: PostPrivacy) => {
    if (privacy === 'only_me') return <Lock size={11} className="text-amber-400" />;
    if (privacy === 'friends') return <Users size={11} className="text-purple-400" />;
    return <Globe size={11} className="text-slate-400" />;
  };

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-4 pb-8 text-slate-100">
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={(e) =>
          void handlePickImage(e, (url, _name, file) => handleCoverChange(url, file))
        }
        className="hidden"
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={(e) =>
          void handlePickImage(e, (url, _name, file) => handleAvatarChange(url, file))
        }
        className="hidden"
      />
      <input
        ref={highlightInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => void handlePickImage(e, (url, name) => handleAddHighlight(url, name))}
        className="hidden"
      />

      {statusMessage && (
        <div className="rounded-xl border border-cyan-500/35 bg-cyan-950/50 px-3.5 py-2 text-center text-xs font-bold text-cyan-300">
          {statusMessage}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-purple-500/20 bg-slate-900/80 shadow-xl">
        <div className="relative h-44 w-full bg-gradient-to-l from-purple-700/60 via-slate-800 to-cyan-600/50">
          {coverImage && (
            <img
              src={coverImage}
              alt="غلاف الملف الشخصي"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />

          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-xl bg-slate-950/85 border border-slate-700/80 px-3 py-1.5 text-[11px] font-bold text-white hover:border-cyan-400/50 transition"
          >
            <Camera size={14} className="text-cyan-400" />
            <span>تعديل الغلاف</span>
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="-mt-14 mb-3 flex items-end justify-between">
            <div className="relative">
              <DefaultAvatar
                src={avatarImage}
                alt={displayName}
                sizeClass="h-28 w-28"
                iconSizeClass="h-20 w-20"
                className="border-4 border-slate-900 shadow-lg"
              />

              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                title="تغيير صورة الملف الشخصي"
                aria-label="تغيير صورة الملف الشخصي"
                className="absolute bottom-1 left-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 border border-cyan-500/40 text-cyan-300 shadow hover:bg-slate-800 transition"
              >
                <Camera size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setEditingDetails((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-slate-950/80 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-slate-800 transition"
            >
              <Edit3 size={14} />
              <span>{editingDetails ? 'إغلاق التعديل' : 'تعديل الملف'}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <h1 className="flex items-center gap-1.5 text-xl font-black text-white">
              <span>{displayName}</span>
              {isFounderAccount && <VerifiedBlueBadge size={19} />}
            </h1>

            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
              <button
                type="button"
                onClick={() => openFollowListModal('followers')}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-950/80 border border-slate-800 px-2.5 py-1 font-bold text-slate-200 hover:border-cyan-500/40 transition"
              >
                <UserPlus size={13} className="text-cyan-400" />
                <span>المتابعون</span>
                <strong className="text-cyan-300">{formatCompactCount(followersCount)}</strong>
              </button>

              <button
                type="button"
                onClick={() => openFollowListModal('following')}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-950/80 border border-slate-800 px-2.5 py-1 font-bold text-slate-200 hover:border-cyan-500/40 transition"
              >
                <span>يتابع</span>
                <strong className="text-cyan-300">{formatCompactCount(followingCount)}</strong>
              </button>

              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-950/60 border border-slate-800/80 px-2.5 py-1 font-bold text-slate-300">
                <strong className="text-white">{activityPosts.length}</strong>
                <span>منشورات</span>
              </span>
            </div>

            <p className="pt-0.5 text-xs leading-relaxed text-slate-300">{bio}</p>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 py-2.5 text-xs font-bold text-white shadow hover:opacity-95 transition"
            >
              <Camera size={15} />
              <span>تغيير الصورة الشخصية</span>
            </button>

            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 text-xs font-bold text-slate-200 hover:border-cyan-500/40 transition"
            >
              <ImageIcon size={15} className="text-cyan-400" />
              <span>تغيير صورة الغلاف</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-slate-800 bg-slate-950/75 py-2.5 px-2 text-center">
              <p className="text-sm font-black text-cyan-400">{friends.length}</p>
              <p className="text-[11px] font-semibold text-slate-400">أصدقاء</p>
            </div>
            <button
              type="button"
              onClick={() => openFollowListModal('followers')}
              className="rounded-xl border border-slate-800 bg-slate-950/75 py-2.5 px-2 text-center hover:border-cyan-500/40 transition"
            >
              <p className="text-sm font-black text-cyan-400">
                {formatCompactCount(followersCount)}
              </p>
              <p className="text-[11px] font-semibold text-slate-400">المتابعون</p>
            </button>
            <div className="rounded-xl border border-slate-800 bg-slate-950/75 py-2.5 px-2 text-center">
              <p className="text-sm font-black text-cyan-400">{activityPosts.length}</p>
              <p className="text-[11px] font-semibold text-slate-400">منشورات</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-slate-800 bg-slate-950/60">
          {(
            [
              { id: 'all', label: 'الكل' },
              { id: 'photos', label: 'الصور' },
              { id: 'about', label: 'التفاصيل' },
            ] as { id: ProfileSectionTab; label: string }[]
          ).map((item) => {
            const active = activeSubTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSubTab(item.id)}
                className={`relative py-2.5 text-xs font-bold transition ${
                  active ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute bottom-0 inset-x-4 h-0.5 rounded-full bg-gradient-to-l from-cyan-400 to-purple-500" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {showFollowModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setShowFollowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-[75vh] max-h-[600px] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFollowModalTab('followers')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    followModalTab === 'followers'
                      ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  المتابعون ({formatCompactCount(followersCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setFollowModalTab('following')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    followModalTab === 'following'
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  يتابع ({formatCompactCount(followingCount)})
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingFollowCounts((prev) => !prev)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:border-cyan-500/40"
                >
                  {isEditingFollowCounts ? 'إخفاء الضبط' : 'ضبط الرقم'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFollowModal(false)}
                  aria-label="إغلاق"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {isEditingFollowCounts && (
              <form
                onSubmit={handleSaveFollowCounts}
                className="border-b border-slate-800 bg-slate-950/70 p-3.5 space-y-2.5"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">عدد المتابعون</label>
                    <input
                      type="number"
                      min={0}
                      value={draftFollowers}
                      onChange={(e) => setDraftFollowers(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">عدد يتابع</label>
                    <input
                      type="number"
                      min={0}
                      value={draftFollowing}
                      onChange={(e) => setDraftFollowing(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500/40 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 py-1.5 text-xs font-bold text-white"
                >
                  حفظ الرقم
                </button>
              </form>
            )}

            <form
              onSubmit={handleAddPersonToList}
              className="flex items-center gap-2 border-b border-slate-800/80 p-3"
            >
              <input
                type="text"
                value={newFollowerName}
                onChange={(e) => setNewFollowerName(e.target.value)}
                placeholder={
                  followModalTab === 'followers'
                    ? 'إضافة اسم متابع للقائمة...'
                    : 'إضافة اسم حساب تتابعه...'
                }
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition"
              >
                إضافة
              </button>
            </form>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70 p-2">
              {displayedFollowPeople.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  لا يوجد أشخاص في هذه القائمة حالياً.
                </p>
              ) : (
                displayedFollowPeople.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 hover:bg-slate-800/50 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <DefaultAvatar
                        src={person.avatar}
                        alt={person.name}
                        sizeClass="h-10 w-10"
                        iconSizeClass="h-7 w-7"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">{person.name}</p>
                        <p className="truncate text-[11px] text-slate-400">{person.handleOrCity}</p>
                      </div>
                    </div>

                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 text-[11px] font-bold text-cyan-300">
                      <UserCheck size={12} />
                      <span>{followModalTab === 'followers' ? 'يتابعك' : 'متابَع'}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeMenuPost && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
          onClick={() => setMenuPostId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-700/80 bg-slate-900 p-3 pb-5 shadow-2xl space-y-1"
          >
            <div className="mx-auto mb-2 h-1.5 w-11 rounded-full bg-slate-700" />

            <button
              type="button"
              onClick={() => handleTogglePostNotifications(activeMenuPost)}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-right text-xs font-bold text-slate-100 hover:bg-slate-800/80 transition"
            >
              <span>
                {activeMenuPost.mutedNotifications
                  ? 'تشغيل الإشعارات لهذا المنشور'
                  : 'إيقاف تشغيل الإشعارات لهذا المنشور'}
              </span>
              {activeMenuPost.mutedNotifications ? (
                <Bell size={18} className="text-cyan-400 shrink-0" />
              ) : (
                <BellOff size={18} className="text-slate-300 shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleToggleSavePost(activeMenuPost)}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-right hover:bg-slate-800/80 transition"
            >
              <div className="text-right">
                <p className="text-xs font-bold text-slate-100">
                  {activeMenuPost.saved ? 'إزالة المنشور من المحفوظات' : 'حفظ المنشور'}
                </p>
                <p className="text-[11px] text-slate-400">
                  أضف هذا العنصر إلى العناصر المحفوظة لديك.
                </p>
              </div>
              <Bookmark
                size={18}
                className={
                  activeMenuPost.saved
                    ? 'fill-cyan-400 text-cyan-400 shrink-0'
                    : 'text-slate-300 shrink-0'
                }
              />
            </button>

            <button
              type="button"
              onClick={() => {
                const target = activeMenuPost;
                setMenuPostId(null);
                void handleSharePost(target);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-right text-xs font-bold text-slate-100 hover:bg-slate-800/80 transition"
            >
              <span>مشاركة</span>
              <Share2 size={18} className="text-slate-300 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                setAudienceModalPostId(activeMenuPost.id);
                setMenuPostId(null);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-right text-xs font-bold text-slate-100 hover:bg-slate-800/80 transition"
            >
              <span>من الذي يمكنه التعليق على منشورك؟</span>
              <MessageSquare size={18} className="text-slate-300 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                setTagModalPostId(activeMenuPost.id);
                setTagInputValue('');
                setMenuPostId(null);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-right text-xs font-bold text-slate-100 hover:bg-slate-800/80 transition"
            >
              <span>إشارة في صورة</span>
              <Tag size={18} className="text-slate-300 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                setPrivacyModalPostId(activeMenuPost.id);
                setMenuPostId(null);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-right text-xs font-bold text-slate-100 hover:bg-slate-800/80 transition"
            >
              <span>تعديل الخصوصية</span>
              <Globe size={18} className="text-slate-300 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                setAdModalPostId(activeMenuPost.id);
                setMenuPostId(null);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-right text-xs font-bold text-slate-100 hover:bg-slate-800/80 transition"
            >
              <span>إنشاء إعلان</span>
              <Megaphone size={18} className="text-slate-300 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleOpenEditPost(activeMenuPost)}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-right text-xs font-bold text-slate-100 hover:bg-slate-800/80 transition"
            >
              <span>تعديل المنشور</span>
              <Pencil size={18} className="text-slate-300 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => void handleCopyPostLink(activeMenuPost)}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-right text-xs font-bold text-slate-100 hover:bg-slate-800/80 transition"
            >
              <span>نسخ الرابط</span>
              <Link2 size={18} className="text-slate-300 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleDeletePost(activeMenuPost.id)}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-right text-xs font-bold text-rose-400 hover:bg-rose-950/35 transition"
            >
              <span>حذف المنشور</span>
              <Trash2 size={18} className="text-rose-400 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {editingPostId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setEditingPostId(null)}
        >
          <form
            onSubmit={handleConfirmEditPost}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-slate-900 p-4 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">تعديل المنشور</h3>
              <button
                type="button"
                onClick={() => setEditingPostId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              rows={4}
              value={editingPostText}
              onChange={(e) => setEditingPostText(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-cyan-500/40 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingPostId(null)}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 py-2 text-xs font-bold text-slate-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 py-2 text-xs font-bold text-white"
              >
                حفظ التعديل
              </button>
            </div>
          </form>
        </div>
      )}

      {tagModalPostId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setTagModalPostId(null)}
        >
          <form
            onSubmit={handleAddTagToPost}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-900 p-4 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">إشارة في صورة</h3>
              <button
                type="button"
                onClick={() => setTagModalPostId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={tagInputValue}
              onChange={(e) => setTagInputValue(e.target.value)}
              placeholder="اكتب اسم الشخص للإشارة إليه..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500/40 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 py-2 text-xs font-bold text-white"
            >
              إضافة إشارة
            </button>
          </form>
        </div>
      )}

      {audienceModalPostId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setAudienceModalPostId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-900 p-4 space-y-2 shadow-2xl"
          >
            <h3 className="text-sm font-black text-white mb-2">
              من الذي يمكنه التعليق على منشورك؟
            </h3>
            {(
              [
                { id: 'everyone', label: 'الكل' },
                { id: 'friends', label: 'الأصدقاء' },
                { id: 'followers', label: 'المتابِعون' },
                { id: 'off', label: 'إيقاف التعليقات' },
              ] as { id: CommentAudience; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectCommentAudience(opt.id)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:border-cyan-500/40"
              >
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {privacyModalPostId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setPrivacyModalPostId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-900 p-4 space-y-2 shadow-2xl"
          >
            <h3 className="text-sm font-black text-white mb-2">تعديل الخصوصية</h3>
            {(
              [
                { id: 'public', label: 'عام — أي شخص على وِصل' },
                { id: 'friends', label: 'الأصدقاء فقط' },
                { id: 'only_me', label: 'أنا فقط' },
              ] as { id: PostPrivacy; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectPrivacy(opt.id)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:border-cyan-500/40"
              >
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {adModalPostId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setAdModalPostId(null)}
        >
          <form
            onSubmit={handleConfirmBoostAd}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-900 p-4 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">إنشاء إعلان للمنشور</h3>
              <button
                type="button"
                onClick={() => setAdModalPostId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <select
              value={adBudgetDays}
              onChange={(e) => setAdBudgetDays(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500/40 focus:outline-none"
            >
              <option value="3 أيام · وصول موسّع">3 أيام · وصول موسّع</option>
              <option value="7 أيام · تفاعل أعلى">7 أيام · تفاعل أعلى</option>
              <option value="14 يوم · حملة كاملة">14 يوم · حملة كاملة</option>
            </select>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 py-2 text-xs font-bold text-white"
            >
              تشغيل الإعلان الآن
            </button>
          </form>
        </div>
      )}

      {editingDetails && (
        <form
          onSubmit={handleSaveDetails}
          className="rounded-2xl border border-cyan-500/25 bg-slate-900/90 p-4 space-y-3"
        >
          <h2 className="text-sm font-black text-white">تعديل التفاصيل الشخصية</h2>

          <div>
            <label className="mb-1 block text-[11px] text-slate-400">النبذة التعريفية</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500/40 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">المقيم في</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500/40 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-slate-400">المسقط / المدينة</label>
              <input
                type="text"
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500/40 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-slate-400">تاريخ الميلاد</label>
              <input
                type="text"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500/40 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-slate-400">التعليم</label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-slate-400">
              الاهتمامات (افصل بينها بفاصلة)
            </label>
            <input
              type="text"
              value={interestsText}
              onChange={(e) => setInterestsText(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500/40 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingDetails(false)}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 py-2 text-xs font-bold text-slate-300"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 py-2 text-xs font-bold text-white"
            >
              حفظ التغييرات
            </button>
          </div>
        </form>
      )}

      {(activeSubTab === 'all' || activeSubTab === 'about') && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-white">التفاصيل الشخصية</h2>
            <button
              type="button"
              onClick={() => setEditingDetails(true)}
              className="text-[11px] font-bold text-cyan-400 hover:underline"
            >
              تعديل
            </button>
          </div>

          <div className="space-y-2.5 text-xs text-slate-300">
            {city && (
              <div className="flex items-center gap-2.5">
                <MapPin size={15} className="text-cyan-400 shrink-0" />
                <span>يقيم في {city}</span>
              </div>
            )}
            {hometown && (
              <div className="flex items-center gap-2.5">
                <Home size={15} className="text-purple-400 shrink-0" />
                <span>من {hometown}</span>
              </div>
            )}
            {birthday && (
              <div className="flex items-center gap-2.5">
                <Cake size={15} className="text-cyan-400 shrink-0" />
                <span>{birthday}</span>
              </div>
            )}
            {education && (
              <div className="flex items-center gap-2.5">
                <GraduationCap size={15} className="text-purple-400 shrink-0" />
                <span>درس في {education}</span>
              </div>
            )}
          </div>

          {interestsList.length > 0 && (
            <div className="border-t border-slate-800/80 pt-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Gamepad2 size={15} className="text-cyan-400" />
                <span>الاهتمامات</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {interestsList.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-xl border border-purple-500/25 bg-slate-950/80 px-3 py-1 text-[11px] font-bold text-cyan-300"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeSubTab === 'all' && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-white">أبرز القصص</h2>
            <span className="text-[11px] text-slate-400">{highlights.length}</span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => highlightInputRef.current?.click()}
              className="flex h-36 w-24 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-500/40 bg-slate-950/80 p-2 text-center hover:border-cyan-400 transition"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300">
                <Plus size={18} />
              </span>
              <span className="text-[11px] font-bold text-slate-200 leading-tight">
                قصة بارزة جديدة
              </span>
            </button>

            {highlights.map((hl) => (
              <div
                key={hl.id}
                className="relative flex h-36 w-24 shrink-0 flex-col justify-end overflow-hidden rounded-2xl border border-purple-500/25 bg-slate-950"
              >
                {hl.image && (
                  <img
                    src={hl.image}
                    alt={hl.title}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                <span className="relative z-10 truncate p-2 text-[11px] font-bold text-white">
                  {hl.title}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeSubTab === 'all' && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users size={16} className="text-cyan-400" />
              <h2 className="text-sm font-black text-white">الأصدقاء</h2>
            </div>
            <span className="text-xs font-bold text-cyan-400">{friends.length}</span>
          </div>

          {friends.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-500">لا يوجد أصدقاء مضافون بعد.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {friends.slice(0, 6).map((friend, idx) => {
                const fName = String(friend.name || friend.full_name || `صديق ${idx + 1}`);
                return (
                  <div
                    key={String(friend.id || idx)}
                    className="rounded-xl border border-slate-800 bg-slate-950/75 p-2 text-center space-y-1.5"
                  >
                    {friend.avatar ? (
                      <img
                        src={String(friend.avatar)}
                        alt={fName}
                        loading="lazy"
                        decoding="async"
                        className="mx-auto h-16 w-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-slate-800/95 border border-purple-500/25">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                          className="h-10 w-10 text-slate-400 translate-y-1"
                        >
                          <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2.5c-4.418 0-8 2.239-8 5v1.5c0 .552.448 1 1 1h14c.552 0 1-.448 1-1v-1.5c0-2.761-3.582-5-8-5z" />
                        </svg
