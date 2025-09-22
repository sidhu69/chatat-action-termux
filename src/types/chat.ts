export interface User {
  id: string;
  username: string;
  avatar?: string;
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  username: string;
  timestamp: Date;
  type: 'text' | 'system';
}

export interface ChatRoom {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'private' | 'public';
  createdBy: string;
  participants: User[];
  messages: Message[];
  createdAt: Date;
}

export interface ChatState {
  currentUser: User | null;
  currentRoom: ChatRoom | null;
  rooms: ChatRoom[];
  isConnected: boolean;
}