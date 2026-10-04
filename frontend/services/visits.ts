import { apiFetch, ApiError } from './api';
import { enqueueVisit, getQueuedVisits, toSubmission } from './offlineQueue';
import { discardLocalPhoto } from './photos';
import { Place } from '../types/place';
import { Sport } from '../types/sport';
import { LocalPhoto, QueuedVisit } from '../types/visit';

export interface SubmitVisitInput {
  userId: number | null;
  place: Place;
  sport: Sport;
  isCombination: boolean;
  timestamp: string;
  expectedReward: number;
  /** Stored with a queued visit; for a saved one the caller uploads them. */
  photos?: LocalPhoto[];
}

export interface CreatedVisit {
  id: number;
  place_id: number;
  sport_id: number;
  user_id: number;
  reward: number;
  is_combination: boolean;
  timestamp: string;
  cheat_note: string | null;
}

export type SubmitVisitResult =
  | { kind: 'saved'; visit: CreatedVisit }
  /** `photosDropped`: the photos did not fit into the device storage (the web allows only a few MB). */
  | { kind: 'queued'; photosDropped: boolean };

/**
 * Throws ApiError when the server rejects the visit. Any other failure
 * (offline, timeout, 5xx, expired session) stores the visit in the offline queue.
 * Flush the queue before calling: while older visits are still queued, the new one is
 * queued behind them, because the backend rejects visits older than the latest one.
 */
export async function submitVisit(input: SubmitVisitInput): Promise<SubmitVisitResult> {
  const submission = toSubmission({
    place_id: input.place.id,
    sport_id: input.sport.id,
    is_combination: input.isCombination,
    timestamp: input.timestamp,
  });

  const queueAhead = (await getQueuedVisits(input.userId)).length > 0;

  if (!queueAhead) {
    try {
      const res = await apiFetch<{ data: CreatedVisit }>('visits', {
        method: 'POST',
        body: JSON.stringify(submission),
      });
      return { kind: 'saved', visit: res.data };
    } catch (err) {
      if (err instanceof ApiError && err.isClientError) throw err;
    }
  }

  const entry: QueuedVisit = {
    ...submission,
    id: `visit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    clientId: -Date.now(),
    user_id: input.userId,
    reward: input.expectedReward,
    place_name: input.place.name,
    sport_name: input.sport.name,
    place: input.place,
    sport: input.sport,
    photos: input.photos?.length ? input.photos : undefined,
    createdAt: Date.now(),
  };

  try {
    await enqueueVisit(entry);
    return { kind: 'queued', photosDropped: false };
  } catch {
    if (!entry.photos) throw new Error('Návštěvu se nepodařilo uložit ani do paměti telefonu.');
  }

  try {
    await enqueueVisit({ ...entry, photos: undefined });
  } catch {
    throw new Error('Návštěvu se nepodařilo uložit ani do paměti telefonu.');
  }
  entry.photos.forEach(discardLocalPhoto);
  return { kind: 'queued', photosDropped: true };
}
