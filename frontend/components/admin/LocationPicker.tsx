import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from './ui';
import { tileSource, TileSource } from '../LeafletMapView';
import { config } from '../../constants/config';
import { mapLibsHead } from '../../utils/mapLibs';
import { colors, radius } from '../../utils/theme';

export interface LatLng {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  /** Places that already exist, shown as small dots so the same place is not added twice. */
  existing: { name: string; lat: number; lng: number; active: boolean }[];
}

interface PickerMapProps extends LocationPickerProps {
  /** Fixed height; without it the map fills its parent. */
  height?: number;
  /** Hint in the corner of the map; without it the map is only a preview (no zoom buttons either). */
  hint?: string;
}

type PickerMessage =
  | { type: 'value'; value: LatLng | null; recenter: boolean }
  | { type: 'existing'; places: LocationPickerProps['existing'] };

const buildHtml = (tiles: TileSource, lat: number, lng: number, colorsJson: string, hint: string | undefined) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  ${mapLibsHead(false)}
  <style>
    html, body, #map { margin:0; padding:0; height:100%; width:100%; }
    body { background:#E7EBE3; font-family: Nunito, "Segoe UI", sans-serif; }
    .leaflet-container { cursor: crosshair; font: inherit; }
    .leaflet-control-attribution { font-size: 10px; }
    .mapy-logo img { height:30px; display:block; }
    .hint { background:#fff; color:#133F63; font-weight:800; font-size:13px; padding:6px 10px; border-radius:10px;
      box-shadow:0 2px 6px rgba(19,63,99,.25); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
  (function () {
    if (typeof L === 'undefined') { window.__pick = function () {}; return; }
    var C = ${colorsJson};
    var TILES = ${JSON.stringify(tiles)};
    var map = L.map('map', { zoomControl: ${hint ? 'true' : 'false'}, attributionControl: false }).setView([${lat}, ${lng}], 13);
    L.control.attribution({ prefix: false }).addTo(map);
    L.tileLayer(TILES.url.replace('{r}', L.Browser.retina ? '@2x' : ''), { maxZoom: TILES.maxZoom, tileSize: 256, attribution: TILES.attribution }).addTo(map);
    if (TILES.mapyLogo) {
      var Logo = L.Control.extend({ options: { position: 'bottomleft' }, onAdd: function () {
        var a = L.DomUtil.create('a', 'mapy-logo'); a.href = 'https://mapy.com/'; a.target = '_blank';
        a.innerHTML = '<img src="https://api.mapy.com/img/api/logo.svg" alt="Mapy.com" />'; return a; } });
      new Logo().addTo(map);
    }
    var Hint = L.Control.extend({ options: { position: 'topright' }, onAdd: function () {
      var d = L.DomUtil.create('div', 'hint'); d.textContent = ${JSON.stringify(hint)}; return d; } });
    if (${JSON.stringify(!!hint)}) new Hint().addTo(map);

    var existingLayer = L.layerGroup().addTo(map);
    var marker = null;

    function post(m) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m));
      else window.parent.postMessage(m, '*');
    }

    function setMarker(lat, lng) {
      if (!marker) {
        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', function () { var p = marker.getLatLng(); post({ type: 'pick', lat: p.lat, lng: p.lng }); });
      } else {
        marker.setLatLng([lat, lng]);
      }
    }

    map.on('click', function (e) { setMarker(e.latlng.lat, e.latlng.lng); post({ type: 'pick', lat: e.latlng.lat, lng: e.latlng.lng }); });

    window.__pick = function (msg) {
      if (!msg) return;
      if (msg.type === 'value') {
        if (msg.value) {
          setMarker(msg.value.lat, msg.value.lng);
          if (msg.recenter) map.setView([msg.value.lat, msg.value.lng], Math.max(map.getZoom(), 16));
        } else if (marker) { map.removeLayer(marker); marker = null; }
      } else if (msg.type === 'existing') {
        existingLayer.clearLayers();
        (msg.places || []).forEach(function (p) {
          L.circleMarker([p.lat, p.lng], { radius: 6, weight: 2, color: '#fff',
            fillColor: p.active ? C.primary : C.inactive, fillOpacity: 1, interactive: true })
            .bindTooltip(p.name + (p.active ? '' : ' (vypnuté)')).addTo(existingLayer);
        });
      }
    };
    window.addEventListener('message', function (e) { if (e.source === window.parent) window.__pick(e.data); });
    post({ type: 'ready' });
  })();
  </script>
</body>
</html>`;

/** Map where the admin clicks the spot of a new place; the pin can be dragged to adjust it. */
function PickerMap({ value, onChange, existing, height, hint }: PickerMapProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const webViewRef = useRef<WebView | null>(null);
  const readyRef = useRef(false);
  const lastSent = useRef<LatLng | null>(null);

  const html = useMemo(
    () =>
      buildHtml(
        tileSource(),
        value?.lat ?? config.defaultLat,
        value?.lng ?? config.defaultLng,
        JSON.stringify({ primary: colors.primary, inactive: colors.inactive }),
        hint
      ),
    // The map is built once; later changes go through messages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const send = useCallback((msg: PickerMessage) => {
    if (!readyRef.current) return;
    if (Platform.OS === 'web') iframeRef.current?.contentWindow?.postMessage(msg, '*');
    else webViewRef.current?.injectJavaScript(`window.__pick && window.__pick(${JSON.stringify(msg)}); true;`);
  }, []);

  const latest = useRef({ value, existing });
  latest.current = { value, existing };

  const handle = useCallback(
    (data: unknown) => {
      const msg = data as { type?: string; lat?: number; lng?: number } | null;
      if (!msg) return;
      if (msg.type === 'ready') {
        readyRef.current = true;
        send({ type: 'existing', places: latest.current.existing });
        send({ type: 'value', value: latest.current.value, recenter: !!latest.current.value });
      } else if (msg.type === 'pick' && typeof msg.lat === 'number' && typeof msg.lng === 'number') {
        const next = { lat: Number(msg.lat.toFixed(6)), lng: Number(msg.lng.toFixed(6)) };
        lastSent.current = next;
        onChange(next);
      }
    },
    [onChange, send]
  );

  // A value typed in by hand moves the pin and the map; a click in the map only moves the pin.
  useEffect(() => {
    const fromMap = lastSent.current && value && lastSent.current.lat === value.lat && lastSent.current.lng === value.lng;
    send({ type: 'value', value, recenter: !fromMap });
  }, [value, send]);

  useEffect(() => send({ type: 'existing', places: existing }), [existing, send]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (event: MessageEvent) => {
      if (event.source === iframeRef.current?.contentWindow) handle(event.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [handle]);

  return (
    <View style={[styles.wrap, height != null ? { height } : styles.fill]}>
      {Platform.OS === 'web' ? (
        <iframe ref={iframeRef} srcDoc={html} title="Výběr polohy" style={{ width: '100%', height: '100%', border: 'none' }} />
      ) : (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html }}
          javaScriptEnabled
          nestedScrollEnabled
          onMessage={(e) => {
            try {
              handle(JSON.parse(e.nativeEvent.data));
            } catch {
              // ignore foreign messages
            }
          }}
          style={styles.wrap}
        />
      )}
    </View>
  );
}

/** Below this width the form scrolls under the finger, so the map opens full screen instead of being used inline. */
const COMPACT_WIDTH = 700;

export function LocationPicker(props: LocationPickerProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  if (width >= COMPACT_WIDTH) return <PickerMap {...props} height={320} hint="Klikněte do mapy na místo" />;

  return (
    <>
      <View style={styles.preview}>
        <PickerMap {...props} height={190} />
        {/* Covers the map: in the scrolling form a drag would move the map and the page at once. */}
        <Pressable
          style={[StyleSheet.absoluteFill, styles.previewCover]}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Otevřít mapu pro výběr polohy"
        >
          <View style={styles.openBadge}>
            <Ionicons name="expand-outline" size={16} color={colors.white} />
            <Text style={styles.openText}>{props.value ? 'Upravit na mapě' : 'Vybrat na mapě'}</Text>
          </View>
        </Pressable>
      </View>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.full}>
          <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
            <View style={styles.fill}>
              <Text style={styles.title}>Poloha místa</Text>
              <Text style={styles.sub}>Klepněte na místo, špendlík lze potom posunout.</Text>
            </View>
            <Pressable onPress={() => setOpen(false)} style={styles.close} hitSlop={8} accessibilityLabel="Zavřít mapu">
              <Ionicons name="close" size={22} color={colors.navy} />
            </Pressable>
          </View>
          <View style={styles.fill}>{open && <PickerMap {...props} hint="Klepněte na místo" />}</View>
          <View style={[styles.foot, { paddingBottom: insets.bottom + 12 }]}>
            <Button label={props.value ? 'Hotovo' : 'Zavřít'} icon={props.value ? 'checkmark' : undefined} onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#E7EBE3' },
  fill: { flex: 1 },
  preview: { width: '100%', height: 190 },
  previewCover: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 14 },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.navy,
  },
  openText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  full: { flex: 1, backgroundColor: colors.surface },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '900', color: colors.navy },
  sub: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 2 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  foot: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'stretch' },
});
