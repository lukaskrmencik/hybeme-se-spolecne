import { Platform } from 'react-native';
import type { MapLibs } from '../services/offlineMapFiles';

/**
 * <head> tags that load Leaflet (and the Nunito font for the pins) inside the map frames, and on the web
 * the renderer of the offline map (protomaps-leaflet) when asked for.
 * The web takes them from our own server (public/vendor, public/fonts): no request to a foreign CDN, so
 * no visitor's IP goes to unpkg / Google, and the service worker keeps them for offline use. A srcdoc
 * iframe resolves "/…" against the app's address. The native WebView has no address: it gets the copies
 * the app downloaded from our server inline (they work without signal), or the CDN until it has them.
 */
export function mapLibsHead(withFont: boolean, withOfflineMap = false, inline: MapLibs | null = null): string {
  if (Platform.OS === 'web') {
    const font = withFont
      ? `<style>
    @font-face { font-family: Nunito; font-weight: 700; font-display: swap; src: url(/fonts/Nunito-Bold.ttf) format('truetype'); }
    @font-face { font-family: Nunito; font-weight: 800; font-display: swap; src: url(/fonts/Nunito-ExtraBold.ttf) format('truetype'); }
    @font-face { font-family: Nunito; font-weight: 900; font-display: swap; src: url(/fonts/Nunito-Black.ttf) format('truetype'); }
  </style>`
      : '';
    const offlineMap = withOfflineMap ? '<script src="/vendor/protomaps-leaflet/protomaps-leaflet.js"></script>' : '';
    return `<link rel="stylesheet" href="/vendor/leaflet/leaflet.css" />
  ${font}
  <script src="/vendor/leaflet/leaflet.js"></script>
  ${offlineMap}`;
  }
  const font = withFont
    ? '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap" rel="stylesheet" />'
    : '';
  if (inline) {
    const offlineMap = withOfflineMap ? `<script>${inline.pmtilesJs}</script>\n  <script>${inline.protomapsJs}</script>` : '';
    return `<style>${inline.leafletCss}</style>
  ${font}
  <script>${inline.leafletJs}</script>
  ${offlineMap}`;
  }
  return `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  ${font}
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>`;
}
