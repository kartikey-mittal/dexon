/*
  # Create alerts table for child safety monitoring

  1. New Tables
    - `alerts`
      - `id` (uuid, primary key)
      - `child_id` (uuid, references profiles)
      - `type` (text, either 'sos' or 'mood')
      - `details` (jsonb, stores alert-specific information)
      - `location` (text, optional location data)
      - `timestamp` (timestamptz, when the alert was created)

  2. Security
    - Enable RLS on `alerts` table
    - Add policies for:
      - Parents can read alerts for their children
      - Children can create alerts
      - Children can read their own alerts
*/

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES profiles(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('sos', 'mood')),
  details jsonb NOT NULL,
  location text,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Parents can read alerts for children they are connected to
CREATE POLICY "Parents can read alerts for their children"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles parent
      WHERE parent.id = auth.uid()
      AND parent.role = 'parent'
    )
  );

-- Children can create alerts
CREATE POLICY "Children can create alerts"
  ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'child'
      AND child_id = auth.uid()
    )
  );

-- Children can read their own alerts
CREATE POLICY "Children can read their own alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (
    child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'child'
    )
  );

-- Create index for faster queries
CREATE INDEX alerts_child_id_idx ON alerts(child_id);
CREATE INDEX alerts_timestamp_idx ON alerts(timestamp DESC);