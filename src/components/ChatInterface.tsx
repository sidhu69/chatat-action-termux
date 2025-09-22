import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Send, 
  Users, 
  Copy, 
  MoreVertical,
  Hash
} from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { Message } from '@/types/chat';
import { toast } from '@/hooks/use-toast';

export const ChatInterface = () => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = useChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.currentRoom?.messages]);

  const handleSendMessage = () => {
    if (!message.trim() || !state.currentRoom || !state.currentUser) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: message.trim(),
      userId: state.currentUser.id,
      username: state.currentUser.username,
      timestamp: new Date(),
      type: 'text',
    };

    dispatch({
      type: 'ADD_MESSAGE',
      payload: { roomId: state.currentRoom.id, message: newMessage }
    });

    setMessage('');

    // Simulate typing indicator for demo
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  const handleLeaveRoom = () => {
    dispatch({ type: 'LEAVE_ROOM' });
    toast({
      title: "Left room",
      description: "You have left the chat room",
    });
  };

  const copyRoomCode = () => {
    if (state.currentRoom) {
      navigator.clipboard.writeText(state.currentRoom.code);
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

  if (!state.currentRoom) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border/50 p-4 flex items-center justify-between backdrop-blur-xl">
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
            <h2 className="font-bold text-lg">{state.currentRoom.name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              {state.currentRoom.participants.length} participants
              <Button
                variant="ghost"
                size="sm"
                onClick={copyRoomCode}
                className="h-6 px-2 text-xs bg-primary/20 text-primary hover:bg-primary/30"
              >
                <Hash className="w-3 h-3 mr-1" />
                {state.currentRoom.code}
                <Copy className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
        
        <Button variant="ghost" size="icon" className="hover:bg-secondary">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-secondary/30">
        {state.currentRoom.messages.map((msg) => {
          const isOwn = msg.userId === state.currentUser?.id;
          const isSystem = msg.type === 'system';

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
                <Avatar className="w-8 h-8 border-2 border-border/50">
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
                    {msg.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className={`max-w-[70%] ${isOwn ? 'order-first' : ''}`}>
                {!isOwn && (
                  <p className="text-xs text-muted-foreground mb-1 font-medium">
                    {msg.username}
                  </p>
                )}
                <div className={`
                  p-3 rounded-2xl backdrop-blur-xl
                  ${isOwn 
                    ? 'bg-chat-bubble-own text-primary-foreground ml-auto' 
                    : 'bg-chat-bubble-other text-foreground'
                  }
                `}>
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>

              {isOwn && (
                <Avatar className="w-8 h-8 border-2 border-primary/50">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                    {msg.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 border-2 border-border/50">
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                ?
              </AvatarFallback>
            </Avatar>
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

      {/* Message Input */}
      <div className="p-4 bg-card border-t border-border/50 backdrop-blur-xl">
        <div className="flex gap-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-background/50 border-border/50 focus:bg-background transition-all duration-300"
            maxLength={500}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="bg-gradient-primary hover:opacity-90 transition-all duration-300"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};