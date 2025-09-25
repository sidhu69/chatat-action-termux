import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Memoize currentRoom.id to avoid unnecessary re-renders
  const currentRoomId = useMemo(() => currentRoom?.id, [currentRoom?.id]);

  // Auto-cleanup empty public rooms
  const cleanupEmptyRooms = useCallback(async () => {
    try {
      console.log('Starting empty room cleanup check...');

      // Get all public rooms
      const { data: publicRooms, error } = await supabase
        .from('chat_rooms')
        .select('id, name, code, created_at')
        .eq('is_public', true);

      if (error) throw error;

      if (!publicRooms || publicRooms.length === 0) {
        console.log('No public rooms to check');
        return;
      }

      // Check each room for participants
      const roomsToDelete: string[] = [];

      for (const room of publicRooms) {
        const participants = roomParticipants[room.id] || [];
        const hasParticipants = participants.length > 0;

        // Only delete rooms that are older than 5 minutes and have no participants
        const roomAge = Date.now() - new Date(room.created_at).getTime();
        const isOldEnough = roomAge > 5 * 60 * 1000; // 5 minutes

        if (!hasParticipants && isOldEnough) {
          console.log(`Marking room ${room.name} (${room.code}) for deletion - no participants and older than 5 minutes`);
          roomsToDelete.push(room.id);
        }
      }

      if (roomsToDelete.length === 0) {
        console.log('No empty rooms to delete');
        return;
      }

      // Delete messages first (foreign key constraint)
      for (const roomId of roomsToDelete) {
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .eq('room_id', roomId);

        if (messagesError) {
          console.error(`Error deleting messages for room ${roomId}:`, messagesError);
        }
      }

      // Then delete the rooms
      const { error: deleteError } = await supabase
        .from('chat_rooms')
        .delete()
        .in('id', roomsToDelete);

      if (deleteError) {
        console.error('Error deleting empty rooms:', deleteError);
        return;
      }

      console.log(`Successfully deleted ${roomsToDelete.length} empty rooms`);

      // Update local state to remove deleted rooms
      setRooms(prevRooms => prevRooms.filter(room => !roomsToDelete.includes(room.id)));

      // Clean up local participant tracking for deleted rooms
      setRoomParticipants(prev => {
        const updated = { ...prev };
        roomsToDelete.forEach(roomId => {
          delete updated[roomId];
        });
        return updated;
      });

    } catch (error) {
      console.error('Error during room cleanup:', error);
    }
  }, [roomParticipants]);

  // Track participants for a room with better real-time updates
  const trackRoomParticipants = useCallback((roomId: string, user?: User) => {
    // Don't create multiple channels for the same room
    if (presenceChannels[roomId]) {
      console.log(`Presence channel already exists for room ${roomId}`);
      return presenceChannels[roomId];
    }

    console.log(`Setting up presence tracking for room ${roomId}`, user ? `with user ${user.username}` : 'without user');

    const channel = supabase
      .channel(`room-presence:${roomId}`, {
        config: {
          presence: {
            key: user?.id || 'anonymous'
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        console.log('Raw presence state:', newState);

        const participantList = Object.entries(newState).map(([key, presences]) => {
          const presence = Array.isArray(presences) ? presences[0] : presences;
          return {
            id: presence.user_id,
            username: presence.username,
            joinedAt: new Date(presence.joined_at),
            isActive: true,
          };
        });

        console.log(`Presence sync for room ${roomId}:`, participantList);

        setRoomParticipants(prev => ({
          ...prev,
          [roomId]: participantList
        }));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined room:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left room:', key, leftPresences);

        // Trigger cleanup check when someone leaves
        setTimeout(() => {
          cleanupEmptyRooms();
        }, 10000); // Wait 10 seconds after someone leaves to check for cleanup
      })
      .subscribe(async (status) => {
        console.log(`Presence subscription status for room ${roomId}:`, status);
        if (status === 'SUBSCRIBED' && user) {
          console.log(`Tracking user ${user.username} in room ${roomId}`);
          const trackResult = await channel.track({
            user_id: user.id,
            username: user.username,
            joined_at: new Date().toISOString(),
          });
          console.log(`User ${user.username} tracking result:`, trackResult);

          // Force immediate sync after tracking
          setTimeout(() => {
            const currentState = channel.presenceState();
            console.log('Immediate sync check:', currentState);
          }, 1000);
        }
      });

    setPresenceChannels(prev => ({ ...prev, [roomId]: channel }));
    return channel;
  }, [presenceChannels, cleanupEmptyRooms]);

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
            display_name: payload.new.display_name || payload.new.username,
            profile_picture: payload.new.profile_picture || null,
          };

          // Update current room if it matches
          setCurrentRoom(prev => {
            if (prev && prev.id === roomId) {
              // Check if message already exists to prevent duplicates
              const messageExists = prev.messages.some(msg =>
                msg.id === newMessage.id ||
                (msg.content === newMessage.content &&
                 msg.userId === newMessage.userId &&
                 Math.abs(msg.timestamp.getTime() - newMessage.timestamp.getTime()) < 5000)
              );

              if (!messageExists) {
                console.log('Adding new message to room:', newMessage);
                return {
                  ...prev,
                  messages: [...prev.messages, newMessage],
                };
              } else {
                console.log('Message already exists, skipping duplicate');
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
    if (currentRoomId && roomParticipants[currentRoomId]) {
      const updatedParticipants = roomParticipants[currentRoomId];
      console.log(`Updating current room participants:`, updatedParticipants);
      setCurrentRoom(prev => prev ? {
        ...prev,
        participants: updatedParticipants,
        activeParticipantCount: updatedParticipants.length,
      } : null);
    }
  }, [roomParticipants, currentRoomId]);

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

          // Get current participants at fetch time
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
              display_name: msg.display_name || msg.username,
              profile_picture: msg.profile_picture || null,
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
      // Validate user ID is a proper UUID
      if (!user.id || typeof user.id !== 'string') {
        throw new Error('Invalid user ID');
      }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      console.log('Creating room with:', { name, code, isPublic, userId: user.id });
      console.log('User ID type:', typeof user.id, 'User ID value:', user.id);

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
      console.log('Setting up channels for room creator');
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
          display_name: msg.display_name || msg.username,
          profile_picture: msg.profile_picture || null,
        })),
        createdAt: new Date(data.created_at),
      };

      setCurrentRoom(room);
      setIsConnected(true);

      // Start tracking presence and messages for this user
      trackRoomParticipants(room.id, user);
      setupMessageSubscription(room.id);

      toast({
        title: "Success",
        description: `Joined ${room.name} successfully!`,
      });

      return room;
    } catch (error) {
      console.error('Full error details:', error);
      toast({
        title: "Error",
        description: `Failed to join room: ${(error as Error).message}`,
        variant: "destructive",
      });
      return null;
    }
  }, [toast, trackRoomParticipants, setupMessageSubscription, roomParticipants]);

  // Send a message to the current room
  const sendMessage = useCallback(async (content: string, user: User) => {
    if (!currentRoom || !user) {
      console.error('Cannot send message: no current room or user');
      return false;
    }

    try {
      console.log('Sending message:', { content, room: currentRoom.name, user: user.username });

      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          room_id: currentRoom.id,
          user_id: user.id,
          username: user.username,
          display_name: user.display_name || user.username,
          profile_picture: user.profile_picture || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      console.log('Message sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return false;
    }
  }, [currentRoom, toast]);

  // Leave the current room
  const leaveRoom = useCallback(async () => {
    if (!currentRoom) return;

    const roomId = currentRoom.id;

    try {
      // Unsubscribe from presence channel
      if (presenceChannels[roomId]) {
        await presenceChannels[roomId].unsubscribe();
        setPresenceChannels(prev => {
          const updated = { ...prev };
          delete updated[roomId];
          return updated;
        });
      }

      // Unsubscribe from message channel
      if (messageChannels[roomId]) {
        await messageChannels[roomId].unsubscribe();
        setMessageChannels(prev => {
          const updated = { ...prev };
          delete updated[roomId];
          return updated;
        });
      }

      // Clear current room
      setCurrentRoom(null);
      setIsConnected(false);

      console.log(`Left room: ${currentRoom.name}`);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }, [currentRoom, presenceChannels, messageChannels]);

  // Initialize by fetching public rooms
  useEffect(() => {
    fetchPublicRooms();
  }, [fetchPublicRooms]);

  return {
    rooms,
    currentRoom,
    isConnected,
    roomParticipants,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    fetchPublicRooms,
  };
};
