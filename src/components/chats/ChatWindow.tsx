import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import {
  fetchConversationMessages,
  getCurrentAuthUserId,
  PersistentMessage,
  readCachedMessages,
  sendPersistentMessage,
  subscribeToConversationMessages,
} from '@/services/messagesService';

interface PersistentChatBoxProps {
  peerId: string;
  peerName: string;
  currentUserId?: string | null;
}

export default function PersistentChatBox({
  peerId,
  peerName,
  currentUserId: externalUserId,
}: PersistentChatBoxProps) {
  const [myUserId, setMyUserId] = useState<string | null>(externalUserId ?? null);
  const [messages, setMessages] = useState<PersistentMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (externalUserId) {
      setMyUserId(externalUserId);
      return;
    }
    void getCurrentAuthUserId().then((id) => {
      if (id) setMyUserId(id);
    });
  }, [externalUserId]);

  useEffect(() => {
    if (!myUserId || !peerId) {
      setMessages([]);
      return;
    }

    const cached = readCachedMessages(myUserId, peerId);
    if (cached.length > 0) {
      setMessages(cached);
    }

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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setNotice('');

    const res = await sendPersistentMessage({
      senderId: myUserId || '',
      receiverId: peerId,
      body: trimmed,
    });

    setSending(false);

    if (res.errorText) {
      setNotice(res.errorText);
      return;
    }

    if (res.message) {
      setMessages((prev) =>
        prev.some((m) => m.id === res.message!.id) ? prev : [...prev, res.message!]
      );
      setInputText('');
    }
  };

  return (
    <div dir="rtl" className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/85 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 bg-slate-950/70">
        <span className="text-xs font-black text-white">{peerName}</span>
        <span className="text-[10px] text-cyan-400">محفوظ في السحابة</span>
      </div>

      {notice && (
        <div className="bg-amber-950/50 border-b border-amber-500/30 px-3 py-1.5 text-[11px] font-bold text-amber-300 text-center">
          {notice}
        </div>
      )}

      <div className="max-h-80 overflow-y-auto p-3.5 space-y-2.5">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">لا توجد رسائل بعد. ابدأ المحادثة الآن.</p>
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

      <form onSubmit={(e) => void handleSend(e)} className="flex items-center gap-2 border-t border-slate-800 p-2.5 bg-slate-950/70">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`اكتب رسالة إلى ${peerName}...`}
          className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending}
          aria-label="إرسال الرسالة"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-l from-cyan-600 to-purple-600 text-white disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
