import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hash, AlertCircle } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { toast } from '@/hooks/use-toast';

interface JoinRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinRoomModal = ({ open, onOpenChange }: JoinRoomModalProps) => {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { state, supabaseChat } = useChat();

  const handleJoin = async () => {
    if (!roomCode.trim() || !state.currentUser || isJoining) return;

    setIsJoining(true);
    setError('');

    try {
      console.log(`Attempting to join room with code: ${roomCode.trim()}`);
      console.log('Current user:', state.currentUser);

      // Pass both the room code AND the current user
      const room = await supabaseChat.joinRoom(roomCode.trim(), state.currentUser);

      if (room) {
        toast({
          title: "Joined room successfully!",
          description: `Welcome to ${room.name}`,
        });

        onOpenChange(false);
        setRoomCode('');
        setError('');
      } else {
        setError('Room not found. Please check the code and try again.');
      }
    } catch (error) {
      console.error('Error in handleJoin:', error);
      setError('Failed to join room. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCodeChange = (value: string) => {
    setRoomCode(value.toUpperCase());
    if (error) setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Join Chat Room</DialogTitle>
          <DialogDescription>
            Enter the room code to join an existing chat
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="roomCode">Room Code</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="roomCode"
                placeholder="Enter 6-digit code"
                value={roomCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 text-center text-lg font-mono tracking-wider"
                maxLength={6}
                disabled={isJoining}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleJoin}
              disabled={roomCode.length !== 6 || !state.currentUser || isJoining}
              className="flex-1 bg-gradient-primary hover:opacity-90 transition-all duration-300"
            >
              {isJoining ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Joining...
                </div>
              ) : (
                'Join Room'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setRoomCode('');
                setError('');
              }}
              className="border-border/50 bg-background/50"
              disabled={isJoining}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
