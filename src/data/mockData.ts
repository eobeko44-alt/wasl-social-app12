import type { Conversation, Post, Story, User } from '@/types';

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=1e293b,0f172a,164e63,3b0764`;

export const currentUser: User = {
  id: 'me',
  name: 'أنت',
  username: '@you',
  phone: '+966 5X XXX XXXX',
  avatar: avatar('you'),
  bio: 'مطوّر ومحب للتكنولوجيا. أعيش لحظاتي بهدوء.',
  isPublic: true,
};

export const mockUsers: User[] = [
  { id: 'u1', name: 'سارة العتيبي', username: '@sarah_a', phone: '+966 50 123 4567', avatar: avatar('sarah'), isOnline: true, isFriend: true, isContact: true },
  { id: 'u2', name: 'محمد الشمري', username: '@mohammed_s', phone: '+966 55 987 6543', avatar: avatar('mohammed'), isOnline: false, lastSeen: 'قبل ١٥ دقيقة', isFriend: true, isContact: true },
  { id: 'u3', name: 'ليان القحطاني', username: '@layan_q', phone: '+966 54 222 8899', avatar: avatar('layan'), isOnline: true, isFriend: true, isContact: true },
  { id: 'u4', name: 'عبدالله الحربي', username: '@abdullah_h', phone: '+966 53 777 1122', avatar: avatar('abdullah'), isOnline: false, lastSeen: 'قبل ساعتين', isFriend: true, isContact: true },
  { id: 'u5', name: 'نورة السبيعي', username: '@noura_s', phone: '+966 56 333 4455', avatar: avatar('noura'), isOnline: true, isFriend: false, isContact: false },
  { id: 'u6', name: 'خالد الدوسري', username: '@khalid_d', phone: '+966 59 444 5566', avatar: avatar('khalid'), isOnline: false, lastSeen: 'أمس', isFriend: false, isContact: false },
  { id: 'u7', name: 'ريم الغامدي', username: '@reem_g', phone: '+966 57 888 9900', avatar: avatar('reem'), isOnline: true, isFriend: false, isContact: false },
  { id: 'u8', name: 'فيصل العنزي', username: '@faisal_o', phone: '+966 52 666 7788', avatar: avatar('faisal'), isOnline: false, lastSeen: 'قبل ٣ أيام', isFriend: false, isContact: false },
];

export const mockPosts: Post[] = [
  {
    id: 'p1',
    author: mockUsers[0],
    text: 'صباح الخير جميعاً ☀️ بدأت يومي بكوب قهوة وجلسة عمل ممتعة. أتمنى لكم يوماً سعيداً!',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    createdAt: 'قبل ٢٥ دقيقة',
    likes: 48,
    likedByMe: false,
    comments: [
      { id: 'c1', author: mockUsers[2], text: 'قهوتك دائماً تُشعل حماسي 😄', createdAt: 'قبل ١٠ دقائق' },
      { id: 'c2', author: mockUsers[4], text: 'يومك سعيد سارة!', createdAt: 'قبل ٥ دقائق' },
    ],
  },
  {
    id: 'p2',
    author: mockUsers[1],
    text: 'أنهيت أخيراً مشروعي الجديد بعد ثلاثة أشهر من العمل. العلم يرفع البيوت 🚀',
    createdAt: 'قبل ساعة',
    likes: 132,
    likedByMe: true,
    comments: [
      { id: 'c3', author: mockUsers[3], text: 'ما شاء الله عليك، ألف مبروك!', createdAt: 'قبل ٤٥ دقيقة' },
    ],
  },
  {
    id: 'p3',
    author: mockUsers[2],
    text: 'مين جرب مقهى الجديد في وسط المدينة؟ أرى تقييمات رائعة وأفكر أزوره نهاية الأسبوع ☕',
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80',
    createdAt: 'قبل ٣ ساعات',
    likes: 27,
    likedByMe: false,
    comments: [],
  },
  {
    id: 'p4',
    author: mockUsers[3],
    text: 'نصيحة اليوم: لا تؤجل عمل اليوم إلى الغد. ابدأ بأصغر خطوة الآن.',
    createdAt: 'أمس ٩:٤٥ م',
    likes: 89,
    likedByMe: false,
    comments: [
      { id: 'c4', author: mockUsers[5], text: 'كلام في محل 💯', createdAt: 'أمس ١٠:٠٠ م' },
      { id: 'c5', author: mockUsers[6], text: 'شكراً على التحفيز', createdAt: 'أمس ١١:٣٠ م' },
    ],
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv1',
    user: mockUsers[0],
    unread: 2,
    messages: [
      { id: 'm1', senderId: 'u1', text: 'مرحباً! شفت الصور اللي أرسلتها؟', createdAt: '١٠:٣٠ ص' },
      { id: 'm2', senderId: 'me', text: 'نعم، رائعة جداً! أين التقطتها؟', createdAt: '١٠:٣٢ ص' },
      { id: 'm3', senderId: 'u1', text: 'في رحلتي الأخيرة إلى العلا 🏜️', createdAt: '١٠:٣٥ ص' },
      { id: 'm4', senderId: 'u1', text: 'خطط أن أعود هناك الشهر القادم', createdAt: '١٠:٣٥ ص' },
    ],
  },
  {
    id: 'conv2',
    user: mockUsers[1],
    unread: 0,
    messages: [
      { id: 'm5', senderId: 'u2', text: 'أخي، متى نلتقي لإكمال المشروع؟', createdAt: 'أمس' },
      { id: 'm6', senderId: 'me', text: 'الخميس القادم إن شاء الله', createdAt: 'أمس' },
      { id: 'm7', senderId: 'u2', text: 'تمام، أراك حينها 👍', createdAt: 'أمس' },
    ],
  },
  {
    id: 'conv3',
    user: mockUsers[2],
    unread: 1,
    messages: [
      { id: 'm8', senderId: 'me', text: 'شكراً على المساعدة أمس 🌹', createdAt: 'أمس' },
      { id: 'm9', senderId: 'u3', text: 'العفو! أي وقت تحتاج شيء أنا موجودة', createdAt: 'أمس' },
    ],
  },
  {
    id: 'conv4',
    user: mockUsers[3],
    unread: 0,
    messages: [
      { id: 'm10', senderId: 'u4', text: 'لا تنسى موعدنا غداً', createdAt: 'الاثنين' },
      { id: 'm11', senderId: 'me', text: 'لن أنسى، تمام', createdAt: 'الاثنين' },
    ],
  },
];

export const mockStories: Story[] = [
  {
    id: 's1',
    user: mockUsers[0],
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
    createdAt: 'قبل ساعتين',
    seen: false,
  },
  {
    id: 's2',
    user: mockUsers[2],
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
    createdAt: 'قبل ٥ ساعات',
    seen: false,
  },
  {
    id: 's3',
    user: mockUsers[1],
    imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80',
    createdAt: 'قبل ٨ ساعات',
    seen: true,
  },
  {
    id: 's4',
    user: mockUsers[3],
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&q=80',
    createdAt: 'قبل ١١ ساعة',
    seen: true,
  },
];
