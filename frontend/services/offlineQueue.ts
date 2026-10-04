import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, ApiError } from './api';
import { discardLocalPhoto, enqueuePhotos } from './photos';
import { QueuedVisit, VisitSubmission } from '../types/visit';
import { UserProfile, Visit } from '../types/user';
import { parseVisitTime } from '../utils/dates';

const QUEUE_KEY = 'offline_visits_queue';

let flushing = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((fn) => fn());
}

export function onQueueChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

async function readQueue(): Promise<QueuedVisit[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedVisit[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedVisit[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Entries without user_id come from older app versions and are treated as belonging to whoever is logged in. */
const belongsTo = (entry: QueuedVisit, userId: number | null) =>
  entry.user_id == null || entry.user_id === userId;

export async function getQueuedVisits(userId: number | null): Promise<QueuedVisit[]> {
  return (await readQueue()).filter((q) => belongsTo(q, userId));
}

export async function enqueueVisit(entry: QueuedVisit): Promise<void> {
  const queue = await readQueue();
  queue.push(entry);
  await writeQueue(queue);
  emit();
}

export function toSubmission(entry: VisitSubmission): VisitSubmission {
  return {
    place_id: entry.place_id,
    sport_id: entry.sport_id,
    is_combination: entry.is_combination,
    timestamp: entry.timestamp,
  };
}

export interface DroppedVisit {
  entry: QueuedVisit;
  reason: string;
}

export interface FlushResult {
  synced: number;
  dropped: DroppedVisit[];
}

/**
 * Finds the server id of a visit that is already saved. When a request times out after the server
 * stored the visit, the visit is queued anyway; sending it again is refused ("earlier than the last
 * visit"), which must not be reported as a rejected visit.
 */
export type ExistingVisitLookup = (entry: QueuedVisit) => Promise<number | null>;

/** Looks the visit up among the user's visits on the server, downloaded once per flush. */
export function createExistingVisitLookup(userId: number): ExistingVisitLookup {
  let serverVisits: Promise<Visit[]> | null = null;
  return async (entry) => {
    serverVisits ??= apiFetch<{ data: UserProfile }>(`users/${userId}`).then((res) => res.data.visitsCombinations ?? []);
    const sent = parseVisitTime(entry.timestamp);
    // The server keeps whole seconds only.
    const match = (await serverVisits).find(
      (v) => v.place_id === entry.place_id && Math.abs(parseVisitTime(v.timestamp) - sent) < 2000
    );
    return match?.id ?? null;
  };
}

/** Hands the photos of an accepted visit over to the photo queue. */
async function passPhotos(userId: number, entry: QueuedVisit, visitId: number): Promise<void> {
  if (!entry.photos?.length) return;
  try {
    await enqueuePhotos(userId, visitId, entry.place_id, entry.photos);
  } catch {
    entry.photos.forEach(discardLocalPhoto);
  }
}

/**
 * Sends queued visits of the given user oldest-first. Stops at the first network/server
 * failure so later visits are never submitted before earlier ones (anti-cheat checks order).
 */
export async function flushQueue(
  userId: number | null,
  findExisting?: ExistingVisitLookup
): Promise<FlushResult | null> {
  if (flushing || userId == null) return null;

  const pending = (await readQueue())
    .filter((q) => belongsTo(q, userId))
    .sort((a, b) => a.createdAt - b.createdAt);
  if (pending.length === 0) return { synced: 0, dropped: [] };

  flushing = true;
  const processed = new Set<string>();
  const dropped: DroppedVisit[] = [];
  let synced = 0;

  try {
    for (const entry of pending) {
      try {
        const res = await apiFetch<{ data: { id: number } }>('visits', {
          method: 'POST',
          body: JSON.stringify(toSubmission(entry)),
        });
        synced++;
        processed.add(entry.id);
        await passPhotos(userId, entry, res.data.id);
      } catch (err) {
        if (err instanceof ApiError && err.isClientError) {
          const existingId = findExisting ? await findExisting(entry).catch(() => null) : null;
          if (existingId != null) {
            synced++;
            await passPhotos(userId, entry, existingId);
          } else {
            dropped.push({ entry, reason: err.error_message || 'Návštěva byla zamítnuta.' });
            entry.photos?.forEach(discardLocalPhoto);
          }
          processed.add(entry.id);
        } else {
          break;
        }
      }
    }
  } finally {
    if (processed.size > 0) {
      // Re-read so visits enqueued while flushing are not overwritten.
      const latest = await readQueue();
      await writeQueue(latest.filter((q) => !processed.has(q.id)));
      emit();
    }
    flushing = false;
  }

  return { synced, dropped };
}
