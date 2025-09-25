import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import chatHero from '@/assets/chat-hero.jpg';

export const UsernameSetup = () => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profile')
        .update({
          username: username.trim(),
          display_name: displayName.trim() || username.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile updated!",
        description: "You can now start chatting",
      });

      // Reload the page to trigger profile loading
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-secondary opacity-50" />
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={chatHero}
          alt="Chat Background"
          className="w-full h-full object-cover opacity-20"
        />
      </div>

      <Card className="w-full max-w-md relative z-10 bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Complete Your Profile
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Set up your username to start chatting
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Username (required)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="text-center text-lg py-6 bg-background/50 border-border/50 focus:bg-background transition-all duration-300"
                maxLength={20}
                required
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="Display name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-center text-lg py-6 bg-background/50 border-border/50 focus:bg-background transition-all duration-300"
                maxLength={30}
              />
            </div>
            <Button
              type="submit"
              className="w-full py-6 text-lg font-semibold bg-gradient-primary hover:opacity-90 transition-all duration-300 transform hover:scale-105"
              disabled={!username.trim() || loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Setting up...
                </div>
              ) : (
                'Start Chatting'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
