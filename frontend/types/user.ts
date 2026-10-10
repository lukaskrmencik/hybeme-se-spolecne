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

/** Another player's profile opened from the leaderboard (UserController::profile). */
export interface PublicVisit {
  id: number;
  place_id: number;
  reward: number;
  is_combination: boolean;
  combination_order: number | null;
  /** Only the day, Y-m-d. */
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
  /** Visits of the last day are left out for other players. */
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
  /** Version of the terms the user agreed to; null for accounts that have not agreed yet. */
  terms_version?: string | null;
  terms_accepted_at?: string | null;
  visitsCombinations: Visit[];
}