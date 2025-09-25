import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { ChatState, ChatRoom, Message, User } from '@/types/chat';
import { useSupabaseChat } from '@/hooks/useSupabaseChat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type ChatAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'JOIN_ROOM'; payload: ChatRoom }
  | { type: 'LEAVE_ROOM' }
  | { type: 'ADD_MESSAGE'; payload: { roomId: string; message: Message } }
  | { type: 'ADD_ROOM'; payload: ChatRoom }
  | { type: 'SET_ROOMS'; payload: ChatRoom[] };

const initialState: ChatState = {
  currentUser: null,
  currentRoom: null,
  rooms: [],
  isConnected: false,
};

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'JOIN_ROOM':
      return { ...state, currentRoom: action.payload, isConnected: true };
    case 'LEAVE_ROOM':
      return { ...state, currentRoom: null, isConnected: false };
    case 'ADD_MESSAGE':
      if (state.currentRoom?.id === action.payload.roomId) {
        return {
          ...state,
          currentRoom: {
            ...state.currentRoom,
            messages: [...state.currentRoom.messages, action.payload.message],
          },
        };
      }
      return state;
    case 'ADD_ROOM':
      return { ...state, rooms: [...state.rooms, action.payload] };
    case 'SET_ROOMS':
      return { ...state, rooms: action.payload };
    default:
      return state;
  }
};

const ChatContext = createContext<{
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  supabaseChat: ReturnType<typeof useSupabaseChat>;
} | null>(null);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const supabaseChat = useSupabaseChat();
  const { user: authUser } = useAuth();

  // Load user profile when auth user changes
  useEffect(() => {
    const loadUserProfile = async () => {
      if (authUser) {
        try {
          const { data: profile, error } = await supabase
            .from('profile')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (!error && profile) {
            const chatUser: User = {
              id: profile.id,
              username: profile.username,
              display_name: profile.display_name,
              profile_picture: profile.profile_picture,
            };
            dispatch({ type: 'SET_USER', payload: chatUser });
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      } else {
        dispatch({ type: 'SET_USER', payload: null });
      }
    };

    loadUserProfile();
  }, [authUser]);

  return (
    <ChatContext.Provider value={{ state, dispatch, supabaseChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
