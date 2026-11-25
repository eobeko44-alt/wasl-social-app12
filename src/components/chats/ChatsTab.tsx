import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';

export default function ChatsTab() {
  const { openConversation } = useAppStore();
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const handleBack = () => setMobileView('list');

  const handleOpen = (id: string) => {
    openConversation(id);
    setMobileView('chat');
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 md:h-[calc(100vh-7rem)]">
      <div
        className={`w-full md:w-auto md:block ${mobileView === 'list' ? 'block' : 'hidden'}`}
      >
        <ChatList className="md:border-e" onOpen={() => setMobileView('chat')} />
      </div>
      <div className={`flex-1 md:flex ${mobileView === 'chat' ? 'flex' : 'hidden'}`}>
        <ChatWindow onBack={handleBack} />
      </div>
    </div>
  );
}
