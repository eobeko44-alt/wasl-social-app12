import React, { useRef, useState } from 'react';
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
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';

const MEDIA_BUCKET = 'wasl-media';

interface PostComposerProps {
  onClose?: () => void;
  onSuccess?: () => void;
  placeholder?: string;
}

const BG_THEMES = [
  { id: 'none', label: 'افتراضي', className: 'bg-transparent text-white' },
  {
    id: 'sunset',
    label: 'غروب',
    className:
      'bg-gradient-to-br from-amber-500 via-orange-500 to-pink-600 text-white rounded-2xl p-4 min-h-[140px] flex items-center',
  },
  {
    id: 'violet',
    label: 'بنفسجي',
    className:
      'bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl p-4 min-h-[140px] flex items-center',
  },
  {
    id: 'berry',
    label: 'توتي',
    className:
      'bg-gradient-to-br from-pink-600 via-rose-600 to-purple-700 text-white rounded-2xl p-4 min-h-[140px] flex items-center',
  },
  {
    id: 'dark',
    label: 'داكن',
    className:
      'bg-slate-950 text-white rounded-2xl p-4 min-h-[140px] flex items-center border border-slate-700',
  },
  {
    id: 'crimson',
    label: 'قرمزي',
    className:
      'bg-gradient-to-br from-rose-600 to-red-700 text-white rounded-2xl p-4 min-h-[140px] flex items-center',
  },
  {
    id: 'neon',
    label: 'نيون',
    className:
      'bg-gradient-to-br from-fuchsia-600 to-purple-700 text-white rounded-2xl p-4 min-h-[140px] flex items-center',
  },
  {
    id: 'light',
    label: 'أبيض',
    className: 'bg-white text-slate-900 rounded-2xl p-4 min-h-[140px] flex items-center',
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

export default function PostComposer({
  onClose,
  onSuccess,
  placeholder = 'شارك لحظة بارزة من يومك...',
}: PostComposerProps) {
  const store = useAppStore() as Record<string, any>;
  const profile = store.profile || {};
  const createPost = typeof store.createPost === 'function' ? store.createPost : null;
  const addPost = typeof store.addPost === 'function' ? store.addPost : null;

  const displayName =
    profile.name && profile.name !== 'أنت' ? String(profile.name) : 'abobaker096605';
  const rawHandle = profile.username || '@abobaker096605';
  const displayHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

  const [text, setText] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('none');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeExtraType, setActiveExtraType] = useState<string | null>(null);
  const [extraValue, setExtraValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const themeStripRef = useRef<HTMLDivElement | null>(null);

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
      const uid = authData?.user?.id || 'guest';
      const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
      const path = `posts/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext || 'jpg'}`;

      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { upsert: false });

      if (error) return fallbackUrl;

      const { data: publicData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      return publicData?.publicUrl || fallbackUrl;
    } catch {
      return fallbackUrl;
    }
  };

  const buildFinalContent = (): string => {
    const main = text.trim();
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

  const submit = async () => {
    const finalContent = buildFinalContent();
    const rawMedia = imageUrl.trim();

    if ((!finalContent && !rawMedia) || submitting) return;

    setSubmitting(true);
    setNotice('');

    try {
      let finalMediaUrl = rawMedia || undefined;
      if (selectedFile && rawMedia) {
        finalMediaUrl = await uploadToWaslMedia(selectedFile, rawMedia);
      }

      if (createPost) {
        createPost(finalContent, finalMediaUrl);
      }

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? null;

      const { data: inserted, error } = await supabase
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

      if (!error && inserted?.id) {
        setNotice('تم النشر وحفظه في السحابة');
      } else if (error) {
        setNotice('تمت الإضافة محلياً (تحقق من صلاحيات جدول posts في Supabase)');
      }

      setText('');
      setImageUrl('');
      setSelectedFile(null);
      setActiveExtraType(null);
      setExtraValue('');
      setSelectedTheme('none');

      if (typeof onSuccess === 'function') {
        onSuccess();
      }
      if (typeof onClose === 'function') {
        onClose();
      }
    } catch {
      setNotice('تعذر النشر الآن');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(buildFinalContent() || imageUrl.trim()) && !submitting;
  const activeThemeObj = BG_THEMES.find((t) => t.id === selectedTheme) || BG_THEMES[0];
  const isLightTheme = selectedTheme === 'light';

  const optionsList = [
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
    <div
      dir="rtl"
      className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#1c1d21] text-white shadow-2xl overflow-hidden"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => void handleFileChange(e)}
        className="hidden"
      />

      {/* الهيدر العلوي */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#242529] px-4 py-3">
        <div className="flex items-center gap-3">
          {typeof onClose === 'function' && (
            <button
              type="button"
              onClick={onClose}
              aria-label="رجوع"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-200 hover:bg-white/10 transition"
            >
              <ArrowRight size={18} />
            </button>
          )}
          <span className="text-sm font-bold text-white">إنشاء منشور</span>
        </div>

        <button
          type="button"
          onClick={() => void submit()}
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

      {/* معلومات الحساب والخصوصية */}
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

        {/* مساحة الكتابة */}
        <div className="mt-3.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
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

        {/* حقل الإضافة النشطة */}
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

        {/* معاينة الصورة */}
        {imageUrl && (
          <div className="mt-3 relative">
            <img
              src={imageUrl}
              alt="معاينة المنشور"
              className="max-h-56 w-full rounded-xl object-cover border border-white/10"
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

      {/* شريط الألوان/الخلفيات */}
      <div className="flex items-center gap-2 border-t border-white/10 bg-[#242529]/80 px-3 py-2">
        <button
          type="button"
          onClick={() => setText((prev) => `${prev}@`)}
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

      {/* قائمة الخيارات السفلية */}
      <div className="divide-y divide-white/5 border-t border-white/10 bg-[#1c1d21]">
        {optionsList.map((item) => (
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

      {notice && (
        <p className="bg-[#242529] py-1.5 text-center text-xs font-bold text-cyan-300">
          {notice}
        </p>
      )}

      {/* زر النشر العريض في الأسفل */}
      <div className="bg-[#1c1d21] p-3 border-t border-white/10">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit}
          className="w-full rounded-lg bg-[#1877F2] py-2.5 text-sm font-extrabold text-white shadow transition enabled:hover:bg-[#166fe5] enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submitting ? 'جاري النشر...' : 'نشر'}
        </button>
      </div>
    </div>
  );
}
