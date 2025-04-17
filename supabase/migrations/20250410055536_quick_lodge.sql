/*
  # Create profiles and messages tables

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key)
      - `name` (text)
      - `role` (text)
      - `email` (text)
      - `created_at` (timestamp)

    - `messages`
      - `id` (uuid, primary key)
      - `parent_id` (uuid, references profiles.id)
      - `child_id` (uuid, references profiles.id)
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for profile access
    - Add policies for message sending and reading
*/

-- Create profiles table first
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('parent', 'child')),
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles can read their own data
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES profiles(id) NOT NULL,
  child_id uuid REFERENCES profiles(id) NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Parents can insert messages
CREATE POLICY "Parents can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'parent'
    )
  );

-- Parents can read messages they sent
CREATE POLICY "Parents can read sent messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'parent'
    )
  );

-- Children can read their messages
CREATE POLICY "Children can read their messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'child'
    )
  );