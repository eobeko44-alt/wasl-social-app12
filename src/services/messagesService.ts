import { supabase } from '@/lib/supabase';

export interface PersistentMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
}

const LOCAL_MSG_PREFIX = 'wasl_messages_cache_v1_';
const MAX_CACHED_MESSAGES = 80;

function getCacheKey(userA: string, userB: string): string {
  const pair = [userA, userB].sort().join('__');
  return `${LOCAL_MSG_PREFIX}${pair}`;
}

export function readCachedMessages(userA: string, userB: string): PersistentMessage[] {
  if (!userA || !userB) return [];
  try {
    const raw = localStorage.getItem(getCacheKey(userA, userB));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PersistentMessage[]) : [];
  } catch {
    return [];
  }
}

export function writeCachedMessages(
  userA: string,
  userB: string,
  messages: PersistentMessage[]
): void {
  if (!userA || !userB) return;
  try {
    const trimmed =
      messages.length > MAX_CACHED_MESSAGES
        ? messages.slice(messages.length - MAX_CACHED_MESSAGES)
        : messages;
    localStorage.setItem(getCacheKey(userA, userB), JSON.stringify(trimmed));
  } catch {
    // تجاهل خطأ التخزين المحلي
  }
}

export async function getCurrentAuthUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchConversationMessages(
  currentUserId: string,
  otherUserId: string
): Promise<PersistentMessage[]> {
  if (!currentUserId || !otherUserId) return [];

  const cached = readCachedMessages(currentUserId, otherUserId);

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, body, created_at')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true })
      .limit(60);

    if (error || !Array.isArray(data)) {
      return cached;
    }

    const list = data as PersistentMessage[];
    writeCachedMessages(currentUserId, otherUserId, list);
    return list;
  } catch {
    return cached;
  }
}

export async function sendPersistentMessage(params: {
  senderId: string;
  receiverId: string;
  body: string;
}): Promise<{ message: PersistentMessage | null; errorText?: string }> {
  const trimmed = params.body.trim();
  if (!trimmed) {
    return { message: null, errorText: 'اكتب رسالة أولاً' };
  }
  if (!params.senderId) {
    return {
      message: null,
      errorText: 'يجب تسجيل الدخول بحساب فعلي لحفظ الرسائل في السحابة',
    };
  }
  if (!params.receiverId) {
    return { message: null, errorText: 'اختر جهة اتصال أولاً' };
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: params.senderId,
        receiver_id: params.receiverId,
        body: trimmed,
      })
      .select('id, sender_id, receiver_id, body, created_at')
      .single();

    if (error || !data) {
      return {
        message: null,
        errorText: error?.message || 'تعذر حفظ الرسالة في قاعدة البيانات',
      };
    }

    const created = data as PersistentMessage;
    const currentCache = readCachedMessages(params.senderId, params.receiverId);
    if (!currentCache.some((m) => m.id === created.id)) {
      writeCachedMessages(params.senderId, params.receiverId, [...currentCache, created]);
    }

    return { message: created };
  } catch {
    return { message: null, errorText: 'حدث خطأ أثناء إرسال الرسالة' };
  }
}

export function subscribeToConversationMessages(
  currentUserId: string,
  otherUserId: string,
  onNewMessage: (msg: PersistentMessage) => void
): () => void {
  if (!currentUserId || !otherUserId) {
    return () => {};
  }

  const channel = supabase
    .channel(`wasl-chat-${[currentUserId, otherUserId].sort().join('-')}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        const row = payload.new as PersistentMessage | undefined;
        if (!row) return;

        const isBetweenUsers =
          (row.sender_id === currentUserId && row.receiver_id === otherUserId) ||
          (row.sender_id === otherUserId && row.receiver_id === currentUserId);

        if (!isBetweenUsers) return;

        const currentCache = readCachedMessages(currentUserId, otherUserId);
        if (!currentCache.some((m) => m.id === row.id)) {
          writeCachedMessages(currentUserId, otherUserId, [...currentCache, row]);
        }
        onNewMessage(row);
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
