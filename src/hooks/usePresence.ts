import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/chat';

export const usePresence = (roomId: string | null, user: User | null) => {
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (!roomId || !user) return;

    const channel = supabase
      .channel(`room-presence:${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const participantList = Object.values(newState).flat().map((presence: any) => ({
          id: presence.user_id,
          username: presence.username,
          joinedAt: new Date(presence.joined_at),
          isActive: true,
        }));
        setParticipants(participantList);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user's presence
          await channel.track({
            user_id: user.id,
            username: user.username,
            joined_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [roomId, user]);

  return { participants, participantCount: participants.length };
};
