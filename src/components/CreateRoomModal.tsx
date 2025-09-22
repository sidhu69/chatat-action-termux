import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Copy, Lock, Globe } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { ChatRoom } from '@/types/chat';
import { toast } from '@/hooks/use-toast';

interface CreateRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateRoomModal = ({ open, onOpenChange }: CreateRoomModalProps) => {
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [roomType, setRoomType] = useState<'private' | 'public'>('public');
  const { state, dispatch } = useChat();

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreate = () => {
    if (!roomName.trim() || !state.currentUser) return;

    const roomCode = generateRoomCode();
    const newRoom: ChatRoom = {
      id: Date.now().toString(),
      code: roomCode,
      name: roomName.trim(),
      description: description.trim() || undefined,
      type: roomType,
      createdBy: state.currentUser.id,
      participants: [state.currentUser],
      messages: [{
        id: '1',
        content: `Welcome to ${roomName}! 🎉`,
        userId: 'system',
        username: 'System',
        timestamp: new Date(),
        type: 'system'
      }],
      createdAt: new Date(),
    };

    dispatch({ type: 'ADD_ROOM', payload: newRoom });
    dispatch({ type: 'JOIN_ROOM', payload: newRoom });
    
    toast({
      title: "Room created successfully!",
      description: `Room code: ${roomCode}`,
    });

    onOpenChange(false);
    setRoomName('');
    setDescription('');
    setRoomType('public');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code copied!",
      description: "Room code copied to clipboard",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Chat Room</DialogTitle>
          <DialogDescription>
            Set up your chat room and start connecting with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="roomName">Room Name</Label>
            <Input
              id="roomName"
              placeholder="Enter room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="bg-background/50 border-border/50"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What's this room about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background/50 border-border/50 min-h-[80px]"
              maxLength={200}
            />
          </div>

          <div className="space-y-3">
            <Label>Room Type</Label>
            <RadioGroup value={roomType} onValueChange={(value) => setRoomType(value as 'private' | 'public')}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border/50 bg-background/30">
                <RadioGroupItem value="public" id="public" />
                <Globe className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <Label htmlFor="public" className="font-medium">Public Room</Label>
                  <p className="text-sm text-muted-foreground">Visible in random chat rooms list</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border/50 bg-background/30">
                <RadioGroupItem value="private" id="private" />
                <Lock className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <Label htmlFor="private" className="font-medium">Private Room</Label>
                  <p className="text-sm text-muted-foreground">Only accessible with room code</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleCreate}
              disabled={!roomName.trim()}
              className="flex-1 bg-gradient-primary hover:opacity-90 transition-all duration-300"
            >
              Create Room
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-border/50 bg-background/50"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};