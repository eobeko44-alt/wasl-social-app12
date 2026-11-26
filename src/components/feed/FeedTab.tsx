import React, { useEffect, useRef, useState } from 'react';
import { Users, ImagePlus, Send, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import UserCard from '@/components/UserCard';
import PostCard from './PostCard';

const MEDIA_BUCKET = 'wasl-media';

interface CloudPostRecord {
  id: string;
  user_id?: string | null;
  author_name?: string | null;
  author_handle?: string | null;
  content?: string | null;
  headline?: string | null;
  image_url?: string | null;
  kind?: string | null;
  created_at?: string | null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

export default function FeedTab() {
  const store = useAppStore() as Record<string, any>;
  const storePosts: Array<Record<string, any>> = Array.isArray(store.posts) ? store.posts : [];
  const discoverPeople: Array<Record<string, any>> = Array.isArray(store.discoverPeople)
    ? store.discoverPeople
    : [];
  const addFriend = typeof store.addFriend === 'function' ? store.addFriend : () => {};
  const addContact = typeof store.addContact === 'function' ? store.addContact : () => {};
  const startConversationWith =
    typeof store.startConversationWith === 'function' ? store.startConversationWith : () => {};

  const currentProfile = store.profile || {};
  const displayName =
    currentProfile.name && currentProfile.name !== 'أنت'
      ? String(currentProfile.name)
      : 'abobaker096605';
  const rawHandle = currentProfile.username || '@abobaker096605';
  const displayHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

  const [cloudPosts, setCloudPosts] = useState<Array<Record<string, any>>>([]);
  const [postText, setPostText] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [publishing, setPublishing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mapCloudRowToPost = (row: CloudPostRecord): Record<string, any> => {
    const textBody = row.content ? String(row.content) : row.headline ? String(row.headline) : '';
    const imgUrl = row.image_url ? String(row.image_url) : undefined;
    return {
      id: `cloud-${String(row.id)}`,
      dbId: String(row.id),
      userId: row.user_id || undefined,
      authorName: String(row.author_name || 'مستخدم وصل'),
      authorHandle: String(row.author_handle || '@wasl_user'),
      content: textBody,
      image: imgUrl,
      imageUrl: imgUrl,
      createdAt: row.created_at
        ? new Date(String(row.created_at)).toLocaleDateString('ar')
        : 'الآن',
    };
  };

  const fetchGlobalPosts = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        setCloudPosts((data as CloudPostRecord[]).map(mapCloudRowToPost));
      }
    } catch {
      // يظل العرض المحلي شغالاً
    } finally {
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchGlobalPosts(false);

    const channel = supabase
      .channel('wasl-global-posts-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          const row = payload.new as CloudPostRecord | undefined;
          if (!row?.id) return;
          const mapped = mapCloudRowToPost(row);
          setCloudPosts((prev) => {
            const exists = prev.some(
              (item) => item.id === mapped.id || (item.dbId && item.dbId === mapped.dbId)
            );
            return exists ? prev : [mapped, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const preview = await readFileAsDataUrl(file);
    setSelectedImageFile(file);
    setImagePreview(preview);
    e.target.value = '';
  };

  const uploadPostMedia = async (file: File, fallbackUrl: string): Promise<string> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id || 'guest';
      const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
      const path = `feed/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext || 'jpg'}`;

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

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = postText.trim();
    if ((!trimmed && !imagePreview) || publishing) return;

    setPublishing(true);
    setStatusNotice('');

    try {
      let finalImageUrl: string | undefined = imagePreview || undefined;
      if (selectedImageFile && imagePreview) {
        finalImageUrl = await uploadPostMedia(selectedImageFile, imagePreview);
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;

      const { data: inserted, error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          author_name: displayName,
          author_handle: displayHandle,
          headline: finalImageUrl ? `نشر ${displayName} صورة` : `نشر ${displayName}`,
          content: trimmed || null,
          image_url: finalImageUrl || null,
          kind: finalImageUrl ? 'photo' : 'post',
        })
        .select()
        .single();

      const localPost: Record<string, any> = {
        id: inserted?.id ? `cloud-${String(inserted.id)}` : `local-feed-${Date.now()}`,
        dbId: inserted?.id ? String(inserted.id) : undefined,
        authorName: displayName,
        authorHandle: displayHandle,
        content: trimmed,
        image: finalImageUrl,
        imageUrl: finalImageUrl,
        createdAt: 'الآن',
      };

      if (!error && inserted?.id) {
        setCloudPosts((prev) =>
          prev.some((p) => p.id === localPost.id) ? prev : [localPost, ...prev]
        );
        setStatusNotice('تم نشر المنشور وحفظه في السحابة');
      } else {
        setStatusNotice('تمت إضافة المنشور محلياً');
      }

      if (typeof store.addPost === 'function') {
        store.addPost(localPost);
      }

      setPostText('');
      setSelectedImageFile(null);
      setImagePreview('');
    } catch {
      setStatusNotice('تعذر نشر المنشور الآن');
    } finally {
      setPublishing(false);
      setTimeout(() => {
        setStatusNotice('');
      }, 2500);
    }
  };

  const mergedPosts = (() => {
    const seen = new Set<string>();
    const combined: Array<Record<string, any>> = [];

    for (const item of [...cloudPosts, ...storePosts]) {
      const key = String(item.dbId || item.id || '');
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      combined.push(item);
    }

    return combined;
  })();

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-5 pb-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => void handleImageSelect(e)}
        className="hidden"
      />

      {/* صندوق نشر منشور جديد */}
      <form
        onSubmit={(e) => void handlePublishPost(e)}
        className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-white">إنشاء منشور في العام</span>
          <button
            type="button"
            onClick={() => void fetchGlobalPosts(true)}
            disabled={refreshing}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:border-cyan-500/40 transition"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span>تحديث</span>
          </button>
        </div>

        <textarea
          rows={2}
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="بماذا تفكر يا معلم؟ شارك منشورك مع الجميع..."
          className="w-full rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none"
        />

        {imagePreview && (
          <div className="relative">
            <img
              src={imagePreview}
              alt="معاينة الصورة"
              className="max-h-60 w-full rounded-xl object-cover border border-slate-800"
            />
            <button
              type="button"
              onClick={() => {
                setSelectedImageFile(null);
                setImagePreview('');
              }}
              className="mt-1.5 rounded-lg bg-rose-950/60 border border-rose-500/30 px-2.5 py-1 text-[11px] font-bold text-rose-300"
            >
              إزالة الصورة
            </button>
          </div>
        )}

        {statusNotice && (
          <p className="text-[11px] font-bold text-cyan-300">{statusNotice}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:border-cyan-500/40 transition"
          >
            <ImagePlus size={15} />
            <span>إضافة صورة</span>
          </button>

          <button
            type="submit"
            disabled={publishing}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 px-4 py-1.5 text-xs font-bold text-white shadow disabled:opacity-50"
          >
            <Send size={13} />
            <span>{publishing ? 'جاري النشر...' : 'نشر'}</span>
          </button>
        </div>
      </form>

      {/* قائمة المنشورات */}
      <div className="space-y-4">
        {mergedPosts.map((post, idx) => (
          <PostCard key={String(post.id || idx)} post={post} />
        ))}
      </div>

      {/* قسم اكتشف أشخاصاً */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Users size={18} className="text-purple-400" />
          <h2 className="text-base font-bold text-white">اكتشف أشخاصاً</h2>
          <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-semibold text-purple-300">
            {discoverPeople.length}
          </span>
        </div>

        {discoverPeople.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            أضفت الجميع! لا توجد توصيات جديدة حالياً.
          </p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {discoverPeople.map((user: Record<string, any>, idx: number) => (
              <UserCard
                key={String(user.id || idx)}
                user={user}
                onAddFriend={addFriend}
                onAddContact={addContact}
                onMessage={startConversationWith}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
