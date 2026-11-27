import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Send } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Avatar } from '@/components/UserCard';
import {
  fetchConversationMessages,
  getCurrentAuthUserId,
  PersistentMessage,
  readCachedMessages,
  sendPersistentMessage,
  subscribeToConversationMessages,
} from '@/services/messagesService';

interface ChatWindowProps {
  onBack?: () => void;
  currentUserId?: string | null;
}

export default function ChatWindow({
  onBack,
  currentUserId: externalUserId,
}: ChatWindowProps) {
  const { conversations, activeConversationId } = useAppStore();

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const peerId = activeConv?.user?.id ?? '';
  const rawName = activeConv?.user?.name;
  const peerName =
    typeof rawName === 'string' && rawName.trim().length > 0 && rawName !== 'undefined'
      ? rawName.trim()
      : 'مستخدم وِصل';
  const peerAvatar = activeConv?.user?.avatar ?? '';
  const peerOnline = Boolean(activeConv?.user?.isOnline);

  const [myUserId, setMyUserId] = useState<string | null>(externalUserId ?? null);
  const [messages, setMessages] = useState<PersistentMessage[]>(() => {
    const uid = externalUserId ?? null;
    return uid && peerId ? readCachedMessages(uid, peerId) : [];
  });
  const [inputText, setInputText] = useState('');
  const [notice, setNotice] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (externalUserId) {
      setMyUserId(externalUserId);
      return;
    }
    let active = true;
    void getCurrentAuthUserId().then((id) => {
      if (active && id) setMyUserId(id);
    });
    return () => {
      active = false;
    };
  }, [externalUserId]);

  useEffect(() => {
    if (!myUserId || !peerId) {
      setMessages([]);
      return;
    }

    const cached = readCachedMessages(myUserId, peerId);
    setMessages(cached);

    let active = true;
    void fetchConversationMessages(myUserId, peerId).then((list) => {
      if (active) setMessages(list);
    });

    const unsubscribe = subscribeToConversationMessages(myUserId, peerId, (incoming) => {
      if (!active) return;
      setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [myUserId, peerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages.length, peerId]);

  if (!activeConv || !peerId) {
    return (
      <div
        dir="rtl"
        className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-slate-400"
      >
        <p className="text-sm font-bold text-slate-300">اختر محادثة أو اضغط «مراسلة» على صديق</p>
        <p className="mt-1 text-xs text-slate-500">ستظهر نافذة الدردشة والرسائل هنا مباشرة.</p>
      </div>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !peerId) return;

    const senderId = myUserId || '';
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: PersistentMessage = {
      id: tempId,
      sender_id: senderId,
      receiver_id: peerId,
      body: trimmed,
      created_at: new Date().toISOString(),
    };

    setNotice('');
    setInputText('');
    setMessages((prev) => [...prev, optimisticMsg]);

    void (async () => {
      const res = await sendPersistentMessage({
        senderId,
        receiverId: peerId,
        body: trimmed,
      });

      if (res.errorText) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setNotice(res.errorText);
        return;
      }

      if (res.message) {
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          return withoutTemp.some((m) => m.id === res.message!.id)
            ? withoutTemp
            : [...withoutTemp, res.message!];
        });
      }
    })();
  };

  return (
    <div dir="rtl" className="flex h-full w-full flex-col bg-slate-900/85 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2.5 bg-slate-950/70">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="رجوع إلى المحادثات"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-slate-800 md:hidden"
            >
              <ArrowRight size={18} />
            </button>
          )}
          <Avatar src={peerAvatar} online={peerOnline} />
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-white">{peerName}</p>
            <p className="text-[10px] text-cyan-400">محفوظ في السحابة</p>
          </div>
        </div>
      </div>

      {notice && (
        <div className="bg-amber-950/50 border-b border-amber-500/30 px-3 py-1.5 text-[11px] font-bold text-amber-300 text-center">
          {notice}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">
            لا توجد رسائل بعد مع {peerName}. ابدأ المحادثة الآن.
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === myUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${
                  isMine
                    ? 'mr-auto bg-gradient-to-l from-cyan-600 to-purple-600 text-white'
                    : 'ml-auto bg-slate-800 text-slate-100 border border-slate-700/70'
                }`}
              >
                <span className="whitespace-pre-line leading-relaxed">{msg.body}</span>
                <span className="mt-1 text-[9px] opacity-75">
                  {msg.created_at
                    ? new Date(msg.created_at).toLocaleTimeString('ar', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-slate-800 p-2.5 bg-slate-950/70"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`اكتب رسالة إلى ${peerName}...`}
          className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="إرسال الرسالة"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 text-white"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
