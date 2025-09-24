import React, { useState } from 'react';
import { User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileModal } from './ProfileModal';

export const ProfileButton: React.FC = () => {
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setIsProfileOpen(true)}
        className="fixed bottom-4 right-4 w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg transition-colors z-50"
      >
        <User className="h-6 w-6 text-white" />
      </button>

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </>
  );
};
