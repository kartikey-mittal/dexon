/*
  # Update alerts table structure and add mood_logs table

  1. Changes
    - Add mood_logs table for better emotion tracking
    - Update alerts table location column to store coordinates properly
    - Add indexes for better query performance

  2. New Tables
    - mood_logs
      - id (uuid, primary key)
      - child_id (uuid, references profiles)
      - sentiment (float, emotion intensity)
      - mood (text, emotion type)
      - transcript (text)
      - timestamp (timestamptz)
*/

-- Create mood_logs table
CREATE TABLE IF NOT EXISTS mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES profiles(id) NOT NULL,
  sentiment float NOT NULL,
  mood text NOT NULL,
  transcript text,
  timestamp timestamptz DEFAULT now()
);

-- Add indexes for mood_logs
CREATE INDEX IF NOT EXISTS mood_logs_child_id_idx ON mood_logs(child_id);
CREATE INDEX IF NOT EXISTS mood_logs_timestamp_idx ON mood_logs(timestamp DESC);

-- Enable RLS on mood_logs
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

-- Add policies for mood_logs
CREATE POLICY "Parents can read mood logs"
  ON mood_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles parent
      WHERE parent.id = auth.uid()
      AND parent.role = 'parent'
    )
  );

CREATE POLICY "Children can insert mood logs"
  ON mood_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'child'
    )
  );

-- Update alerts table to properly store coordinates
ALTER TABLE alerts 
  DROP COLUMN IF EXISTS location,
  ADD COLUMN IF NOT EXISTS latitude float,
  ADD COLUMN IF NOT EXISTS longitude float;

-- Add index for coordinates
CREATE INDEX IF NOT EXISTS alerts_coordinates_idx ON alerts(latitude, longitude);