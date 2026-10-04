import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Place } from '../types/place';
import { GpsPosition } from '../hooks/useLocation';
import { colors } from '../utils/theme';
import { config } from '../constants/config';

/** Same meaning as PlaceState: green = points now, white with a clock = points later, grey tick = done. */
export type PlaceTone = 'open' | 'wait' | 'done';

export interface PlaceStatus {
  inactive: boolean;
  reason: string | null;
  reward: number | null;
  /** The reward is a combination reward (possibly one that only needs time). */
  combo?: boolean;
  tone?: PlaceTone;
}

export interface ActivePlace {
  id: number | null;
  inRange: boolean;
}

export interface MapSelection {
  id: number | null;
  /** Zoom to the place, used when it was picked from search rather than tapped on the map. */
  focus?: boolean;
}

interface LeafletMapProps {
  places: Place[];
  statusMap: Record<number, PlaceStatus>;
  userLocation: GpsPosition | null;
  activePlace: ActivePlace;
  selection: MapSelection;
  onSelectPlace: (id: number | null) => void;
  defaultLat: number;
  defaultLng: number;
  visitRadiusMeters: number;
  recenter?: number;
}

type MapMessage =
  | { type: 'places'; places: { id: number; name: string; lat: number; lng: number }[] }
  | { type: 'status'; statusMap: Record<number, PlaceStatus> }
  | { type: 'location'; location: GpsPosition | null }
  | { type: 'active'; active: ActivePlace }
  | { type: 'selected'; id: number | null; focus?: boolean }
  | { type: 'center' };

interface TileSource {
  /** `{r}` becomes `@2x` on high-density screens, where Mapy.com serves sharper tiles. */
  url: string;
  maxZoom: number;
  attribution: string;
  /** Mapy.com requires its logo, linking to mapy.com, on top of the map. */
  mapyLogo: boolean;
}

function tileSource(): TileSource {
  if (config.mapyApiKey) {
    return {
      url: `https://api.mapy.com/v1/maptiles/${encodeURIComponent(config.mapyMapset)}/256{r}/{z}/{x}/{y}?apikey=${encodeURIComponent(config.mapyApiKey)}`,
      maxZoom: 19,
      attribution: '<a href="https://api.mapy.com/copyright" target="_blank" rel="noopener">&copy; Seznam.cz a.s. a další</a>',
      mapyLogo: true,
    };
  }
  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
    mapyLogo: false,
  };
}

const buildHtml = (lat: number, lng: number, radius: number, tiles: TileSource) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap" rel="stylesheet" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *:focus { outline: none !important; }
    html, body, #map { margin:0; padding:0; height:100%; width:100%; }
    body { background:#E7EBE3; font-family: Nunito, "Segoe UI", sans-serif; }
    .leaflet-container { font: inherit; }
    .leaflet-control-attribution { font-size: 10px; color: #5F7385; background: rgba(255,255,255,.7); }
    .leaflet-control-attribution a { color: #5F7385; text-decoration: none; }
    .mapy-logo { display:block; line-height:0; }
    .mapy-logo img { height:30px; width:auto; display:block; }
    .offline { display:flex; height:100%; align-items:center; justify-content:center; color:#5F7385; font-weight:700; text-align:center; padding:24px; }
    .place-marker { background: transparent; border: none; }
    .pin { position:absolute; left:0; top:0; transform: translate(-50%, -100%); cursor:pointer; }
    .pin-in { display:flex; flex-direction:column; align-items:center; transform-origin: 50% 100%; transition: transform .15s ease; }
    /* App theme colours: green = now, warn (also used for things waiting to be sent) = soon, muted = done. */
    .pill { position:relative; z-index:1; display:flex; align-items:center; gap:4px; height:28px; padding:0 11px; border-radius:14px;
      border:2.5px solid #fff; box-shadow:0 3px 8px rgba(10,30,50,.45); font-weight:900; font-size:13px; line-height:1; white-space:nowrap; }
    .tail { position:relative; z-index:0; width:10px; height:10px; margin-top:-7px; transform:rotate(45deg);
      border-right:2.5px solid #fff; border-bottom:2.5px solid #fff; }
    .t-open .pill, .t-open .tail { background:${colors.primary}; color:${colors.white}; }
    .t-wait .pill, .t-wait .tail { background:${colors.warn}; color:${colors.white}; }
    .t-done .pill, .t-done .tail { background:${colors.muted}; color:${colors.white}; }
    .t-done .pill { padding:0 8px; }
    .pill svg { flex-shrink:0; }
    /* The selected pin keeps its colour and gets a navy ring, which contrasts with all three. */
    .pin.sel .pin-in { transform: scale(1.22); }
    .pin.sel .pill { box-shadow:0 0 0 3px ${colors.navy}, 0 4px 12px rgba(10,30,50,.5); }
    .pin.sel .tail { box-shadow:2px 2px 0 1.5px ${colors.navy}; }
    .pin.near .pill::after { content:''; position:absolute; inset:-7px; border-radius:21px; border:3px solid ${colors.accent}; opacity:0;
      animation: pulse 1.8s ease-out infinite; }
    @keyframes pulse { 0% { transform:scale(.85); opacity:.9; } 100% { transform:scale(1.25); opacity:0; } }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
  (function () {
    if (typeof L === 'undefined') {
      document.getElementById('map').innerHTML = '<div class="offline">Mapu se nepodařilo načíst. Zkontroluj připojení k internetu.</div>';
      window.__mapReceive = function () {};
      return;
    }

    var RADIUS = ${radius};
    var markers = {};
    var statuses = {};
    var active = { id: null, inRange: false };
    var activeZone = null, castLine = null, userMarker = null, userAcc = null;

    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], 13);
    var TILES = ${JSON.stringify(tiles)};
    L.control.attribution({ prefix: false }).addTo(map);
    L.tileLayer(TILES.url.replace('{r}', L.Browser.retina ? '@2x' : ''), {
      maxZoom: TILES.maxZoom, tileSize: 256, attribution: TILES.attribution
    }).addTo(map);
    if (TILES.mapyLogo) {
      var MapyLogo = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd: function () {
          var a = L.DomUtil.create('a', 'mapy-logo');
          a.href = 'https://mapy.com/';
          a.target = '_blank';
          a.rel = 'noopener';
          a.innerHTML = '<img src="https://api.mapy.com/img/api/logo.svg" alt="Mapy.com" />';
          L.DomEvent.disableClickPropagation(a);
          return a;
        }
      });
      new MapyLogo().addTo(map);
    }

    function esc(v) {
      return String(v).replace(/[&<>"']/g, function (m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
      });
    }

    var LINK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>';
    var CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
    var selectedId = null;
    var CLOCK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    var ZIDX = { open: 400, wait: 300, done: 100 };

    function post(m) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m));
      else window.parent.postMessage(m, '*');
    }

    // Colour says when (now / later / done), the link icon says the points are for a combination.
    function pinLabel(tone, reward, combo) {
      if (tone === 'done') return CHECK;
      if (reward == null) return '&ndash;';
      return (tone === 'wait' ? CLOCK : '') + (combo ? LINK : '') + '<span>+' + reward + '</span>';
    }

    function iconFor(id, tone, reward, combo) {
      var cls = 'pin t-' + tone + (id === selectedId ? ' sel' : '') + (selectedId == null && active.inRange && id === active.id ? ' near' : '');
      return L.divIcon({
        className: 'place-marker',
        html: '<div class="' + cls + '"><div class="pin-in"><div class="pill">' + pinLabel(tone, reward, combo) + '</div><div class="tail"></div></div></div>',
        iconSize: [0, 0], iconAnchor: [0, 0]
      });
    }

    function applyStatus(rawId) {
      // Object.keys() hands over strings, selectedId and active.id are numbers.
      var id = Number(rawId);
      var mk = markers[id];
      if (!mk) return;
      var s = statuses[id] || { inactive: true, reason: null, reward: null, tone: 'wait' };
      var tone = s.tone || (s.inactive ? 'wait' : 'open');
      var key = [tone, s.reward, !!s.combo, id === selectedId, selectedId == null && active.inRange && id === active.id].join('|');
      if (mk.__key === key) return;
      mk.__key = key;
      mk.setIcon(iconFor(id, tone, s.reward, !!s.combo));
      mk.setZIndexOffset(id === selectedId ? 1000 : (ZIDX[tone] || 0));
    }

    function setPlaces(list) {
      var seen = {};
      list.forEach(function (p) {
        seen[p.id] = true;
        var mk = markers[p.id];
        if (mk) {
          mk.setLatLng([p.lat, p.lng]);
          mk.options.placeName = p.name;
        } else {
          var created = L.marker([p.lat, p.lng], { icon: iconFor(p.id, 'wait', null), placeName: p.name, keyboard: false }).addTo(map);
          (function (pid) { created.on('click', function () { post({ type: 'select', id: pid }); }); })(p.id);
          markers[p.id] = created;
        }
        applyStatus(p.id);
      });
      Object.keys(markers).forEach(function (id) {
        if (!seen[id]) { map.removeLayer(markers[id]); delete markers[id]; }
      });
      drawActive();
    }

    function setStatus(map_) {
      statuses = map_ || {};
      Object.keys(markers).forEach(applyStatus);
    }

    // One place is emphasised at a time: the tapped one, otherwise the one in range.
    function focusId() {
      if (selectedId != null) return selectedId;
      return active.inRange ? active.id : null;
    }

    function drawActive() {
      if (activeZone) { map.removeLayer(activeZone); activeZone = null; }
      if (castLine) { map.removeLayer(castLine); castLine = null; }
      var fid = focusId();
      var mk = fid == null ? null : markers[fid];
      if (!mk) return;
      var near = userMarker && map.distance(userMarker.getLatLng(), mk.getLatLng()) <= RADIUS;
      if (near && RADIUS > 0) {
        activeZone = L.circle(mk.getLatLng(), {
          radius: RADIUS, color: '#8BB53C', weight: 1.5, dashArray: '4 5',
          fillColor: '#8BB53C', fillOpacity: 0.1, interactive: false
        }).addTo(map);
      }
      if (userMarker) {
        castLine = L.polyline([userMarker.getLatLng(), mk.getLatLng()], {
          color: '#52831A', weight: 2, opacity: 0.75, dashArray: '6 8', interactive: false
        }).addTo(map);
      }
    }

    function setLocation(loc) {
      if (!loc) return;
      var ll = [loc.lat, loc.lng];
      if (!userMarker) {
        userMarker = L.circleMarker(ll, {
          radius: 7, color: '#ffffff', weight: 3, fillColor: '#133F63', fillOpacity: 1
        }).addTo(map);
        userAcc = L.circle(ll, {
          radius: loc.accuracy || 30, color: '#7AB6E3', weight: 1,
          fillColor: '#7AB6E3', fillOpacity: 0.14, interactive: false
        }).addTo(map);
        map.setView(ll, Math.max(map.getZoom(), 15));
      } else {
        userMarker.setLatLng(ll);
        userAcc.setLatLng(ll);
        if (loc.accuracy) userAcc.setRadius(loc.accuracy);
      }
      drawActive();
    }

    function setSelected(id, focus) {
      var prev = selectedId;
      selectedId = id == null ? null : id;
      if (prev != null) applyStatus(prev);
      if (active.id != null) applyStatus(active.id);
      drawActive();
      if (selectedId != null) {
        applyStatus(selectedId);
        var mk = markers[selectedId];
        if (!mk) return;
        if (focus) { map.setView(mk.getLatLng(), Math.max(map.getZoom(), 16), { animate: true }); return; }
        var size = map.getSize(), pt = map.latLngToContainerPoint(mk.getLatLng());
        if (pt.y < 130 || pt.y > size.y - 230 || pt.x < 30 || pt.x > size.x - 30) {
          map.panBy([pt.x - size.x / 2, pt.y - size.y * 0.4], { animate: true });
        }
      }
    }

    map.on('click', function () { post({ type: 'select', id: null }); });

    window.__mapReceive = function (msg) {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'places') setPlaces(msg.places || []);
      else if (msg.type === 'status') setStatus(msg.statusMap);
      else if (msg.type === 'location') setLocation(msg.location);
      else if (msg.type === 'active') {
        var prev = active.id;
        active = msg.active || { id: null, inRange: false };
        if (prev != null) applyStatus(prev);
        if (active.id != null) applyStatus(active.id);
        drawActive();
      }
      else if (msg.type === 'selected') setSelected(msg.id, msg.focus);
      else if (msg.type === 'center' && userMarker) map.setView(userMarker.getLatLng(), Math.max(map.getZoom(), 15));
    };

    window.addEventListener('message', function (event) {
      if (event.source !== window.parent) return;
      window.__mapReceive(event.data);
    });
  })();
  </script>
</body>
</html>
`;

export const LeafletMapView = memo(function LeafletMapView({
  places,
  statusMap,
  userLocation,
  activePlace,
  selection,
  onSelectPlace,
  defaultLat,
  defaultLng,
  visitRadiusMeters,
  recenter = 0,
}: LeafletMapProps) {
  const webViewRef = useRef<WebView | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);

  const html = useMemo(
    () => buildHtml(defaultLat, defaultLng, visitRadiusMeters, tileSource()),
    [defaultLat, defaultLng, visitRadiusMeters]
  );

  const placesMessage = useMemo<MapMessage>(
    () => ({
      type: 'places',
      places: places.map((p) => {
        const [lng, lat] = p.coordinates.coordinates;
        return { id: p.id, name: p.name, lat, lng };
      }),
    }),
    [places]
  );
  const statusMessage = useMemo<MapMessage>(() => ({ type: 'status', statusMap }), [statusMap]);
  const locationMessage = useMemo<MapMessage>(() => ({ type: 'location', location: userLocation }), [userLocation]);
  const activeMessage = useMemo<MapMessage>(() => ({ type: 'active', active: activePlace }), [activePlace]);
  const selectedMessage = useMemo<MapMessage>(
    () => ({ type: 'selected', id: selection.id, focus: selection.focus }),
    [selection]
  );

  const latest = useRef({ placesMessage, statusMessage, locationMessage, activeMessage, selectedMessage });
  latest.current = { placesMessage, statusMessage, locationMessage, activeMessage, selectedMessage };

  const send = useCallback((msg: MapMessage) => {
    if (!readyRef.current) return;
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(msg, '*');
    } else {
      webViewRef.current?.injectJavaScript(`window.__mapReceive && window.__mapReceive(${JSON.stringify(msg)}); true;`);
    }
  }, []);

  useEffect(() => {
    readyRef.current = false;
  }, [html]);

  const handleLoad = useCallback(() => {
    readyRef.current = true;
    const m = latest.current;
    send(m.placesMessage);
    send(m.statusMessage);
    send(m.locationMessage);
    send(m.activeMessage);
    send(m.selectedMessage);
  }, [send]);

  useEffect(() => send(placesMessage), [send, placesMessage]);
  useEffect(() => send(statusMessage), [send, statusMessage]);
  useEffect(() => send(locationMessage), [send, locationMessage]);
  useEffect(() => send(activeMessage), [send, activeMessage]);
  useEffect(() => send(selectedMessage), [send, selectedMessage]);

  const handleMapEvent = useCallback(
    (data: unknown) => {
      const msg = data as { type?: string; id?: number | null } | null;
      if (msg && msg.type === 'select') onSelectPlace(msg.id ?? null);
    },
    [onSelectPlace]
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      handleMapEvent(event.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [handleMapEvent]);
  useEffect(() => {
    if (recenter > 0) send({ type: 'center' });
  }, [send, recenter]);

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <iframe
          ref={iframeRef}
          srcDoc={html}
          onLoad={handleLoad}
          title="Mapa"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      ) : (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html }}
          javaScriptEnabled
          domStorageEnabled
          onLoad={handleLoad}
          onMessage={(e) => {
            try {
              handleMapEvent(JSON.parse(e.nativeEvent.data));
            } catch {
              // ignore foreign messages
            }
          }}
          style={styles.container}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
});
