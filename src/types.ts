export interface User {
  id: string;
  name: string;
  username: string;
  phone: string;
  avatar: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string;
  isPublic?: boolean;
  isFriend?: boolean;
  isContact?: boolean;
}

export interface Comment {
  id: string;
  author: User;
  text: string;
  createdAt: string;
}

export interface Post {
  id: string;
  author: User;
  text: string;
  imageUrl?: string;
  createdAt: string;
  likes: number;
  likedByMe: boolean;
  comments: Comment[];
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  user: User;
  messages: Message[];
  unread: number;
}

export interface Story {
  id: string;
  user: User;
  imageUrl: string;
  createdAt: string;
  seen: boolean;
}
