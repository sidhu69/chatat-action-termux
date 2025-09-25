import React, { useState, useEffect } from 'react';
import { X, User, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from './UserAvatar';
import { useNavigate } from 'react-router-dom';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  profile_picture?: string;
  bio: string | null;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchUserProfile = async () => {
      setIsLoading(true);
      console.log('Fetching profile for userId:', userId);
      
      try {
        // Updated query to include all necessary fields
        const { data, error } = await supabase
          .from('profile')
          .select('id, username, display_name, profile_picture, bio')
          .eq('id', userId)
          .single();

        console.log('Profile query result:', { data, error });

        if (error) {
          console.error('Profile fetch error:', error);
          throw error;
        }
        
        setProfile(data);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        // Don't throw error, just log it and show failure state
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [isOpen, userId]);

  const handleViewFullProfile = () => {
    onClose();
    navigate(`/user/${userId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl max-w-xs w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h2 className="text-sm font-medium text-muted-foreground">Quick View</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary/50 rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground text-xs mt-2">Loading...</p>
            </div>
          ) : profile ? (
            <div className="flex flex-col items-center space-y-3">
              {/* Profile Picture - Clickable */}
              <button
                onClick={handleViewFullProfile}
                className="relative group"
              >
                <UserAvatar
                  profilePicture={profile.profile_picture}
                  username={profile.username}
                  size="lg"
                  className="w-16 h-16 group-hover:ring-2 group-hover:ring-primary transition-all"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-card rounded-full"></div>
              </button>

              {/* User Info - Clickable */}
              <button
                onClick={handleViewFullProfile}
                className="text-center hover:bg-secondary/30 rounded-lg p-2 transition-colors group w-full"
              >
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {profile.display_name || profile.username}
                </h3>
                <p className="text-muted-foreground text-sm">
                  @{profile.username}
                </p>
                
                {/* Short bio preview */}
                {profile.bio && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {profile.bio}
                  </p>
                )}

                {/* View Profile Button */}
                <div className="flex items-center justify-center gap-1 mt-2 text-xs text-primary">
                  View Profile <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-xs">Failed to load profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
