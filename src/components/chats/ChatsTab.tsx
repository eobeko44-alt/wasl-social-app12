import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';

interface OpenChatEventDetail {
  userId?: string;
  userName?: string;
  avatar?: string;
}

export default function ChatsTab() {
  const { openConversation } = useAppStore();
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const handleBack = () => setMobileView('list');

  const handleOpen = (id: string) => {
    openConversation(id);
    setMobileView('chat');
  };

  useEffect(() => {
    const onOpenChatEvent = (event: Event) => {
      const customEvent = event as CustomEvent<OpenChatEventDetail>;
      const detail = customEvent.detail;
      if (detail?.userId) {
        openConversation(detail.userId, {
          userName: detail.userName,
          avatar: detail.avatar,
        });
        setMobileView('chat');
      }
    };

    window.addEventListener('wasl-open-chat', onOpenChatEvent);
    return () => {
      window.removeEventListener('wasl-open-chat', onOpenChatEvent);
    };
  }, [openConversation]);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
      <div
        className={`w-full md:w-auto md:block ${
          mobileView === 'list' ? 'block' : 'hidden'
        }`}
      >
        <ChatList className="md:border-e" onOpen={handleOpen} />
      </div>

      <div
        className={`flex-1 md:flex ${
          mobileView === 'chat' ? 'flex' : 'hidden'
        }`}
      >
        <ChatWindow onBack={handleBack} />
      </div>
    </div>
  );
}
