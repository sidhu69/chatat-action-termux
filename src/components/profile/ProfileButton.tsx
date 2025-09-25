import React from 'react';
import { User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChat } from '@/contexts/ChatContext';

export const ProfileButton: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { supabaseChat } = useChat();

  // Only hide if not logged in or already on profile page
  if (!user || location.pathname === '/profile') {
    return null;
  }

  return (
    <button
      onClick={() => navigate('/profile')}
      className="fixed bottom-4 right-4 w-14 h-14 bg-gradient-primary hover:opacity-90 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 z-50 backdrop-blur-sm border border-white/20"
    >
      <User className="h-6 w-6 text-white"/>
    </button>
  );
};
