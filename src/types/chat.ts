export interface User {
  id: string;
  username: string;
  display_name?: string;
  profile_picture?: string;
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  username: string;
  display_name?: string;
  profile_picture?: string;
  timestamp: Date;
  type: 'text' | 'system';
}

export interface Participant {
  id: string;
  username: string;
  display_name?: string;
  profile_picture?: string;
  joinedAt: Date;
  isActive: boolean;
}

export interface ChatRoom {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'private' | 'public';
  createdBy: string;
  participants: Participant[];
  activeParticipantCount: number;
  messages: Message[];
  createdAt: Date;
}

export interface ChatState {
  currentUser: User | null;
  currentRoom: ChatRoom | null;
  rooms: ChatRoom[];
  isConnected: boolean;
}
