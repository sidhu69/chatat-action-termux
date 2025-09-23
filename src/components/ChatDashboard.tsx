import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Plus, Hash, Users, Clock } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { CreateRoomModal } from './CreateRoomModal';
import { JoinRoomModal } from './JoinRoomModal';
import { ChatRoom } from '@/types/chat';
import chatHero from '@/assets/chat-hero.jpg';

export const ChatDashboard = () => {
  const { state, dispatch, supabaseChat } = useChat();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const publicRooms = supabaseChat.rooms.filter(room => room.type === 'public');

  const handleJoinRoom = async (room: ChatRoom) => {
    if (state.currentUser) {
      console.log(`Joining room ${room.name} with code ${room.code}`);
      const joinedRoom = await supabaseChat.joinRoom(room.code, state.currentUser);
      if (joinedRoom) {
        console.log('Successfully joined room from dashboard');
      }
    }
  };

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((new Date().getTime() - date.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="absolute inset-0 bg-gradient-secondary opacity-30" />
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={chatHero}
          alt="Chat Background"
          className="w-full h-full object-cover opacity-10"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Chatat
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Welcome back, <span className="text-foreground font-semibold">{state.currentUser?.username}</span>!
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 hover:bg-card/90 transition-all duration-300 cursor-pointer group"
                onClick={() => setShowCreateModal(true)}>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Generate a Chat</h3>
              <p className="text-muted-foreground">Create a new chat room and invite others</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-xl border-border/50 hover:bg-card/90 transition-all duration-300 cursor-pointer group"
                onClick={() => setShowJoinModal(true)}>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Hash className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Join a Chat</h3>
              <p className="text-muted-foreground">Enter a chat code to join existing room</p>
            </CardContent>
          </Card>
        </div>

        {/* Random Chat Rooms */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Random Chat Rooms
          </h2>

          {publicRooms.length === 0 ? (
            <Card className="bg-card/80 backdrop-blur-xl border-border/50">
              <CardContent className="p-8 text-center">
                <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No public rooms yet</h3>
                <p className="text-muted-foreground">Be the first to create a public chat room!</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 bg-gradient-primary hover:opacity-90"
                >
                  Create First Room
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {publicRooms.map((room) => (
                <Card key={room.id} className="bg-card/80 backdrop-blur-xl border-border/50 hover:bg-card/90 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{room.name}</h3>
                          <Badge variant="secondary" className="bg-primary/20 text-primary">
                            {room.code}
                          </Badge>
                        </div>
                        {room.description && (
                          <p className="text-muted-foreground mb-3">{room.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {room.activeParticipantCount} participants
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Created {formatTimeAgo(room.createdAt)}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleJoinRoom(room)}
                        className="bg-gradient-primary hover:opacity-90 transition-all duration-300"
                      >
                        Join Room
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateRoomModal open={showCreateModal} onOpenChange={setShowCreateModal} />
      <JoinRoomModal open={showJoinModal} onOpenChange={setShowJoinModal} />
    </div>
  );
};
