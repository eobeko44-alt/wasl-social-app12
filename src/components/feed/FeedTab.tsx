import { Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import UserCard from '@/components/UserCard';
import PostComposer from './PostComposer';
import PostCard from './PostCard';

export default function FeedTab() {
  const { posts, discoverPeople, addFriend, addContact, startConversationWith } = useAppStore();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PostComposer />
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Users size={18} className="text-purple-400" />
          <h2 className="text-base font-bold text-white">اكتشف أشخاص</h2>
          <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-semibold text-purple-300">
            {discoverPeople.length}
          </span>
        </div>
        {discoverPeople.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">أضفت الجميع! لا توجد توصيات جديدة حالياً.</p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {discoverPeople.map((user) => (
              <UserCard
                key={user.id}
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
