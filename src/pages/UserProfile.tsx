import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, MessageCircle, Calendar, MapPin, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate, useParams } from 'react-router-dom';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  profile_picture: string | null;
  created_at: string;
}

export const UserProfile: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('profile')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load profile: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleStartChat = () => {
    if (!profile) return;
    
    toast({
      title: "Feature Coming Soon!",
      description: `Direct messaging with ${profile.display_name || profile.username} will be available soon.`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-secondary opacity-30" />
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="bg-card/10 backdrop-blur-xl border-b border-border/20 sticky top-0 z-20">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-white/10 text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold text-white">
                {profile ? `${profile.display_name || profile.username}'s Profile` : 'User Profile'}
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto p-6">
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-500/20 border-red-500/30 backdrop-blur-sm">
              <AlertDescription className="text-red-100">{error}</AlertDescription>
            </Alert>
          )}

          {profile && (
            <div className="space-y-6">
              {/* Main Profile Card */}
              <div className="bg-card/10 backdrop-blur-xl border border-border/20 rounded-2xl overflow-hidden">
                {/* Cover Area */}
                <div className="h-32 bg-gradient-accent relative">
                  <div className="absolute inset-0 bg-black/20" />
                </div>

                {/* Profile Content */}
                <div className="px-8 pb-8 -mt-16 relative">
                  {/* Profile Picture */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 backdrop-blur-sm">
                        <UserAvatar
                          profilePicture={profile.profile_picture || undefined}
                          username={profile.username}
                          size="lg"
                          className="w-full h-full"
                        />
                      </div>
                      {/* Online indicator */}
                      <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-2 border-white/20 rounded-full"></div>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="text-center space-y-4">
                    {/* Name */}
                    <h2 className="text-3xl font-bold text-white">
                      {profile.display_name || profile.username}
                    </h2>
                    
                    {/* Username */}
                    <p className="text-white/70 text-lg">@{profile.username}</p>

                    {/* Bio */}
                    <p className="text-white/80 max-w-md mx-auto">
                      {profile.bio || "No bio yet... ✨"}
                    </p>

                    {/* Action Buttons */}
                    {currentUser?.id !== profile.id && (
                      <div className="flex justify-center gap-4 pt-4">
                        <Button
                          onClick={handleStartChat}
                          className="bg-gradient-primary hover:opacity-90 text-white px-6 py-2"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex justify-center gap-8 pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">0</div>
                        <div className="text-sm text-white/60">Posts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">0</div>
                        <div className="text-sm text-white/60">Friends</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">0</div>
                        <div className="text-sm text-white/60">Rooms</div>
                      </div>
                    </div>

                    {/* Member Since */}
                    <div className="flex items-center justify-center gap-2 text-white/60 text-sm pt-4">
                      <Calendar className="h-4 w-4" />
                      Member since {new Date(profile.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
