import React from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  profilePicture?: string;
  username: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  profilePicture, 
  username, 
  size = 'sm',
  onClick 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={onClick}
      title={username}
    >
      {profilePicture ? (
        <img
          src={profilePicture}
          alt={`${username}'s profile`}
          className="w-full h-full object-cover"
        />
      ) : (
        <User className={`${iconSizes[size]} text-gray-400`} />
      )}
    </div>
  );
};
