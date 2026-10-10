import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';
import { apiFetch, ApiError } from './api';
import { appendFile } from './upload';
import { LocalPhoto, QueuedPhoto } from '../types/visit';
import { VisitPhoto } from '../types/photo';

const QUEUE_KEY = 'offline_photo_queue';
/** The backend accepts at most 2 MB, a phone photo shrunk to this size and JPEG 0.7 has a few hundred kB. */
const MAX_SIDE = 1600;
const UPLOAD_TIMEOUT_MS = 60_000;
export const MAX_PHOTOS_PER_VISIT = 5;

const isWeb = Platform.OS === 'web';
const randomName = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

/** Shrinks the picked photo and keeps it where it survives until the upload (also offline). */
export async function preparePhoto(asset: ImagePickerAsset): Promise<LocalPhoto> {
  let context = ImageManipulator.manipulate(asset.uri);
  const longest = Math.max(asset.width || 0, asset.height || 0);
  if (longest > MAX_SIDE) {
    context = context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: isWeb });

  if (isWeb) {
    return { uri: `data:image/jpeg;base64,${result.base64}`, width: result.width, height: result.height };
  }

  // The manipulator writes into the cache, which the system may clear before an offline visit is sent.
  const dir = new Directory(Paths.document, 'visit_photos');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const source = new File(result.uri);
  const target = new File(dir, randomName());
  await source.copy(target);
  try {
    source.delete();
  } catch {
    // Leftovers in the cache are harmless.
  }
  return { uri: target.uri, width: result.width, height: result.height };
}

/** Deletes the stored copy of a photo that was uploaded, rejected or removed by the user. */
export function discardLocalPhoto(photo: LocalPhoto): void {
  if (isWeb || !photo.uri.startsWith('file:')) return;
  try {
    const file = new File(photo.uri);
    if (file.exists) file.delete();
  } catch {
    // Nothing to clean up.
  }
}

function photoExists(photo: LocalPhoto): boolean {
  if (isWeb || !photo.uri.startsWith('file:')) return true;
  try {
    return new File(photo.uri).exists;
  } catch {
    return false;
  }
}

async function uploadPhoto(visitId: number, photo: LocalPhoto): Promise<VisitPhoto> {
  const form = new FormData();
  await appendFile(form, 'photo', { uri: photo.uri, name: randomName(), type: 'image/jpeg' });
  const res = await apiFetch<{ data: VisitPhoto }>(`visits/${visitId}/photo`, {
    method: 'POST',
    body: form,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
  return res.data;
}

async function readQueue(): Promise<QueuedPhoto[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedPhoto[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedPhoto[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Throws when the device has no room for them (web storage is limited to a few MB). */
export async function enqueuePhotos(
  userId: number | null,
  visitId: number,
  placeId: number,
  photos: LocalPhoto[]
): Promise<void> {
  if (photos.length === 0) return;
  const queue = await readQueue();
  const now = Date.now();
  photos.forEach((photo, i) => {
    queue.push({ id: `photo-${now}-${i}-${Math.random().toString(36).slice(2, 7)}`, userId, visitId, placeId, photo, createdAt: now });
  });
  await writeQueue(queue);
}

export interface PhotoFlushResult {
  uploaded: number;
  /** Refused by the server, mostly by the image moderation. */
  rejected: string[];
  /** The stored file disappeared from the device. */
  lost: number;
  /** Places whose gallery got new photos. */
  placeIds: number[];
}

async function runFlush(userId: number | null): Promise<PhotoFlushResult> {
  const result: PhotoFlushResult = { uploaded: 0, rejected: [], lost: 0, placeIds: [] };
  if (userId == null) return result;

  const pending = (await readQueue()).filter((q) => q.userId === userId || q.userId == null);
  const done = new Set<string>();

  for (const entry of pending) {
    if (!photoExists(entry.photo)) {
      result.lost++;
      done.add(entry.id);
      continue;
    }
    try {
      await uploadPhoto(entry.visitId, entry.photo);
      result.uploaded++;
      if (!result.placeIds.includes(entry.placeId)) result.placeIds.push(entry.placeId);
      done.add(entry.id);
      discardLocalPhoto(entry.photo);
    } catch (err) {
      if (err instanceof ApiError && err.isClientError) {
        result.rejected.push(err.error_message || 'Fotka nebyla přijata.');
        done.add(entry.id);
        discardLocalPhoto(entry.photo);
      } else {
        // Offline or a server error: the rest waits for the next attempt.
        break;
      }
    }
  }

  if (done.size > 0) {
    // Re-read so photos enqueued while uploading are not overwritten.
    const latest = await readQueue();
    await writeQueue(latest.filter((q) => !done.has(q.id)));
  }
  return result;
}

// Uploads run one after another, so the same photo is never sent twice by overlapping flushes.
let chain: Promise<unknown> = Promise.resolve();

export function flushPhotoQueue(userId: number | null): Promise<PhotoFlushResult> {
  const run = chain.then(
    () => runFlush(userId),
    () => runFlush(userId)
  );
  chain = run.catch(() => {});
  return run;
}

export async function getQueuedPhotoCount(userId: number | null): Promise<number> {
  return (await readQueue()).filter((q) => q.userId === userId || q.userId == null).length;
}
