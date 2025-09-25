import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Send,
  Users,
  Copy,
  MoreVertical,
  Hash,
  Circle
} from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { Message } from '@/types/chat';
import { toast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { UserProfileModal } from '@/components/profile/UserProfileModal';

export const ChatInterface = () => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { state, dispatch, supabaseChat } = useChat();

  // Get current room participants from the main chat hook
  const currentRoomParticipants = supabaseChat.currentRoom
    ? supabaseChat.roomParticipants[supabaseChat.currentRoom.id] || []
    : [];

  const participantCount = currentRoomParticipants.length;
  const onlineUsers = currentRoomParticipants.map(p => p.username);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [supabaseChat.currentRoom?.messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !supabaseChat.currentRoom || !state.currentUser || isSending) return;

    setIsSending(true);
    const messageToSend = message.trim();
    setMessage(''); // Clear input immediately

    const success = await supabaseChat.sendMessage(
      messageToSend,
      state.currentUser
    );

    if (!success) {
      setMessage(messageToSend); // Restore message on failure
    }

    setIsSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLeaveRoom = () => {
    supabaseChat.leaveRoom();
    toast({
      title: "Left room",
      description: "You have left the chat room",
    });
  };

  const copyRoomCode = () => {
    if (supabaseChat.currentRoom) {
      navigator.clipboard.writeText(supabaseChat.currentRoom.code);
      toast({
        title: "Room code copied!",
        description: "Share this code with others to invite them",
      });
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!supabaseChat.currentRoom) return null;

  return (
    <div className="h-screen flex flex-col bg-background fixed inset-0 overflow-hidden">
      {/* Header - Fixed */}
      <div className="bg-card border-b border-border/50 p-4 flex items-center justify-between backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLeaveRoom}
            className="hover:bg-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-bold text-lg">{supabaseChat.currentRoom.name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <div className="flex items-center gap-1">
                <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                <span className="font-medium text-foreground">
                  {participantCount} online
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyRoomCode}
                className="h-6 px-2 text-xs bg-primary/20 text-primary hover:bg-primary/30"
              >
                <Hash className="w-3 h-3 mr-1" />
                {supabaseChat.currentRoom.code}
                <Copy className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Show online users tooltip */}
        <div className="flex items-center gap-2">
          {participantCount > 0 && (
            <Badge variant="secondary" className="bg-green-500/20 text-green-700 border-green-500/30 max-w-48 truncate">
              {onlineUsers.join(', ')}
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="hover:bg-secondary">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages - Scrollable */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-secondary/30"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y', // Only allow vertical scrolling
          overscrollBehavior: 'contain' // Prevent scroll chaining
        }}
      >
        {supabaseChat.currentRoom.messages.map((msg) => {
          const isOwn = msg.userId === state.currentUser?.id;
          const isSystem = msg.type === 'system';
          const isTemp = msg.id.toString().startsWith('temp-');

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <Badge variant="secondary" className="bg-secondary/50 text-muted-foreground">
                  {msg.content}
                </Badge>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {!isOwn && (
                <div className="relative">
                  <UserAvatar
                    profilePicture={msg.profile_picture}
                    username={msg.username}
                    size="sm"
                    onClick={() => setSelectedUserId(msg.userId)}
                  />
                  {/* Show online indicator if user is online */}
                  {onlineUsers.includes(msg.username) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                  )}
                </div>
              )}

              <div className={`max-w-[70%] ${isOwn ? 'order-first' : ''}`}>
                {!isOwn && (
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-muted-foreground font-medium">
                      {msg.display_name || msg.username}
                    </p>
                    {onlineUsers.includes(msg.username) && (
                      <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                    )}
                  </div>
                )}

                <div className={`
                  p-3 rounded-2xl backdrop-blur-xl transition-opacity duration-200
                  ${isTemp ? 'opacity-70' : 'opacity-100'}
                  ${isOwn
                    ? 'bg-chat-bubble-own text-primary-foreground ml-auto'
                    : 'bg-chat-bubble-other text-foreground'
                  }
                `}>
                  <p className="text-sm">{msg.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                    {isTemp && (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>
              </div>

              {isOwn && (
                <div className="relative">
                  <UserAvatar
                    profilePicture={msg.profile_picture}
                    username={msg.username}
                    size="sm"
                    onClick={() => setSelectedUserId(msg.userId)}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-3">
            <UserAvatar
              username="?"
              size="sm"
            />
            <div className="bg-chat-bubble-other p-3 rounded-2xl backdrop-blur-xl">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-chat-typing rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-chat-typing rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-chat-typing rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Fixed */}
      <div className="p-4 bg-card border-t border-border/50 backdrop-blur-xl flex-shrink-0">
        <div className="flex gap-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-background/50 border-border/50 focus:bg-background transition-all duration-300"
            maxLength={500}
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending}
            className="bg-gradient-primary hover:opacity-90 transition-all duration-300"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedUserId && (
        <UserProfileModal
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          userId={selectedUserId}
        />
      )}
    </div>
  );
};
