import { Platform } from 'react-native';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { config } from '../constants/config';

/**
 * Offline map for the native app, which has no service worker (the web uses public/sw.js instead).
 * The map file and the map libraries are downloaded from our web server into the app's documents;
 * the map page then gets the libraries inline and reads the map file in pieces over the WebView bridge.
 */

// The files are on the web server, also when a development build talks to a local backend.
const SITE = config.apiUrlProd.replace(/\/api\/?$/, '');

const FILES = {
  leafletJs: 'vendor/leaflet/leaflet.js',
  leafletCss: 'vendor/leaflet/leaflet.css',
  pmtilesJs: 'vendor/pmtiles/pmtiles.js',
  protomapsJs: 'vendor/protomaps-leaflet/protomaps-leaflet.js',
  map: 'offline-map/area.pmtiles',
} as const;

/** Text each library must contain; a broken download then falls back to the CDN instead of breaking the map. */
const LIB_MARKERS: Record<Exclude<FileKey, 'map'>, string> = {
  leafletJs: 'leaflet',
  leafletCss: '.leaflet-container',
  pmtilesJs: 'var pmtiles',
  protomapsJs: 'var protomapsL',
};
/** Every PMTiles file starts with these bytes. */
const MAP_MAGIC = 'PMTiles';

type FileKey = keyof typeof FILES;
export type MapLibs = Record<Exclude<FileKey, 'map'>, string>;
const LIB_KEYS: Exclude<FileKey, 'map'>[] = ['leafletJs', 'leafletCss', 'pmtilesJs', 'protomapsJs'];

const folder = () => new Directory(Paths.document, 'offline-map');
const fileFor = (key: FileKey) => new File(folder(), FILES[key].split('/').pop()!);
const versionsFile = () => new File(folder(), 'versions.json');

/** ETag (or Last-Modified) of each downloaded file, so a file is downloaded again only when it changes. */
function readVersions(): Partial<Record<FileKey, string>> {
  try {
    const file = versionsFile();
    return file.exists ? JSON.parse(file.textSync()) : {};
  } catch {
    return {};
  }
}

let syncing: Promise<void> | null = null;
let libsCache: MapLibs | null | undefined;

/** Downloads missing or changed files; called on every start, without signal it simply does nothing. */
export function syncOfflineMapFiles(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  if (!syncing) {
    syncing = (async () => {
      try {
        const dir = folder();
        if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
        const versions = readVersions();
        // The libraries first: they are small and already make the map work without signal.
        for (const key of [...LIB_KEYS, 'map'] as FileKey[]) {
          const url = `${SITE}/${FILES[key]}`;
          const head = await fetch(url, { method: 'HEAD' });
          if (!head.ok) continue;
          const version = head.headers.get('etag') ?? head.headers.get('last-modified') ?? '';
          const target = fileFor(key);
          if (target.exists && versions[key] === version) continue;

          // Into a separate file first: an interrupted download must not leave a broken map behind.
          const part = new File(dir, `${target.name}.part`);
          if (part.exists) part.delete();
          await File.downloadFileAsync(url, part, { headers: { 'Accept-Encoding': 'identity' } });
          if (key === 'map' && !startsWith(part, MAP_MAGIC)) {
            part.delete();
            continue;
          }
          if (target.exists) target.delete();
          part.moveSync(target);
          versions[key] = version;
          versionsFile().write(JSON.stringify(versions));
          if (key !== 'map') libsCache = undefined;
        }
      } catch {
        // No signal or an interrupted download; the next start tries again.
      } finally {
        syncing = null;
      }
    })();
  }
  return syncing;
}

/** The downloaded map libraries, `null` until all of them are on the phone (the map then uses the CDN). */
export async function loadMapLibs(): Promise<MapLibs | null> {
  if (Platform.OS === 'web') return null;
  if (libsCache !== undefined) return libsCache;
  try {
    const files = LIB_KEYS.map(fileFor);
    if (files.every((f) => f.exists)) {
      const libs = Object.fromEntries(await Promise.all(files.map(async (f, i) => [LIB_KEYS[i], await f.text()]))) as MapLibs;
      libsCache = LIB_KEYS.every((key) => libs[key].includes(LIB_MARKERS[key])) ? libs : null;
    } else {
      libsCache = null;
    }
  } catch {
    libsCache = null;
  }
  return libsCache;
}

function startsWith(file: File, text: string): boolean {
  const handle = file.open(FileMode.ReadOnly);
  try {
    return String.fromCharCode(...handle.readBytes(text.length)) === text;
  } finally {
    handle.close();
  }
}

export function hasOfflineMapFile(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    const file = fileFor('map');
    return file.exists && startsWith(file, MAP_MAGIC);
  } catch {
    return false;
  }
}

/** A piece of the map file as base64, for the map page; `null` when it cannot be read. */
export function readOfflineMapBytes(offset: number, length: number): string | null {
  try {
    const handle = fileFor('map').open(FileMode.ReadOnly);
    try {
      handle.offset = offset;
      const bytes = handle.readBytes(length);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x2000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x2000));
      }
      return btoa(binary);
    } finally {
      handle.close();
    }
  } catch {
    return null;
  }
}
