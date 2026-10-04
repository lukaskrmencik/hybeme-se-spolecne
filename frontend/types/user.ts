import { Place } from './place';
import { Sport } from './sport';

export interface Visit {
  id: number;
  reward: number;
  user_id: number;
  place_id: number;
  sport_id: number;
  is_combination: boolean;
  timestamp: string;
  combination_order: number | null;
  place: Place;
  sport: Sport;
}

export interface UserProfile {
  id: number;
  role: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  totalPoints: number;
  visitsCombinations: Visit[];
}