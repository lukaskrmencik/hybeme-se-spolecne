import { Platform } from 'react-native';
import type { MapLibs } from '../services/offlineMapFiles';

export function mapLibsHead(withFont: boolean, withOfflineMap = false, inline: MapLibs | null = null): string {
  if (Platform.OS === 'web') {
    const font = withFont
      ? `<style>
    @font-face { font-family: Nunito; font-weight: 700; font-display: swap; src: url(/fonts/nunito-bold.woff2) format('woff2'); }
    @font-face { font-family: Nunito; font-weight: 800; font-display: swap; src: url(/fonts/nunito-extrabold.woff2) format('woff2'); }
    @font-face { font-family: Nunito; font-weight: 900; font-display: swap; src: url(/fonts/nunito-black.woff2) format('woff2'); }
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
