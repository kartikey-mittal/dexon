export type UserRole = 'child' | 'parent';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
}

export interface Sentiment {
  emotion: 'happy' | 'sad' | 'angry' | 'neutral' | 'scared';
  intensity: number;
  confidence: number;
}

export interface ContentFlags {
  profanity: boolean;
  harmful: boolean;
  threatening: boolean;
}

export interface MoodLog {
  id: string;
  child_id: string;
  sentiment: number;
  mood: string;
  transcript: string;
  timestamp: string;
  intensity?: number;
}

export interface Alert {
  id: string;
  child_id: string;
  type: 'sos' | 'mood';
  details: {
    message: string;
    intensity?: number;
    flags?: ContentFlags;
  };
  latitude?: number;
  longitude?: number;
  timestamp: string;
}