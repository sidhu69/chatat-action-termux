import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Camera, Edit2, Save, X, MapPin, Calendar, Award, Palette } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/profile/UserAvatar';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  profile_picture: string | null;
  created_at: string;
}

export const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('profile')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it now
        const username = user.email?.split('@')[0] || 'user';
        const { data: newProfile, error: createError } = await supabase
          .from('profile')
          .upsert({
            id: user.id,
            email: user.email!,
            username: username,
            display_name: username,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          })
          .select('*')
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }
        
        setProfile(newProfile);
        setDisplayName(newProfile.display_name || newProfile.username);
        setUsername(newProfile.username);
        setBio(newProfile.bio || '');
      } else if (error) {
        throw error;
      } else {
        setProfile(data);
        setDisplayName(data.display_name || data.username);
        setUsername(data.username);
        setBio(data.bio || '');
      }
    } catch (err) {
      console.error('Error with profile:', err);
      setError(`Failed to load profile: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsLoading(true);
    setError('');

    try {
      if (profile?.profile_picture) {
        const oldFileName = profile.profile_picture.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('profile-pictures')
            .remove([oldFileName]);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profile')
        .update({ profile_picture: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, profile_picture: publicUrl } : prev);
      setSuccess('Profile picture updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error uploading image:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to upload image: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('profile')
        .update({
          display_name: displayName.trim(),
          username: username.trim(),
          bio: bio.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        display_name: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
      } : prev);

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to save profile: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isLoading && !profile) {
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
        {/* Header with glassmorphism */}
        <div className="bg-card/10 backdrop-blur-xl border-b border-border/20 sticky top-0 z-20">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="hover:bg-white/10 text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold text-white">Profile</h1>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(profile?.display_name || profile?.username || '');
                      setUsername(profile?.username || '');
                      setBio(profile?.bio || '');
                      setError('');
                    }}
                    className="bg-red-500/20 border-red-500/30 text-white hover:bg-red-500/30"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-gradient-primary hover:opacity-90 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
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

          {success && (
            <Alert className="mb-6 bg-green-500/20 border-green-500/30 backdrop-blur-sm">
              <AlertDescription className="text-green-100">{success}</AlertDescription>
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
                      <label className="absolute bottom-2 right-2 bg-gradient-primary hover:opacity-90 rounded-full p-3 cursor-pointer shadow-lg transition-all duration-300 border-2 border-white/20">
                        <Camera className="h-4 w-4 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isLoading}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="text-center space-y-4">
                    {/* Name */}
                    {isEditing ? (
                      <div className="space-y-2 max-w-md mx-auto">
                        <Label className="text-white/80">Display Name</Label>
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter your display name"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm"
                        />
                      </div>
                    ) : (
                      <h2 className="text-3xl font-bold text-white">
                        {profile.display_name || profile.username}
                      </h2>
                    )}

                    {/* Username */}
                    {isEditing ? (
                      <div className="space-y-2 max-w-md mx-auto">
                        <Label className="text-white/80">Username</Label>
                        <Input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Enter your username"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm"
                        />
                      </div>
                    ) : (
                      <p className="text-white/70 text-lg">@{profile.username}</p>
                    )}

                    {/* Bio */}
                    {isEditing ? (
                      <div className="space-y-2 max-w-md mx-auto">
                        <Label className="text-white/80">Bio</Label>
                        <Textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Write something about yourself..."
                          rows={3}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm resize-none"
                        />
                      </div>
                    ) : (
                      <p className="text-white/80 max-w-md mx-auto">
                        {profile.bio || "No bio yet... ✨"}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex justify-center gap-8 pt-4">
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
                  </div>
                </div>
              </div>

              {/* Additional Cards */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Activity Card */}
                <div className="bg-card/10 backdrop-blur-xl border border-border/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Award className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-white">Activity</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Messages sent</span>
                      <span className="text-white font-semibold">0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Rooms joined</span>
                      <span className="text-white font-semibold">0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Member since</span>
                      <span className="text-white font-semibold">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Settings Card */}
                <div className="bg-card/10 backdrop-blur-xl border border-border/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Palette className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-white">Settings</h3>
                  </div>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                    >
                      Theme Preferences
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                    >
                      Notification Settings
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleSignOut}
                      className="w-full bg-red-500/20 border-red-500/30 text-red-200 hover:bg-red-500/30"
                    >
                      Sign Out
                    </Button>
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

export default Profile;
