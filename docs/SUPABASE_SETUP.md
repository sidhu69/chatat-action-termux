# Supabase Setup for Real-time Chat

## Database Schema

Run these SQL commands in your Supabase SQL Editor:

### 1. Create Tables

```sql
-- Create chat_rooms table
CREATE TABLE chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL
);

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Enable Row Level Security (RLS)

```sql
-- Enable RLS on both tables
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read public rooms
CREATE POLICY "Anyone can view public chat rooms" ON chat_rooms
  FOR SELECT USING (is_public = true);

-- Allow anyone to create rooms (for demo purposes)
CREATE POLICY "Anyone can create chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (true);

-- Allow room creators to update their rooms
CREATE POLICY "Creators can update their rooms" ON chat_rooms
  FOR UPDATE USING (created_by = current_user::text);

-- Allow anyone to view messages in rooms they have access to
CREATE POLICY "Anyone can view messages in accessible rooms" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE chat_rooms.id = messages.room_id 
      AND (chat_rooms.is_public = true OR chat_rooms.created_by = current_user::text)
    )
  );

-- Allow anyone to insert messages (for demo purposes)
CREATE POLICY "Anyone can send messages" ON messages
  FOR INSERT WITH CHECK (true);
```

### 3. Enable Realtime

```sql
-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

### 4. Create Indexes for Performance

```sql
-- Index for faster room lookups by code
CREATE INDEX idx_chat_rooms_code ON chat_rooms(code);

-- Index for faster message queries by room
CREATE INDEX idx_messages_room_id ON messages(room_id, created_at);

-- Index for public rooms
CREATE INDEX idx_chat_rooms_public ON chat_rooms(is_public, created_at) WHERE is_public = true;
```

## Environment Variables

Your Supabase integration should automatically provide these, but verify they exist:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon public key

## Features Enabled

✅ **Real-time messaging** - Messages appear instantly across all connected clients
✅ **Public/Private rooms** - Support for both room types
✅ **Room codes** - Unique codes for joining private rooms
✅ **Message persistence** - All messages stored in database
✅ **Automatic scaling** - Supabase handles all backend scaling

## Testing Real-time

1. Open your app in two browser tabs
2. Create a public room in one tab
3. Join the same room in the other tab
4. Send messages - they should appear instantly in both tabs!

## Security Notes

The current setup allows anonymous usage for demo purposes. For production:

1. Enable Supabase Auth
2. Update RLS policies to require authentication
3. Add user management features
4. Implement rate limiting