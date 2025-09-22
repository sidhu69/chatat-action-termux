import { useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { UsernameSetup } from '@/components/UsernameSetup';
import { ChatDashboard } from '@/components/ChatDashboard';
import { ChatInterface } from '@/components/ChatInterface';
import { createDemoRooms } from '@/utils/demoData';

const Index = () => {
  const { state, dispatch } = useChat();

  // Initialize demo rooms on first load
  useEffect(() => {
    if (state.rooms.length === 0) {
      const demoRooms = createDemoRooms();
      dispatch({ type: 'SET_ROOMS', payload: demoRooms });
    }
  }, [state.rooms.length, dispatch]);

  // Show username setup if no user is set
  if (!state.currentUser) {
    return <UsernameSetup />;
  }

  // Show chat interface if in a room
  if (state.currentRoom && state.isConnected) {
    return <ChatInterface />;
  }

  // Show dashboard by default
  return <ChatDashboard />;
};

export default Index;
