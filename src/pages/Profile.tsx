import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Camera, Edit2, Save, X } from 'lucide-react';
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

      if (error) {
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profile')
            .insert({
              id: user.id,
              email: user.email!,
              username: user.email!.split('@')[0],
              display_name: user.email!.split('@')[0],
            })
            .select('*')
            .single();

          if (createError) throw createError;
          
          setProfile(newProfile);
          setDisplayName(newProfile.display_name || newProfile.username);
          setUsername(newProfile.username);
          setBio(newProfile.bio || '');
        } else {
          throw error;
        }
      } else {
        setProfile(data);
        setDisplayName(data.display_name || data.username);
        setUsername(data.username);
        setBio(data.bio || '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load profile: ${errorMessage}`);
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
      // Delete old image if exists
      if (profile?.profile_picture) {
        const oldFileName = profile.profile_picture.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('profile-pictures')
            .remove([oldFileName]);
        }
      }

      // Upload new image
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update profile with new image URL
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Profile</h1>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
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
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
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
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {profile && (
          <div className="bg-white rounded-lg shadow-sm">
            {/* Profile Header */}
            <div className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Profile Picture */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <UserAvatar
                      profilePicture={profile.profile_picture || undefined}
                      username={profile.username}
                      size="lg"
                    />
                    <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 rounded-full p-2 cursor-pointer shadow-lg">
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
                <div className="flex-1 space-y-4">
                  {/* Username */}
                  <div>
                    {isEditing ? (
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Enter your username"
                        />
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-2xl font-bold">{profile.username}</h2>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="font-bold">0</div>
                      <div className="text-sm text-gray-500">Posts</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">0</div>
                      <div className="text-sm text-gray-500">Friends</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">0</div>
                      <div className="text-sm text-gray-500">Rooms</div>
                    </div>
                  </div>

                  {/* Display Name */}
                  <div>
                    {isEditing ? (
                      <div>
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter your display name"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold">{profile.display_name || profile.username}</div>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <div>
                    {isEditing ? (
                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Write something about yourself..."
                          rows={3}
                        />
                      </div>
                    ) : (
                      <div className="text-gray-600">
                        {profile.bio || 'No bio yet...'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="border-t p-6">
              <h3 className="text-lg font-semibold mb-4">Account Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input value={profile.email} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label>Member Since</Label>
                  <Input
                    value={new Date(profile.created_at).toLocaleDateString()}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t p-6">
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="w-full md:w-auto"
              >
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
