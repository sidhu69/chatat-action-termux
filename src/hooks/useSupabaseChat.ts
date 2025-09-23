import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ChatRoom, Message, User } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';

export const useSupabaseChat = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  // Fetch all public rooms
  const fetchPublicRooms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const roomsWithMessages = await Promise.all(
        (data || []).map(async (room) => {
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', room.id)
            .order('created_at', { ascending: true });

          if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            return {
              id: room.id,
              name: room.name,
              code: room.code,
              type: (room.is_public ? 'public' : 'private') as 'public' | 'private',
              createdBy: room.created_by,
              participants: [], // Will be populated as needed
              messages: [],
              createdAt: new Date(room.created_at),
            };
          }

          return {
            id: room.id,
            name: room.name,
            code: room.code,
            type: (room.is_public ? 'public' : 'private') as 'public' | 'private',
            createdBy: room.created_by,
            participants: [], // Will be populated as needed
            messages: (messages || []).map((msg): Message => ({
              id: msg.id,
              content: msg.content,
              username: msg.username,
              userId: msg.user_id,
              timestamp: new Date(msg.created_at),
              type: 'text',
            })),
            createdAt: new Date(room.created_at),
          };
        })
      );

      setRooms(roomsWithMessages);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: "Error",
        description: "Failed to fetch chat rooms",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Create a new room
  const createRoom = useCallback(async (name: string, isPublic: boolean, user: User) => {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('chat_rooms')
        .insert({
          name,
          code,
          is_public: isPublic,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newRoom: ChatRoom = {
        id: data.id,
        name: data.name,
        code: data.code,
        type: (data.is_public ? 'public' : 'private') as 'public' | 'private',
        createdBy: data.created_by,
        participants: [],
        messages: [],
        createdAt: new Date(data.created_at),
      };

      if (data.is_public) {
        setRooms(prev => [newRoom, ...prev]);
      }

      toast({
        title: "Success",
        description: `Room created with code: ${code}`,
      });

      return newRoom;
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Join a room by code
  const joinRoom = useCallback(async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "Error",
            description: "Room not found. Please check the code.",
            variant: "destructive",
          });
          return null;
        }
        throw error;
      }

      // Fetch messages for this room
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', data.id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const room: ChatRoom = {
        id: data.id,
        name: data.name,
        code: data.code,
        type: (data.is_public ? 'public' : 'private') as 'public' | 'private',
        createdBy: data.created_by,
        participants: [],
        messages: (messages || []).map((msg): Message => ({
          id: msg.id,
          content: msg.content,
          username: msg.username,
          userId: msg.user_id,
          timestamp: new Date(msg.created_at),
          type: 'text',
        })),
        createdAt: new Date(data.created_at),
      };

      setCurrentRoom(room);
      setIsConnected(true);
      return room;
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Send a message
  const sendMessage = useCallback(async (content: string, user: User, roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          username: user.username,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Message will be received via realtime subscription
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Set up realtime subscription for current room
  useEffect(() => {
    if (!currentRoom) return;

    const channel = supabase
      .channel(`room:${currentRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${currentRoom.id}`,
        },
        (payload) => {
          const newMessage: Message = {
            id: payload.new.id,
            content: payload.new.content,
            username: payload.new.username,
            userId: payload.new.user_id,
            timestamp: new Date(payload.new.created_at),
            type: 'text',
          };

          setCurrentRoom(prev => prev ? {
            ...prev,
            messages: [...prev.messages, newMessage],
          } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom]);

  // Initialize public rooms on mount
  useEffect(() => {
    fetchPublicRooms();
  }, [fetchPublicRooms]);

  return {
    rooms,
    currentRoom,
    isConnected,
    createRoom,
    joinRoom,
    sendMessage,
    setCurrentRoom,
    setIsConnected,
    fetchPublicRooms,
  };
};
