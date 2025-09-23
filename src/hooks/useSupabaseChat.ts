import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ChatRoom, Message, User, Participant } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';

// Define the presence state type
interface PresenceState {
  user_id: string;
  username: string;
  joined_at: string;
}

export const useSupabaseChat = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomParticipants, setRoomParticipants] = useState<{[key: string]: Participant[]}>({});
  const [presenceChannels, setPresenceChannels] = useState<{[key: string]: any}>({});
  const { toast } = useToast();

  // Track participants for a room with better real-time updates
  const trackRoomParticipants = useCallback((roomId: string, user?: User) => {
    // Don't create multiple channels for the same room
    if (presenceChannels[roomId]) {
      return presenceChannels[roomId];
    }

    const channel = supabase
      .channel(`room-presence:${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const participantList = Object.values(newState).flat().map((presence: PresenceState) => ({
          id: presence.user_id,
          username: presence.username,
          joinedAt: new Date(presence.joined_at),
          isActive: true,
        }));

        setRoomParticipants(prev => ({
          ...prev,
          [roomId]: participantList
        }));

        console.log(`Room ${roomId} participants updated:`, participantList.length);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined room:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left room:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          // Track current user's presence
          await channel.track({
            user_id: user.id,
            username: user.username,
            joined_at: new Date().toISOString(),
          });
          console.log(`User ${user.username} tracking presence in room ${roomId}`);
        }
      });

    setPresenceChannels(prev => ({ ...prev, [roomId]: channel }));
    return channel;
  }, [presenceChannels]);

  // Enhanced function to update current room participants in real-time
  const updateCurrentRoomParticipants = useCallback(() => {
    if (currentRoom && roomParticipants[currentRoom.id]) {
      setCurrentRoom(prev => prev ? {
        ...prev,
        participants: roomParticipants[currentRoom.id],
        activeParticipantCount: roomParticipants[currentRoom.id].length,
      } : null);
    }
  }, [currentRoom, roomParticipants]);

  // Update current room participants when they change
  useEffect(() => {
    updateCurrentRoomParticipants();
  }, [updateCurrentRoomParticipants]);

  // Fetch all public rooms with participant counts
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
          }

          // Track participants for this room (without user tracking for public rooms)
          trackRoomParticipants(room.id);

          const participants = roomParticipants[room.id] || [];

          return {
            id: room.id,
            name: room.name,
            code: room.code,
            type: (room.is_public ? 'public' : 'private') as 'public' | 'private',
            createdBy: room.created_by,
            participants,
            activeParticipantCount: participants.length,
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
  }, [toast, trackRoomParticipants, roomParticipants]);

  // Update room participant counts when participants change
  useEffect(() => {
    setRooms(prevRooms =>
      prevRooms.map(room => ({
        ...room,
        participants: roomParticipants[room.id] || [],
        activeParticipantCount: (roomParticipants[room.id] || []).length,
      }))
    );
  }, [roomParticipants]);

  // Create a new room
  const createRoom = useCallback(async (name: string, isPublic: boolean, user: User) => {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      console.log('Creating room with:', { name, code, isPublic, userId: user.id });

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

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      console.log('Room created successfully:', data);

      const newRoom: ChatRoom = {
        id: data.id,
        name: data.name,
        code: data.code,
        type: (data.is_public ? 'public' : 'private') as 'public' | 'private',
        createdBy: data.created_by,
        participants: [],
        activeParticipantCount: 0,
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
      console.error('Full error details:', error);
      toast({
        title: "Error",
        description: `Failed to create room: ${(error as Error).message || 'Unknown error'}`,
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Join a room by code with proper presence tracking
  const joinRoom = useCallback(async (code: string, user?: User) => {
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
        participants: roomParticipants[data.id] || [],
        activeParticipantCount: (roomParticipants[data.id] || []).length,
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

      // Start tracking presence for this room with the current user
      if (user) {
        trackRoomParticipants(room.id, user);
      }

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
  }, [toast, roomParticipants, trackRoomParticipants]);

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

  // Enhanced leave room function to properly cleanup presence
  const leaveRoom = useCallback(() => {
    if (currentRoom && presenceChannels[currentRoom.id]) {
      // Untrack presence and remove channel
      presenceChannels[currentRoom.id].untrack();
      supabase.removeChannel(presenceChannels[currentRoom.id]);
      
      // Remove from presence channels
      setPresenceChannels(prev => {
        const newChannels = { ...prev };
        delete newChannels[currentRoom.id];
        return newChannels;
      });
    }

    setCurrentRoom(null);
    setIsConnected(false);
  }, [currentRoom, presenceChannels]);

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

  // Cleanup all presence channels on unmount
  useEffect(() => {
    return () => {
      Object.values(presenceChannels).forEach(channel => {
        channel.untrack();
        supabase.removeChannel(channel);
      });
    };
  }, [presenceChannels]);

  return {
    rooms,
    currentRoom,
    isConnected,
    createRoom,
    joinRoom: (code: string) => joinRoom(code),
    sendMessage,
    setCurrentRoom: leaveRoom, // Use enhanced leave room function
    setIsConnected,
    fetchPublicRooms,
    roomParticipants,
  };
};
