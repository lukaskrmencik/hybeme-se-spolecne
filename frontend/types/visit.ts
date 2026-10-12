import { Place } from './place';
import { Sport } from './sport';

export interface VisitSubmission {
  place_id: number;
  sport_id: number;
  is_combination: boolean;
  timestamp: string;
}

export interface QueuedVisit extends VisitSubmission {
  id: string;
  clientId: number;
  user_id: number | null;
  reward: number;
  place_name?: string;
  sport_name?: string;
  place?: Place;
  sport?: Sport;
  photos?: LocalPhoto[];
  createdAt: number;
}

export interface LocalPhoto {
  uri: string;
  width: number;
  height: number;
}

export interface QueuedPhoto {
  id: string;
  userId: number | null;
  visitId: number;
  placeId: number;
  photo: LocalPhoto;
  createdAt: number;
}
