import { Place } from './place';
import { Sport } from './sport';
import { VisitPhoto } from './photo';

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
  photos?: VisitPhoto[];
}

export interface PublicVisit {
  id: number;
  place_id: number;
  reward: number;
  is_combination: boolean;
  combination_order: number | null;
  date: string;
  place: { id: number; name: string; coordinates: { type: 'Point'; coordinates: [number, number] } } | null;
  sport: { id: number; name: string } | null;
  photos: { id: number; photo_url: string }[];
}

export interface PublicProfile {
  id: number;
  name: string;
  avatar_url: string | null;
  total_points: number;
  visits_count: number;
  hidden_recent: boolean;
  visits: PublicVisit[];
}

export interface UserProfile {
  id: number;
  role: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  totalPoints: number;
  terms_version?: string | null;
  terms_accepted_at?: string | null;
  visitsCombinations: Visit[];
}
