import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  MapPin,
  Home,
  Cake,
  GraduationCap,
  Gamepad2,
  AtSign,
  Phone,
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
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';

type ProfileSectionTab = 'all' | 'photos' | 'about';

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
  authorHandle?: string;
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
}

interface PersistedProfileData {
  coverImage: string;
  avatarImage: string;
  bio: string;
  city: string;
  hometown: string;
  birthday: string;
  education: string;
  interestsText: string;
  isPublicAccount: boolean;
  highlights: Array<{ id: string; title: string; image?: string }>;
  posts: ActivityPostItem[];
}

const META_STORAGE_KEY = 'wasl_profile_meta_v3';
const POSTS_STORAGE_KEY = 'wasl_profile_posts_v3';
const DB_NAME = 'wasl_profile_db_v1';
const DB_STORE = 'profile_state';
const MEDIA_BUCKET = 'wasl-media';

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

async function saveToIndexedDB(data: PersistedProfileData) {
  const db = await openProfileDB();
  if (!db) return;
  try {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(data, 'main');
  } catch {
    // تجاهل
  }
}

async function loadFromIndexedDB(): Promise<Partial<PersistedProfileData> | null> {
  const db = await openProfileDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get('main');
      req.onsuccess = () => resolve((req.result as Partial<PersistedProfileData>) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function loadLocalSnapshot(): Partial<PersistedProfileData> {
  const result: Partial<PersistedProfileData> = {};
  try {
    const metaRaw = localStorage.getItem(META_STORAGE_KEY);
    if (metaRaw) {
      Object.assign(result, JSON.parse(metaRaw));
    }
  } catch {
    // تجاهل
  }
  try {
    const postsRaw = localStorage.getItem(POSTS_STORAGE_KEY);
    if (postsRaw) {
      result.posts = JSON.parse(postsRaw) as ActivityPostItem[];
    }
  } catch {
    // تجاهل
  }
  return result;
}

function saveLocalSnapshot(data: PersistedProfileData) {
  const { posts, ...metaOnly } = data;
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metaOnly));
  } catch {
    // تجاهل
  }
  try {
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
  } catch {
    // تجاهل
  }
  void saveToIndexedDB(data);
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
  const storePosts: Array<Record<string, any>> = Array.isArray(store.posts) ? store.posts : [];
  const friends: Array<Record<string, any>> = Array.isArray(store.friends)
    ? store.friends
    : Array.isArray(store.contacts)
      ? store.contacts
      : [];

  const initialSaved = loadLocalSnapshot();

  const displayName =
    profile.name && profile.name !== 'أنت' ? String(profile.name) : 'abobaker096605';
  const rawHandle = profile.username || '@abobaker096605';
  const displayHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
  const displayPhone = profile.phone || profile.phone_number || '+966 5X XXX XXXX';

  const [activeSubTab, setActiveSubTab] = useState<ProfileSectionTab>('all');
  const [coverImage, setCoverImage] = useState<string>(
    initialSaved.coverImage || profile.coverImage || profile.cover || ''
  );
  const [avatarImage, setAvatarImage] = useState<string>(
    initialSaved.avatarImage || profile.avatar || ''
  );
  const [isPublicAccount, setIsPublicAccount] = useState<boolean>(
    typeof initialSaved.isPublicAccount === 'boolean'
      ? initialSaved.isPublicAccount
      : typeof profile.isPublic === 'boolean'
        ? profile.isPublic
        : true
  );

  // تعديل التفاصيل الشخصية
  const [editingDetails, setEditingDetails] = useState(false);
  const [bio, setBio] = useState<string>(
    initialSaved.bio || profile.bio || 'مطوّر ومحب للتكنولوجيا. أعيش لحظاتي بهدوء.'
  );
  const [city, setCity] = useState<string>(
    initialSaved.city || profile.city || profile.location || 'شندي'
  );
  const [hometown, setHometown] = useState<string>(
    initialSaved.hometown || profile.hometown || 'شندي'
  );
  const [birthday, setBirthday] = useState<string>(
    initialSaved.birthday || profile.birthday || '٢٠ سبتمبر ٢٠٠٢'
  );
  const [education, setEducation] = useState<string>(
    initialSaved.education || profile.education || 'كلية التربية - معلمين'
  );
  const [interestsText, setInterestsText] = useState<string>(
    initialSaved.interestsText ||
      (Array.isArray(profile.interests) && profile.interests.length > 0
        ? profile.interests.join('، ')
        : 'PUBG Mobile، Garena Free Fire')
  );

  // أبرز القصص
  const [highlights, setHighlights] = useState<Array<{ id: string; title: string; image?: string }>>(
    Array.isArray(initialSaved.highlights) && initialSaved.highlights.length > 0
      ? initialSaved.highlights
      : Array.isArray(profile.highlights)
        ? profile.highlights
        : []
  );

  const buildInitialPosts = (baseSaved: Partial<PersistedProfileData>): ActivityPostItem[] => {
    const persistedList = Array.isArray(baseSaved.posts) ? baseSaved.posts : [];
    const existingIds = new Set(persistedList.map((p) => p.id));

    const extraFromStore: ActivityPostItem[] = storePosts
      .filter((p) => !existingIds.has(String(p.id || '')))
      .map((p, idx) => {
        const img = p.image || p.imageUrl || p.photo;
        const text = p.content ? String(p.content) : '';
        const isAvatarUpdate =
          text.includes('صورة ملفه الشخصي') || text.includes('صورة الملف الشخصي');
        const isCoverUpdate = text.includes('صورة الغلاف');

        let headline = `نشر ${displayName}`;
        let kind: ActivityPostItem['kind'] = 'post';

        if (isAvatarUpdate) {
          headline = `قام ${displayName} بتحديث صورة ملفه الشخصي`;
          kind = 'avatar';
        } else if (isCoverUpdate) {
          headline = `قام ${displayName} بتحديث صورة الغلاف`;
          kind = 'cover';
        } else if (img) {
          headline = `نشر ${displayName} صورة`;
          kind = 'photo';
        }

        return {
          id: String(p.id || `store-post-${idx}`),
          authorName: displayName,
          authorHandle: displayHandle,
          authorAvatar:
            baseSaved.avatarImage ||
            (typeof p.authorAvatar === 'string' ? p.authorAvatar : undefined),
          headline,
          content: isAvatarUpdate || isCoverUpdate ? undefined : text || undefined,
          image: typeof img === 'string' ? img : undefined,
          createdAt: String(p.createdAt || 'الآن'),
          kind,
          liked: false,
          likesCount: 0,
          sharesCount: 0,
          comments: [],
        };
      });

    return [...persistedList, ...extraFromStore];
  };

  const [activityPosts, setActivityPosts] = useState<ActivityPostItem[]>(() =>
    buildInitialPosts(initialSaved)
  );
  const [hydratedFromDB, setHydratedFromDB] = useState(false);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const highlightInputRef = useRef<HTMLInputElement | null>(null);

  // استعادة البيانات من IndexedDB ثم مزامنة المنشورات الدائمة من Supabase
  useEffect(() => {
    let active = true;

    async function hydrateAll() {
      const dbData = await loadFromIndexedDB();
      if (active && dbData) {
        if (dbData.coverImage) setCoverImage(dbData.coverImage);
        if (dbData.avatarImage) setAvatarImage(dbData.avatarImage);
        if (typeof dbData.bio === 'string') setBio(dbData.bio);
        if (typeof dbData.city === 'string') setCity(dbData.city);
        if (typeof dbData.hometown === 'string') setHometown(dbData.hometown);
        if (typeof dbData.birthday === 'string') setBirthday(dbData.birthday);
        if (typeof dbData.education === 'string') setEducation(dbData.education);
        if (typeof dbData.interestsText === 'string') setInterestsText(dbData.interestsText);
        if (typeof dbData.isPublicAccount === 'boolean') {
          setIsPublicAccount(dbData.isPublicAccount);
        }
        if (Array.isArray(dbData.highlights) && dbData.highlights.length > 0) {
          setHighlights(dbData.highlights);
        }
        if (Array.isArray(dbData.posts) && dbData.posts.length > 0) {
          setActivityPosts((prev) => {
            const dbIds = new Set(dbData.posts!.map((p) => p.id));
            const brandNew = prev.filter((p) => !dbIds.has(p.id));
            return [...brandNew, ...dbData.posts!];
          });
        }
      }

      try {
        const { data: supaPosts, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (active && !error && Array.isArray(supaPosts) && supaPosts.length > 0) {
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
              authorName: String(row.author_name || displayName),
              authorHandle: String(row.author_handle || displayHandle),
              headline:
                String(row.headline || '') ||
                (kindVal === 'avatar'
                  ? `قام ${row.author_name || displayName} بتحديث صورة ملفه الشخصي`
                  : kindVal === 'cover'
                    ? `قام ${row.author_name || displayName} بتحديث صورة الغلاف`
                    : kindVal === 'photo'
                      ? `نشر ${row.author_name || displayName} صورة`
                      : `نشر ${row.author_name || displayName}`),
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
        // يظل التخزين المحلي شغالاً دون تعطيل الصفحة
      }

      if (active) {
        setHydratedFromDB(true);
      }
    }

    void hydrateAll();
    return () => {
      active = false;
    };
  }, [displayName, displayHandle]);

  useEffect(() => {
    if (!hydratedFromDB) return;
    saveLocalSnapshot({
      coverImage,
      avatarImage,
      bio,
      city,
      hometown,
      birthday,
      education,
      interestsText,
      isPublicAccount,
      highlights,
      posts: activityPosts,
    });
  }, [
    hydratedFromDB,
    coverImage,
    avatarImage,
    bio,
    city,
    hometown,
    birthday,
    education,
    interestsText,
    isPublicAccount,
    highlights,
    activityPosts,
  ]);

  // رفع الصورة إلى Supabase Storage (wasl-media) مع الاحتفاظ بالرابط العام أو DataURL احتياطياً
  async function uploadToWaslMedia(file: File, fallbackDataUrl: string): Promise<string> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id || 'guest';
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

  // حفظ المنشور أو التحديث الدائم في جدول posts في Supabase
  async function persistPostToSupabase(item: ActivityPostItem) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;

      const { data: inserted, error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          author_name: item.authorName,
          author_handle: item.authorHandle || displayHandle,
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
      // يظل محفوظاً محلياً حتى إعادة المزامنة
    }
  }

  const photoPosts = activityPosts.filter((p) => Boolean(p.image));
  const interestsList = interestsText
    .split(/[,،\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handlePickImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoaded: (imageUrl: string, fileName: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rawDataUrl = await readRawFileAsDataUrl(file);
    if (!rawDataUrl) return;
    const finalUrl = await uploadToWaslMedia(file, rawDataUrl);
    onLoaded(finalUrl, file.name);
    e.target.value = '';
  };

  const pushActivityPost = (item: ActivityPostItem) => {
    const fullItem: ActivityPostItem = {
      ...item,
      liked: false,
      likesCount: 0,
      sharesCount: 0,
      comments: [],
    };
    setActivityPosts((prev) => [fullItem, ...prev]);
    void persistPostToSupabase(fullItem);

    if (typeof store.addPost === 'function') {
      store.addPost({
        id: fullItem.id,
        authorName: fullItem.authorName,
        authorHandle: fullItem.authorHandle,
        authorAvatar: fullItem.authorAvatar,
        content: fullItem.content ? `${fullItem.headline} — ${fullItem.content}` : fullItem.headline,
        image: fullItem.image,
        createdAt: fullItem.createdAt,
      });
    }
  };

  const handleCoverChange = (imageUrl: string) => {
    setCoverImage(imageUrl);
    if (typeof store.updateProfile === 'function') {
      store.updateProfile({ coverImage: imageUrl, cover: imageUrl });
    }
    pushActivityPost({
      id: `cover-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorName: displayName,
      authorHandle: displayHandle,
      authorAvatar: avatarImage || undefined,
      headline: `قام ${displayName} بتحديث صورة الغلاف`,
      image: imageUrl,
      createdAt: 'الآن',
      kind: 'cover',
    });
  };

  const handleAvatarChange = (imageUrl: string) => {
    setAvatarImage(imageUrl);
    if (typeof store.updateProfile === 'function') {
      store.updateProfile({ avatar: imageUrl });
    }
    pushActivityPost({
      id: `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorName: displayName,
      authorHandle: displayHandle,
      authorAvatar: imageUrl,
      headline: `قام ${displayName} بتحديث صورة ملفه الشخصي`,
      image: imageUrl,
      createdAt: 'الآن',
      kind: 'avatar',
    });
  };

  const handleAddHighlight = (imageUrl: string, fileName: string) => {
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
    setEditingDetails(false);
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
      }
    } catch {
      // تجاهل إلغاء المشاركة من المتصفح
    }
  };

  const handleDeletePost = async (postId: string) => {
    const target = activityPosts.find((p) => p.id === postId);
    setActivityPosts((prev) => prev.filter((p) => p.id !== postId));

    if (target?.dbId) {
      try {
        await supabase.from('posts').delete().eq('id', target.dbId);
      } catch {
        // تجاهل
      }
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-4 pb-8 text-slate-100">
      {/* مدخلات معرض الصور المخفية */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handlePickImage(e, (url) => handleCoverChange(url))}
        className="hidden"
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handlePickImage(e, (url) => handleAvatarChange(url))}
        className="hidden"
      />
      <input
        ref={highlightInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handlePickImage(e, (url, name) => handleAddHighlight(url, name))}
        className="hidden"
      />

      {/* البطاقة الرئيسية: الغلاف + الصورة الشخصية + الاسم + الإحصائيات + الأزرار */}
      <section className="overflow-hidden rounded-2xl border border-purple-500/20 bg-slate-900/80 shadow-xl">
        <div className="relative h-44 w-full bg-gradient-to-l from-purple-700/60 via-slate-800 to-cyan-600/50">
          {coverImage && (
            <img
              src={coverImage}
              alt="غلاف الملف الشخصي"
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
              <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-slate-900 bg-slate-800 shadow-lg flex items-center justify-center">
                {avatarImage ? (
                  <img
                    src={avatarImage}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-black text-cyan-300">
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>

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

          <div className="space-y-1">
            <h1 className="text-xl font-black text-white">{displayName}</h1>
            <p className="text-xs font-semibold text-cyan-400" dir="ltr">
              {displayHandle}
            </p>
            <p className="pt-1 text-xs leading-relaxed text-slate-300">{bio}</p>
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
            <div className="rounded-xl border border-slate-800 bg-slate-950/75 py-2.5 px-2 text-center">
              <p className="text-sm font-black text-cyan-400">
                {Array.isArray(store.contacts) ? store.contacts.length : friends.length}
              </p>
              <p className="text-[11px] font-semibold text-slate-400">جهات اتصال</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/75 py-2.5 px-2 text-center">
              <p className="text-sm font-black text-cyan-400">{activityPosts.length}</p>
              <p className="text-[11px] font-semibold text-slate-400">منشورات</p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-800/90 bg-slate-950/60 px-3.5 py-2.5 text-xs">
              <span className="font-mono text-slate-200" dir="ltr">
                {displayPhone}
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span>رقم الهاتف</span>
                <Phone size={14} className="text-cyan-400" />
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-800/90 bg-slate-950/60 px-3.5 py-2.5 text-xs">
              <span className="font-semibold text-cyan-300" dir="ltr">
                {displayHandle}
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span>اسم المستخدم</span>
                <AtSign size={14} className="text-purple-400" />
              </span>
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

      {/* نموذج تعديل التفاصيل الشخصية */}
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

      {/* التفاصيل الشخصية والاهتمامات */}
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

      {/* أبرز القصص */}
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

      {/* الأصدقاء */}
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
                        className="mx-auto h-16 w-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-l from-cyan-600/25 to-purple-600/25 text-base font-black text-cyan-300">
                        {fName.slice(0, 1)}
                      </div>
                    )}
                    <p className="truncate text-[11px] font-bold text-white">{fName}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* قسم الصور */}
      {activeSubTab === 'photos' && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <Sparkles size={16} className="text-cyan-400" />
            <h2 className="text-sm font-black text-white">الصور ({photoPosts.length})</h2>
          </div>

          {photoPosts.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">لا توجد صور منشورة بعد.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photoPosts.map((p, idx) => (
                <img
                  key={`${p.id}-${idx}`}
                  src={p.image}
                  alt={`صورة ${idx + 1}`}
                  className="h-28 w-full rounded-xl object-cover border border-slate-800"
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* منشورات الملف الشخصي */}
      {activeSubTab === 'all' && (
        <section className="space-y-3">
          <h2 className="px-1 text-sm font-black text-white">المنشورات</h2>

          {activityPosts.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-xs text-slate-500">
              لا توجد منشورات بعد.
            </div>
          ) : (
            activityPosts.map((post) => {
              const comments = post.comments || [];
              const isCommentsOpen = openCommentsPostId === post.id;

              return (
                <article
                  key={post.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {avatarImage ? (
                        <img
                          src={avatarImage}
                          alt={displayName}
                          className="h-9 w-9 shrink-0 rounded-full object-cover border border-cyan-500/30"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-cyan-300">
                          {displayName.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{post.headline}</p>
                        <p className="text-[10px] text-slate-400">{post.createdAt}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleDeletePost(post.id)}
                      title="حذف المنشور"
                      aria-label="حذف المنشور"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-950/40 hover:text-rose-400 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {post.content && (
                    <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-line">
                      {post.content}
                    </p>
                  )}

                  {post.image && (
                    <img
                      src={post.image}
                      alt={post.headline}
                      className={`w-full rounded-xl object-cover border border-slate-800 ${
                        post.kind === 'avatar'
                          ? 'mx-auto h-64 w-64 rounded-full'
                          : 'max-h-80'
                      }`}
                    />
                  )}

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
                    <span>{post.likesCount || 0} أحببته</span>
                    <div className="flex items-center gap-3">
                      <span>{comments.length} تعليق</span>
                      <span>{post.sharesCount || 0} مشاركة</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 border-t border-slate-800/80 pt-2">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                        post.liked
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-950/70 text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <Heart
                        size={14}
                        className={post.liked ? 'fill-rose-400 text-rose-400' : ''}
                      />
                      <span>أحببته</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenCommentsPostId((prev) => (prev === post.id ? null : post.id))
                      }
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-950/70 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800/80 transition"
                    >
                      <MessageCircle size={14} className="text-cyan-400" />
                      <span>تعليق</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleSharePost(post)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-950/70 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800/80 transition"
                    >
                      <Share2 size={14} className="text-purple-400" />
                      <span>مشاركة</span>
                    </button>
                  </div>

                  {isCommentsOpen && (
                    <div className="space-y-2.5 border-t border-slate-800/80 pt-3">
                      {comments.length > 0 && (
                        <div className="space-y-1.5">
                          {comments.map((cmt) => (
                            <div
                              key={cmt.id}
                              className="rounded-xl bg-slate-950/80 border border-slate-800/80 px-3 py-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-cyan-300">{cmt.author}</span>
                                <span className="text-[10px] text-slate-500">{cmt.createdAt}</span>
                              </div>
                              <p className="mt-1 text-slate-200">{cmt.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <form
                        onSubmit={(e) => handleAddComment(post.id, e)}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          placeholder="اكتب تعليقاً..."
                          className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none"
                        />
                        <button
                          type="submit"
                          aria-label="إرسال التعليق"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 text-white"
                        >
                          <Send size={14} />
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}
