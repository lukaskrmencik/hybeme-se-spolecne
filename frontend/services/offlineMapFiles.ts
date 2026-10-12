import { Platform } from 'react-native';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { config } from '../constants/config';

const SITE = config.apiUrlProd.replace(/\/api\/?$/, '');

const FILES = {
  leafletJs: 'vendor/leaflet/leaflet.js',
  leafletCss: 'vendor/leaflet/leaflet.css',
  pmtilesJs: 'vendor/pmtiles/pmtiles.js',
  protomapsJs: 'vendor/protomaps-leaflet/protomaps-leaflet.js',
  map: 'offline-map/area.pmtiles',
} as const;

const LIB_MARKERS: Record<Exclude<FileKey, 'map'>, string> = {
  leafletJs: 'leaflet',
  leafletCss: '.leaflet-container',
  pmtilesJs: 'var pmtiles',
  protomapsJs: 'var protomapsL',
};
const MAP_MAGIC = 'PMTiles';

type FileKey = keyof typeof FILES;
export type MapLibs = Record<Exclude<FileKey, 'map'>, string>;
const LIB_KEYS: Exclude<FileKey, 'map'>[] = ['leafletJs', 'leafletCss', 'pmtilesJs', 'protomapsJs'];

const folder = () => new Directory(Paths.document, 'offline-map');
const fileFor = (key: FileKey) => new File(folder(), FILES[key].split('/').pop()!);
const versionsFile = () => new File(folder(), 'versions.json');

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

export function syncOfflineMapFiles(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  if (!syncing) {
    syncing = (async () => {
      try {
        const dir = folder();
        if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
        const versions = readVersions();
        for (const key of [...LIB_KEYS, 'map'] as FileKey[]) {
          const url = `${SITE}/${FILES[key]}`;
          const head = await fetch(url, { method: 'HEAD' });
          if (!head.ok) continue;
          const version = head.headers.get('etag') ?? head.headers.get('last-modified') ?? '';
          const target = fileFor(key);
          if (target.exists && versions[key] === version) continue;

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
      } catch {} finally {
        syncing = null;
      }
    })();
  }
  return syncing;
}

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
