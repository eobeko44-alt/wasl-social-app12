import { Phone, UserPlus, MessageCircle } from 'lucide-react';
import type { User } from '@/types';

interface UserCardProps {
  user: User;
  onAddFriend?: (user: User) => void;
  onMessage?: (user: User) => void;
  onAddContact?: (user: User) => void;
}

export function Avatar({ src, online, size = 'md' }: { src: string; online?: boolean; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = { sm: 'h-9 w-9', md: 'h-11 w-11', lg: 'h-14 w-14', xl: 'h-24 w-24' };
  const dot = { sm: 'h-2.5 w-2.5', md: 'h-3 w-3', lg: 'h-3.5 w-3.5', xl: 'h-5 w-5' };
  return (
    <div className="relative shrink-0">
      <img src={src} alt="" className={`${sizes[size]} rounded-full border-2 border-slate-700 object-cover`} />
      {online && (
        <span className={`absolute -bottom-0.5 -left-0.5 ${dot[size]} rounded-full border-2 border-slate-900 bg-emerald-400`} />
      )}
    </div>
  );
}

export default function UserCard({ user, onAddFriend, onMessage, onAddContact }: UserCardProps) {
  const isFriend = user.isFriend;
  const isContact = user.isContact;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition hover:border-cyan-800/50 hover:bg-slate-800/60">
      <Avatar src={user.avatar} online={user.isOnline} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{user.name}</p>
        <p className="truncate text-xs text-cyan-400">{user.username}</p>
        {!user.isOnline && user.lastSeen && <p className="truncate text-[11px] text-slate-500">{user.lastSeen}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        {isContact && onMessage && (
          <button
            onClick={() => onMessage(user)}
            className="rounded-full bg-slate-800 p-2 text-slate-300 transition hover:bg-cyan-600 hover:text-white"
            aria-label="إرسال رسالة"
            title="إرسال رسالة"
          >
            <MessageCircle size={16} />
          </button>
        )}
        {onAddContact && !isContact && (
          <button
            onClick={() => onAddContact(user)}
            className="rounded-full bg-slate-800 p-2 text-slate-300 transition hover:bg-purple-600 hover:text-white"
            aria-label="إضافة إلى جهات الاتصال"
            title="إضافة إلى جهات الاتصال"
          >
            <Phone size={16} />
          </button>
        )}
        {onAddFriend && !isFriend && (
          <button
            onClick={() => onAddFriend(user)}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-l from-cyan-600 to-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-cyan-900/40 transition hover:brightness-110 active:scale-95"
          >
            <UserPlus size={14} />
            إضافة صديق
          </button>
        )}
        {(isFriend || isContact) && (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
            {isContact ? 'جهة اتصال' : 'صديق'}
          </span>
        )}
      </div>
    </div>
  );
}
