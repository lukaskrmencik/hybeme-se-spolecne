import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { tileSource, TileSource } from './LeafletMapView';
import { mapLibsHead } from '../utils/mapLibs';
import { loadMapLibs, MapLibs } from '../services/offlineMapFiles';
import { colors, radius } from '../utils/theme';

interface RouteMapProps {
  points: [number, number][];
  height?: number;
  interactive?: boolean;
}

const buildHtml = (points: [number, number][], tiles: TileSource, libs: MapLibs | null, interactive: boolean) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  ${mapLibsHead(false, false, libs)}
  <style>
    html, body, #map { margin:0; padding:0; height:100%; width:100%; }
    body { background:#E7EBE3; font-family: Nunito, "Segoe UI", sans-serif; }
    .leaflet-container { background:#E7EBE3; font: inherit; }
    .leaflet-control-attribution { font-size: 9px; color: #5F7385; background: rgba(255,255,255,.7); }
    .leaflet-control-attribution a { color: #5F7385; text-decoration: none; }
    .mapy-logo { display:block; line-height:0; }
    .mapy-logo img { height:22px; width:auto; display:block; }
    .num { background: transparent; border: none; }
    .num div { width:22px; height:22px; border-radius:11px; background:${colors.navy}; color:#fff; border:2px solid #fff;
      box-shadow:0 2px 5px rgba(10,30,50,.4); font-weight:900; font-size:12px; line-height:22px; text-align:center;
      transform: translate(-50%, -50%); }
    .num.first div { background:${colors.primary}; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
  (function () {
    if (typeof L === 'undefined') return;
    var P = ${JSON.stringify(points)};
    var TILES = ${JSON.stringify(tiles)};
    var INTERACTIVE = ${interactive};
    var map = INTERACTIVE
      ? L.map('map', { zoomControl: true, attributionControl: false })
      : L.map('map', { zoomControl: false, attributionControl: false, dragging: false, touchZoom: false,
          scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false });
    L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);
    L.tileLayer(TILES.url.replace('{r}', L.Browser.retina ? '@2x' : ''), { maxZoom: TILES.maxZoom, tileSize: 256, attribution: TILES.attribution }).addTo(map);
    if (TILES.mapyLogo) {
      var Logo = L.Control.extend({ options: { position: 'bottomleft' }, onAdd: function () {
        var a = L.DomUtil.create('a', 'mapy-logo'); a.href = 'https://mapy.com/'; a.target = '_blank';
        a.innerHTML = '<img src="https://api.mapy.com/img/api/logo.svg" alt="Mapy.com" />'; return a; } });
      new Logo().addTo(map);
    }
    L.polyline(P, { color: '#fff', weight: 7, opacity: 0.9 }).addTo(map);
    L.polyline(P, { color: '${colors.skyText}', weight: 4, dashArray: '8 7' }).addTo(map);
    P.forEach(function (p, i) {
      L.marker(p, { icon: L.divIcon({ className: 'num' + (i === 0 ? ' first' : ''), html: '<div>' + (i + 1) + '</div>', iconSize: [0, 0] }) }).addTo(map);
    });
    map.fitBounds(L.latLngBounds(P), { padding: INTERACTIVE ? [48, 48] : [28, 28], maxZoom: 15 });
  })();
  </script>
</body>
</html>`;

export function RouteMap({ points, height, interactive = false }: RouteMapProps) {
  const [libs, setLibs] = useState<MapLibs | null | undefined>(Platform.OS === 'web' ? null : undefined);
  useEffect(() => {
    if (Platform.OS !== 'web') void loadMapLibs().then(setLibs);
  }, []);

  const key = JSON.stringify(points);
  const html = useMemo(
    () => (libs === undefined ? '' : buildHtml(points, tileSource(), libs, interactive)),
    [key, libs, interactive]
  );

  const touch = interactive ? 'auto' : 'none';
  return (
    <View style={[styles.wrap, height != null ? { height } : styles.fill, interactive && styles.square]}>
      {!html ? null : Platform.OS === 'web' ? (
        <iframe srcDoc={html} title="Mapa kombinace" style={{ width: '100%', height: '100%', border: 'none', pointerEvents: touch }} />
      ) : (
        <View style={styles.fill} pointerEvents={touch}>
          <WebView originWhitelist={['*']} source={{ html }} javaScriptEnabled scrollEnabled={false} style={styles.fill} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#E7EBE3' },
  fill: { flex: 1, width: '100%' },
  square: { borderRadius: 0 },
});
