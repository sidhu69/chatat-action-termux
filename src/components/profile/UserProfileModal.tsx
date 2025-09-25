import React, { useState, useEffect } from 'react';
import { X, User, MessageCircle, Calendar, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from './UserAvatar';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface UserProfile {
  username: string;
  display_name: string | null;
  profile_picture?: string;
  bio: string | null;
  created_at: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Track if modal is expanded

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchUserProfile = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profile')
          .select('username, display_name, profile_picture, bio, created_at')
          .eq('id', userId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
    setIsExpanded(false); // Reset to basic view when opening
  }, [isOpen, userId]);

  const handleStartChat = () => {
    if (!profile) return;
    
    toast({
      title: "Feature Coming Soon!",
      description: `Direct messaging with ${profile.display_name || profile.username} will be available soon.`,
    });
  };

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl transition-all duration-300 ${
        isExpanded ? 'max-w-md w-full' : 'max-w-xs w-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            {isExpanded && (
              <button
                onClick={handleCollapse}
                className="p-1 hover:bg-secondary/50 rounded-full transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <h2 className="text-sm font-medium text-muted-foreground">
              {isExpanded ? 'Profile' : 'Quick View'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary/50 rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className={`transition-all duration-300 ${isExpanded ? 'p-6' : 'p-4'}`}>
          {isLoading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground text-xs mt-2">Loading...</p>
            </div>
          ) : profile ? (
            <div className="flex flex-col items-center space-y-4">
              {/* Profile Picture */}
              <button
                onClick={isExpanded ? undefined : handleExpand}
                className={`relative group ${isExpanded ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <UserAvatar
                  profilePicture={profile.profile_picture}
                  username={profile.username}
                  size="lg"
                  className={`transition-all ${
                    isExpanded 
                      ? 'w-24 h-24' 
                      : 'w-16 h-16 group-hover:ring-2 group-hover:ring-primary'
                  }`}
                />
                <div className={`absolute -bottom-0.5 -right-0.5 bg-green-500 border-2 border-card rounded-full ${
                  isExpanded ? 'w-6 h-6' : 'w-4 h-4'
                }`}></div>
              </button>

              {/* User Info */}
              <div className="text-center w-full">
                {/* Basic Info (always shown) */}
                <button
                  onClick={isExpanded ? undefined : handleExpand}
                  className={`text-center rounded-lg transition-colors w-full ${
                    isExpanded ? 'cursor-default' : 'hover:bg-secondary/30 p-2 cursor-pointer group'
                  }`}
                >
                  <h3 className={`font-semibold text-foreground transition-colors ${
                    isExpanded 
                      ? 'text-2xl mb-1' 
                      : 'text-lg group-hover:text-primary'
                  }`}>
                    {profile.display_name || profile.username}
                  </h3>
                  <p className={`text-muted-foreground ${isExpanded ? 'text-base' : 'text-sm'}`}>
                    @{profile.username}
                  </p>

                  {/* Expand hint (only in basic view) */}
                  {!isExpanded && (
                    <p className="text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Tap to view profile
                    </p>
                  )}
                </button>

                {/* Extended Info (only in expanded view) */}
                {isExpanded && (
                  <div className="space-y-4 mt-4">
                    {/* Bio */}
                    {profile.bio && (
                      <div className="p-3 bg-secondary/30 rounded-lg">
                        <p className="text-sm text-foreground">
                          {profile.bio}
                        </p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex justify-center gap-6">
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary">0</div>
                        <div className="text-xs text-muted-foreground">Posts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary">0</div>
                        <div className="text-xs text-muted-foreground">Friends</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary">0</div>
                        <div className="text-xs text-muted-foreground">Rooms</div>
                      </div>
                    </div>

                    {/* Member Since */}
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Member since {new Date(profile.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </div>

                    {/* Message Button */}
                    <Button
                      onClick={handleStartChat}
                      className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                )}
              </div>
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
