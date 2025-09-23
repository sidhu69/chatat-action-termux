import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Participant } from '@/types/chat';

// Define the presence state type for Supabase realtime
interface PresenceState {
  user_id: string;
  username: string;
  joined_at: string;
}

export const usePresence = (roomId: string | null, user: User | null) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!roomId || !user) {
      setParticipants([]);
      return;
    }

    setIsLoading(true);
    console.log(`Setting up presence tracking for room ${roomId} and user ${user.username}`);

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
        setParticipants(participantList);
        setIsLoading(false);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', newPresences);
        // Optionally show toast notification here
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', leftPresences);
        // Optionally show toast notification here
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user's presence
          const trackResult = await channel.track({
            user_id: user.id,
            username: user.username,
            joined_at: new Date().toISOString(),
          });
          console.log(`User ${user.username} tracking presence in room ${roomId}:`, trackResult);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to presence channel');
          setIsLoading(false);
        }
      });

    return () => {
      console.log(`Cleaning up presence for room ${roomId}`);
      channel.untrack();
      supabase.removeChannel(channel);
      setParticipants([]);
      setIsLoading(false);
    };
  }, [roomId, user]);

  return { 
    participants, 
    participantCount: participants.length,
    isLoading,
    onlineUsers: participants.map(p => p.username)
  };
};
