import { useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { UsernameSetup } from '@/components/UsernameSetup';
import { ChatDashboard } from '@/components/ChatDashboard';
import { ChatInterface } from '@/components/ChatInterface';
import { createDemoRooms } from '@/utils/demoData';

const Index = () => {
  const { state, supabaseChat } = useChat();

  // Show username setup if no user is set
  if (!state.currentUser) {
    return <UsernameSetup />;
  }

  // Show chat interface if in a room
  if (supabaseChat.currentRoom && supabaseChat.isConnected) {
    return <ChatInterface />;
  }

  // Show dashboard by default
  return <ChatDashboard />;
};

export default Index;
