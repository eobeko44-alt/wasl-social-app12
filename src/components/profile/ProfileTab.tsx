import React, { useRef, useState } from 'react';
import {
  Camera,
  MapPin,
  Home,
  Cake,
  GraduationCap,
  Gamepad2,
  AtSign,
  Phone,
  Globe,
  Lock,
  Plus,
  Edit3,
  Users,
  Image as ImageIcon,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';

type ProfileSectionTab = 'all' | 'photos' | 'about';

interface ActivityPostItem {
  id: string;
  authorName: string;
  authorHandle?: string;
  authorAvatar?: string;
  headline: string;
  content?: string;
  image?: string;
  createdAt: string;
  kind: 'avatar' | 'cover' | 'photo' | 'post';
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

  const displayName =
    profile.name && profile.name !== 'أنت' ? String(profile.name) : 'abobaker';
  const rawHandle = profile.username || '@abobaker';
  const displayHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
  const displayPhone = profile.phone || profile.phone_number || '+966 5X XXX XXXX';

  const [activeSubTab, setActiveSubTab] = useState<ProfileSectionTab>('all');
  const [coverImage, setCoverImage] = useState<string>(profile.coverImage || profile.cover || '');
  const [avatarImage, setAvatarImage] = useState<string>(profile.avatar || '');
  const [localActivityPosts, setLocalActivityPosts] = useState<ActivityPostItem[]>([]);
  const [isPublicAccount, setIsPublicAccount] = useState<boolean>(
    typeof profile.isPublic === 'boolean' ? profile.isPublic : true
  );

  // تعديل التفاصيل الشخصية
  const [editingDetails, setEditingDetails] = useState(false);
  const [bio, setBio] = useState<string>(
    profile.bio || 'مطوّر ومحب للتكنولوجيا. أعيش لحظاتي بهدوء.'
  );
  const [city, setCity] = useState<string>(profile.city || profile.location || 'شندي');
  const [hometown, setHometown] = useState<string>(profile.hometown || 'شندي');
  const [birthday, setBirthday] = useState<string>(profile.birthday || '٢٠ سبتمبر ٢٠٠٢');
  const [education, setEducation] = useState<string>(profile.education || 'كلية التربية - معلمين');
  const [interestsText, setInterestsText] = useState<string>(
    Array.isArray(profile.interests) && profile.interests.length > 0
      ? profile.interests.join('، ')
      : 'PUBG Mobile، Garena Free Fire'
  );

  // أبرز القصص
  const [highlights, setHighlights] = useState<Array<{ id: string; title: string; image?: string }>>(
    Array.isArray(profile.highlights) ? profile.highlights : []
  );

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const highlightInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedStorePosts: ActivityPostItem[] = storePosts.map((p, idx) => {
    const img = p.image || p.imageUrl || p.photo;
    const text = p.content ? String(p.content) : '';
    const isAvatarUpdate = text.includes('صورة ملفه الشخصي') || text.includes('صورة الملف الشخصي');
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
      authorAvatar: avatarImage || (typeof p.authorAvatar === 'string' ? p.authorAvatar : undefined),
      headline,
      content: isAvatarUpdate || isCoverUpdate ? undefined : text || undefined,
      image: typeof img === 'string' ? img : undefined,
      createdAt: String(p.createdAt || 'الآن'),
      kind,
    };
  });

  const combinedPosts: ActivityPostItem[] = [...localActivityPosts, ...normalizedStorePosts];
  const photoPosts = combinedPosts.filter((p) => Boolean(p.image));
  const interestsList = interestsText
    .split(/[,،\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handlePickImage = (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoaded: (dataUrl: string, fileName: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onLoaded(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const pushActivityPost = (item: ActivityPostItem) => {
    setLocalActivityPosts((prev) => [item, ...prev]);
    if (typeof store.addPost === 'function') {
      store.addPost({
        id: item.id,
        authorName: item.authorName,
        authorHandle: item.authorHandle,
        authorAvatar: item.authorAvatar,
        content: item.content ? `${item.headline} — ${item.content}` : item.headline,
        image: item.image,
        createdAt: item.createdAt,
      });
    }
  };

  const handleCoverChange = (dataUrl: string) => {
    setCoverImage(dataUrl);
    if (typeof store.updateProfile === 'function') {
      store.updateProfile({ coverImage: dataUrl, cover: dataUrl });
    }
    pushActivityPost({
      id: `cover-${Date.now()}`,
      authorName: displayName,
      authorHandle: displayHandle,
      authorAvatar: avatarImage || undefined,
      headline: `قام ${displayName} بتحديث صورة الغلاف`,
      image: dataUrl,
      createdAt: 'الآن',
      kind: 'cover',
    });
  };

  const handleAvatarChange = (dataUrl: string) => {
    setAvatarImage(dataUrl);
    if (typeof store.updateProfile === 'function') {
      store.updateProfile({ avatar: dataUrl });
    }
    pushActivityPost({
      id: `avatar-${Date.now()}`,
      authorName: displayName,
      authorHandle: displayHandle,
      authorAvatar: dataUrl,
      headline: `قام ${displayName} بتحديث صورة ملفه الشخصي`,
      image: dataUrl,
      createdAt: 'الآن',
      kind: 'avatar',
    });
  };

  const handleAddHighlight = (dataUrl: string, fileName: string) => {
    const cleanTitle = fileName.replace(/\.[^/.]+$/, '').slice(0, 18) || 'قصة بارزة';
    setHighlights((prev) => [
      ...prev,
      {
        id: `hl-${Date.now()}`,
        title: cleanTitle,
        image: dataUrl,
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

  const handleTogglePrivacy = () => {
    const nextValue = !isPublicAccount;
    setIsPublicAccount(nextValue);
    if (typeof store.updateProfile === 'function') {
      store.updateProfile({ isPublic: nextValue });
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
        {/* الغلاف */}
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

        {/* الصورة الشخصية + الاسم والنبذة */}
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

          {/* أزرار سريعة بأسلوب فيسبوك */}
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

          {/* صناديق الإحصائيات */}
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
              <p className="text-sm font-black text-cyan-400">{combinedPosts.length}</p>
              <p className="text-[11px] font-semibold text-slate-400">منشورات</p>
            </div>
          </div>

          {/* بيانات التواصل السريعة */}
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

        {/* تبويبات فرعية داخل الملف الشخصي */}
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

      {/* منشورات الملف الشخصي بتفصيل الصورة والغلاف والنشر */}
      {activeSubTab === 'all' && (
        <section className="space-y-3">
          <h2 className="px-1 text-sm font-black text-white">المنشورات</h2>

          {combinedPosts.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-xs text-slate-500">
              لا توجد منشورات بعد.
            </div>
          ) : (
            combinedPosts.map((post, idx) => (
              <article
                key={`${post.id}-${idx}`}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {avatarImage ? (
                      <img
                        src={avatarImage}
                        alt={displayName}
                        className="h-9 w-9 rounded-full object-cover border border-cyan-500/30"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-cyan-300">
                        {displayName.slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-white">{post.headline}</p>
                      <p className="text-[10px] text-slate-400">{post.createdAt}</p>
                    </div>
                  </div>
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
              </article>
            ))
          )}
        </section>
      )}

      {/* الخصوصية وتسجيل الخروج */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-3">
        <h2 className="text-sm font-black text-white">الخصوصية</h2>

        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5">
          <button
            type="button"
            onClick={handleTogglePrivacy}
            aria-label="تبديل خصوصية الحساب"
            className={`relative h-6 w-11 rounded-full transition ${
              isPublicAccount ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                isPublicAccount ? '-translate-x-6' : '-translate-x-1'
              }`}
            />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <span>{isPublicAccount ? 'حساب عام' : 'حساب خاص'}</span>
            {isPublicAccount ? (
              <Globe size={15} className="text-cyan-400" />
            ) : (
              <Lock size={15} className="text-purple-400" />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-950/50 transition"
        >
          <LogOut size={14} />
          <span>تسجيل الخروج</span>
        </button>
      </section>
    </div>
  );
}
