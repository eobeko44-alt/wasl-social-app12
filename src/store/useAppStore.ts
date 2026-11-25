import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Conversation, Post, Story, User } from '@/types';
import { currentUser, mockConversations, mockPosts, mockStories, mockUsers } from '@/data/mockData';

let idCounter = 100;
const nextId = () => `new-${idCounter++}`;

let sharedProfile: User = currentUser;
const profileListeners = new Set<(next: User) => void>();

function setSharedProfile(next: User) {
  sharedProfile = next;
  profileListeners.forEach((fn) => fn(next));
}

export function useAppStore() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [stories, setStories] = useState<Story[]>(mockStories);
  const [profile, setProfile] = useState<User>(sharedProfile);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(mockConversations[0].id);

  useEffect(() => {
    setProfile(sharedProfile);
    profileListeners.add(setProfile);
    return () => {
      profileListeners.delete(setProfile);
    };
  }, []);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unread, 0),
    [conversations]
  );

  const addFriend = useCallback((user: User) => {
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isFriend: true } : u)));
    setPosts((prev) =>
      prev.map((p) =>
        p.author.id === user.id ? { ...p, author: { ...p.author, isFriend: true } } : p
      )
    );
  }, []);

  const addContact = useCallback((user: User) => {
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isContact: true, isFriend: true } : u)));
    setPosts((prev) =>
      prev.map((p) =>
        p.author.id === user.id ? { ...p, author: { ...p.author, isContact: true, isFriend: true } } : p
      )
    );
  }, []);

  const addContactByHandle = useCallback((handle: string): { ok: boolean; error?: string } => {
    const clean = handle.trim().replace(/^@/, '').replace(/\s+/g, '');
    if (!clean) return { ok: false, error: 'الرجاء إدخال رقم هاتف أو اسم مستخدم' };
    const found = users.find(
      (u) =>
        u.username.replace(/^@/, '') === clean.replace(/^@/, '') ||
        u.phone.replace(/\s+/g, '') === clean.replace(/^\+?966/, '+966').replace(/\s+/g, '')
    );
    if (!found) return { ok: false, error: 'لم نجد مستخدماً بهذا الاسم أو الرقم' };
    if (found.isContact) return { ok: false, error: 'هذا الشخص موجود مسبقاً في جهات اتصالك' };
    addContact(found);
    return { ok: true };
  }, [users, addContact]);

  const toggleLike = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likedByMe: !p.likedByMe, likes: p.likedByMe ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  }, []);

  const addComment = useCallback((postId: string, text: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                { id: nextId(), author: sharedProfile, text, createdAt: 'الآن' },
              ],
            }
          : p
      )
    );
  }, []);

  const createPost = useCallback((text: string, imageUrl?: string) => {
    setPosts((prev) => [
      {
        id: nextId(),
        author: sharedProfile,
        text,
        imageUrl,
        createdAt: 'الآن',
        likes: 0,
        likedByMe: false,
        comments: [],
      },
      ...prev,
    ]);
  }, []);

  const sendMessage = useCallback((conversationId: string, text: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: [
                ...c.messages,
                { id: nextId(), senderId: 'me', text, createdAt: 'الآن' },
              ],
            }
          : c
      )
    );
  }, []);

  const openConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c))
    );
  }, []);

  const startConversationWith = useCallback((user: User) => {
    const existing = conversations.find((c) => c.user.id === user.id);
    if (existing) {
      openConversation(existing.id);
      return;
    }
    const id = nextId();
    setConversations((prev) => [{ id, user, messages: [], unread: 0 }, ...prev]);
    setActiveConversationId(id);
  }, [conversations, openConversation]);

  const markStorySeen = useCallback((storyId: string) => {
    setStories((prev) => prev.map((s) => (s.id === storyId ? { ...s, seen: true } : s)));
  }, []);

  const updateProfile = useCallback((updates: Partial<User>) => {
    setSharedProfile({ ...sharedProfile, ...updates });
  }, []);

  const discoverPeople = useMemo(() => users.filter((u) => !u.isFriend), [users]);
  const contacts = useMemo(() => users.filter((u) => u.isContact), [users]);

  return {
    users,
    posts,
    conversations,
    stories,
    profile,
    activeConversationId,
    totalUnread,
    discoverPeople,
    contacts,
    addFriend,
    addContact,
    addContactByHandle,
    toggleLike,
    addComment,
    createPost,
    sendMessage,
    openConversation,
    startConversationWith,
    markStorySeen,
    updateProfile,
  };
}

export type AppStore = ReturnType<typeof useAppStore>;
