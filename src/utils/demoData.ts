import { ChatRoom, Message } from '@/types/chat';

export const createDemoRooms = (): ChatRoom[] => {
  const now = new Date();
  
  return [
    {
      id: '1',
      code: 'TECH42',
      name: '💻 Tech Talk',
      description: 'Discuss the latest in technology, programming, and innovation',
      type: 'public',
      createdBy: 'demo-user-1',
      participants: [
        { id: 'demo-user-1', username: 'CodeMaster' },
        { id: 'demo-user-2', username: 'DevGuru' },
        { id: 'demo-user-3', username: 'TechNinja' },
      ],
      messages: [
        {
          id: '1',
          content: 'Welcome to Tech Talk! 💻',
          userId: 'system',
          username: 'System',
          timestamp: new Date(now.getTime() - 3600000),
          type: 'system'
        },
        {
          id: '2',
          content: 'Hey everyone! What are you working on today?',
          userId: 'demo-user-1',
          username: 'CodeMaster',
          timestamp: new Date(now.getTime() - 3000000),
          type: 'text'
        },
        {
          id: '3',
          content: 'Just finished a React project! The new hooks are amazing 🚀',
          userId: 'demo-user-2',
          username: 'DevGuru',
          timestamp: new Date(now.getTime() - 2400000),
          type: 'text'
        }
      ],
      createdAt: new Date(now.getTime() - 3600000),
    },
    {
      id: '2',
      code: 'GAME99',
      name: '🎮 Gaming Zone',
      description: 'Chat about your favorite games, share tips, and find gaming buddies',
      type: 'public',
      createdBy: 'demo-user-4',
      participants: [
        { id: 'demo-user-4', username: 'GameLover' },
        { id: 'demo-user-5', username: 'PixelHunter' },
      ],
      messages: [
        {
          id: '1',
          content: 'Welcome to Gaming Zone! 🎮',
          userId: 'system',
          username: 'System',
          timestamp: new Date(now.getTime() - 7200000),
          type: 'system'
        },
        {
          id: '2',
          content: 'Anyone playing the new indie game that just released?',
          userId: 'demo-user-4',
          username: 'GameLover',
          timestamp: new Date(now.getTime() - 1800000),
          type: 'text'
        }
      ],
      createdAt: new Date(now.getTime() - 7200000),
    },
    {
      id: '3',
      code: 'MUSIC7',
      name: '🎵 Music Lovers',
      description: 'Share your favorite songs, discover new artists, and talk music',
      type: 'public',
      createdBy: 'demo-user-6',
      participants: [
        { id: 'demo-user-6', username: 'MelodyMaker' },
        { id: 'demo-user-7', username: 'BeatDrop' },
        { id: 'demo-user-8', username: 'SoundWave' },
        { id: 'demo-user-9', username: 'RhythmKing' },
      ],
      messages: [
        {
          id: '1',
          content: 'Welcome to Music Lovers! 🎵',
          userId: 'system',
          username: 'System',
          timestamp: new Date(now.getTime() - 5400000),
          type: 'system'
        },
        {
          id: '2',
          content: 'Just discovered this amazing jazz fusion track! Anyone else into that genre?',
          userId: 'demo-user-6',
          username: 'MelodyMaker',
          timestamp: new Date(now.getTime() - 900000),
          type: 'text'
        },
        {
          id: '3',
          content: 'Love jazz fusion! Have you heard of Snarky Puppy?',
          userId: 'demo-user-7',
          username: 'BeatDrop',
          timestamp: new Date(now.getTime() - 600000),
          type: 'text'
        }
      ],
      createdAt: new Date(now.getTime() - 5400000),
    }
  ];
};