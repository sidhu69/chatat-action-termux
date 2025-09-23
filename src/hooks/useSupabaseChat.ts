import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ChatRoom, Message, User, Participant } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  const [presenceChannels, setPresenceChannels] = useState<{[key: string]: RealtimeChannel}>({});
  const [messageChannels, setMessageChannels] = useState<{[key: string]: RealtimeChannel}>({});
  const { toast } = useToast();

  // Track participants for a room with better real-time updates
  const trackRoomParticipants = useCallback((roomId: string, user?: User) => {
    // Don't create multiple channels for the same room
    if (presenceChannels[roomId]) {
      console.log(`Presence channel already exists for room ${roomId}`);
      return presenceChannels[roomId];
    }

    console.log(`Setting up presence tracking for room ${roomId}`, user ? `with user ${user.username}` : 'without user');

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

        console.log(`Presence sync for room ${roomId}:`, participantList);

        setRoomParticipants(prev => ({
          ...prev,
          [roomId]: participantList
        }));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined room:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left room:', leftPresences);
      })
      .subscribe(async (status) => {
        console.log(`Presence subscription status for room ${roomId}:`, status);
        if (status === 'SUBSCRIBED' && user) {
          const trackResult = await channel.track({
            user_id: user.id,
            username: user.username,
            joined_at: new Date().toISOString(),
          });
          console.log(`User ${user.username} tracking result:`, trackResult);
        }
      });

    setPresenceChannels(prev => ({ ...prev, [roomId]: channel }));
    return channel;
  }, [presenceChannels]);

  // Set up message subscription for a room
  const setupMessageSubscription = useCallback((roomId: string) => {
    // Don't create multiple message channels for the same room
    if (messageChannels[roomId]) {
      console.log(`Message channel already exists for room ${roomId}`);
      return messageChannels[roomId];
    }

    console.log(`Setting up message subscription for room ${roomId}`);

    const channel = supabase
      .channel(`room-messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('New message received via subscription:', payload.new);
          const newMessage: Message = {
            id: payload.new.id,
            content: payload.new.content,
            username: payload.new.username,
            userId: payload.new.user_id,
            timestamp: new Date(payload.new.created_at),
            type: 'text',
          };

          // Update current room if it matches
          setCurrentRoom(prev => {
            if (prev && prev.id === roomId) {
              // Check if message already exists to prevent duplicates
              const messageExists = prev.messages.some(msg => msg.id === newMessage.id);
              if (!messageExists) {
                return {
                  ...prev,
                  messages: [...prev.messages, newMessage],
                };
              }
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        console.log(`Message subscription status for room ${roomId}:`, status);
      });

    setMessageChannels(prev => ({ ...prev, [roomId]: channel }));
    return channel;
  }, [messageChannels]);

  // Update current room participants when roomParticipants changes
  useEffect(() => {
    if (currentRoom && roomParticipants[currentRoom.id]) {
      const updatedParticipants = roomParticipants[currentRoom.id];
      setCurrentRoom(prev => prev ? {
        ...prev,
        participants: updatedParticipants,
        activeParticipantCount: updatedParticipants.length,
      } : null);
    }
  }, [roomParticipants, currentRoom?.id]);

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
  }, [toast, roomParticipants]);

  // Update rooms when participants change
  useEffect(() => {
    setRooms(prevRooms =>
      prevRooms.map(room => ({
        ...room,
        participants: roomParticipants[room.id] || [],
        activeParticipantCount: (roomParticipants[room.id] || []).length,
      }))
    );
  }, [roomParticipants]);

  // Create a new room and automatically join it
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

      // Set the room first
      setCurrentRoom(newRoom);
      setIsConnected(true);

      // Start tracking presence and messages for the creator
      trackRoomParticipants(newRoom.id, user);
      setupMessageSubscription(newRoom.id);

      // Add to rooms list if public
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
  }, [toast, trackRoomParticipants, setupMessageSubscription]);

  // Join a room by code with proper presence tracking
  const joinRoom = useCallback(async (code: string, user: User) => {
    try {
      console.log(`User ${user.username} attempting to join room with code: ${code}`);

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

      // Start tracking presence and messages for this room
      trackRoomParticipants(room.id, user);
      setupMessageSubscription(room.id);

      console.log(`Successfully joined room ${room.name}`);
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
  }, [toast, roomParticipants, trackRoomParticipants, setupMessageSubscription]);

  // Send a message with immediate local update
  const sendMessage = useCallback(async (content: string, user: User, roomId: string) => {
    try {
      console.log(`Sending message from ${user.username} to room ${roomId}:`, content);

      // Create optimistic message for immediate UI update
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        content: content,
        username: user.username,
        userId: user.id,
        timestamp: new Date(),
        type: 'text',
      };

      // Add message to current room immediately for better UX
      setCurrentRoom(prev => prev ? {
        ...prev,
        messages: [...prev.messages, tempMessage],
      } : null);

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

      if (error) {
        console.error('Error sending message:', error);
        // Remove the temp message on error
        setCurrentRoom(prev => prev ? {
          ...prev,
          messages: prev.messages.filter(msg => msg.id !== tempMessage.id),
        } : null);
        throw error;
      }

      // Replace temp message with real message
      setCurrentRoom(prev => prev ? {
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === tempMessage.id 
            ? {
                id: data.id,
                content: data.content,
                username: data.username,
                userId: data.user_id,
                timestamp: new Date(data.created_at),
                type: 'text' as const,
              }
            : msg
        ),
      } : null);

      console.log('Message sent successfully:', data);
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

  // Enhanced leave room function to properly cleanup presence and messages
  const leaveRoom = useCallback(() => {
    if (currentRoom) {
      console.log(`Leaving room ${currentRoom.id}`);
      
      // Cleanup presence channel
      if (presenceChannels[currentRoom.id]) {
        presenceChannels[currentRoom.id].untrack();
        supabase.removeChannel(presenceChannels[currentRoom.id]);
      }

      // Cleanup message channel
      if (messageChannels[currentRoom.id]) {
        supabase.removeChannel(messageChannels[currentRoom.id]);
      }
      
      // Remove from channels
      setPresenceChannels(prev => {
        const newChannels = { ...prev };
        delete newChannels[currentRoom.id];
        return newChannels;
      });

      setMessageChannels(prev => {
        const newChannels = { ...prev };
        delete newChannels[currentRoom.id];
        return newChannels;
      });

      // Clear participants for this room
      setRoomParticipants(prev => {
        const newParticipants = { ...prev };
        delete newParticipants[currentRoom.id];
        return newParticipants;
      });
    }

    setCurrentRoom(null);
    setIsConnected(false);
  }, [currentRoom, presenceChannels, messageChannels]);

  // Initialize public rooms on mount
  useEffect(() => {
    fetchPublicRooms();
  }, [fetchPublicRooms]);

  // Cleanup all channels on unmount
  useEffect(() => {
    return () => {
      Object.values(presenceChannels).forEach(channel => {
        channel.untrack();
        supabase.removeChannel(channel);
      });
      Object.values(messageChannels).forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [presenceChannels, messageChannels]);

  return {
    rooms,
    currentRoom,
    isConnected,
    createRoom,
    joinRoom,
    sendMessage,
    setCurrentRoom: leaveRoom,
    setIsConnected,
    fetchPublicRooms,
    roomParticipants,
  };
};
