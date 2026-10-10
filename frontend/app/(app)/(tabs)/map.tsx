import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, Pressable, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { usePlaces } from '../../../hooks/usePlaces';
import { useSports } from '../../../hooks/useSports';
import { useLocation } from '../../../hooks/useLocation';
import { useNow } from '../../../hooks/useNow';
import { useAuth } from '../../../context/AuthContext';
import { useUserStats } from '../../../context/UserStatsContext';
import { LeafletMapView, PlaceStatus, ActivePlace, MapSelection } from '../../../components/LeafletMapView';
import { VisitSheet } from '../../../components/VisitSheet';
import { SportChips } from '../../../components/SportChips';
import { LocationBanner } from '../../../components/LocationBanner';
import { openNavigation } from '../../../utils/navigation';
import { MapLegend } from '../../../components/MapLegend';
import { submitVisit } from '../../../services/visits';
import { getErrorMessage } from '../../../services/api';
import { config } from '../../../constants/config';
import { getDistanceInMeters } from '../../../utils/distance';
import { formatDistance } from '../../../utils/format';
import { calculateReward, getCombinationLevel, getCombinationMultiplier } from '../../../utils/rewardMath';
import { formatWait, getPlaceAvailability, PlaceAvailability } from '../../../utils/placeState';
import { showToast } from '../../../utils/alert';
import { LocalPhoto } from '../../../types/visit';
import { parseVisitTime } from '../../../utils/dates';
import { colors, radius, shadows } from '../../../utils/theme';
import { Place } from '../../../types/place';

const RADIUS = config.visitRadiusMeters;
/** Search row and sport chips stay visible above the card. */
const SHEET_TOP_GAP = 124;

export default function MapScreen() {
  const { places, loading: loadingPlaces, error } = usePlaces();
  const { sports, loading: loadingSports } = useSports();
  const { position, status: locationStatus, retry: retryLocation } = useLocation();
  const { userId } = useAuth();
  const { visits, lastVisit, loading: loadingStats, pendingCount, addConfirmedVisit, flushNow, uploadVisitPhotos } =
    useUserStats();
  const tick = useNow(15_000);

  const [selectedSportId, setSelectedSportId] = useState<number | undefined>(undefined);
  /** Place where the user unchecked the combination themselves. */
  const [comboOptOutId, setComboOptOutId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selection, setSelection] = useState<MapSelection>({ id: null });
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [recenter, setRecenter] = useState(0);
  const [legendOpen, setLegendOpen] = useState(false);
  /** Photos for the next saved visit. They stay when the card switches to another place. */
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [areaHeight, setAreaHeight] = useState(0);

  useEffect(() => {
    if (sports.length === 0) return;
    if (selectedSportId === undefined || !sports.some((s) => s.id === selectedSportId)) {
      setSelectedSportId(sports[0].id);
    }
  }, [sports, selectedSportId]);

  const selectedSport = useMemo(
    () => sports.find((s) => s.id === selectedSportId) ?? null,
    [sports, selectedSportId]
  );

  // The tick is up to 15 s old, which would put a fresh visit in the future and break the combination check.
  const lastVisitMs = lastVisit ? parseVisitTime(lastVisit.timestamp) : NaN;
  const now = Number.isFinite(lastVisitMs) ? Math.max(tick, lastVisitMs + 1000) : tick;

  const availability = useMemo(() => {
    const map = new Map<number, PlaceAvailability>();
    for (const place of places) {
      map.set(place.id, getPlaceAvailability(place, selectedSport, visits, lastVisit, now));
    }
    return map;
  }, [places, visits, lastVisit, selectedSport, now]);

  const statusMap = useMemo(() => {
    const map: Record<number, PlaceStatus> = {};
    for (const place of places) {
      const a = availability.get(place.id);
      map[place.id] = a
        ? { inactive: !a.visitable, tone: a.state, reason: a.reason, reward: a.pinReward, combo: a.pinIsCombo }
        : { inactive: true, tone: 'wait', reason: null, reward: null };
    }
    return map;
  }, [places, availability]);

  const distances = useMemo(() => {
    const map = new Map<number, number>();
    if (!position) return map;
    for (const place of places) {
      const [lng, lat] = place.coordinates.coordinates;
      map.set(place.id, getDistanceInMeters(position.lat, position.lng, lat, lng));
    }
    return map;
  }, [places, position]);

  /**
   * Nearest place that can be visited right now. When none is in range, a place in range that only
   * needs a short wait wins, so the big button stays under the thumb and says how long to wait.
   */
  const target = useMemo(() => {
    let best: { place: Place; distance: number } | null = null;
    let waiting: { place: Place; distance: number } | null = null;
    for (const place of places) {
      const distance = distances.get(place.id);
      const a = availability.get(place.id);
      if (distance == null || !a) continue;
      if (a.visitable) {
        if (!best || distance < best.distance) best = { place, distance };
      } else if (a.state === 'wait' && distance <= RADIUS) {
        if (!waiting || distance < waiting.distance) waiting = { place, distance };
      }
    }
    return best && (best.distance <= RADIUS || !waiting) ? best : waiting;
  }, [places, distances, availability]);
  const targetInRange = !!target && target.distance <= RADIUS;

  // The card follows a tapped pin. Without one, a place in range gets just the big button.
  const selectedPlace = places.find((p) => p.id === selection.id) ?? null;
  const actionPlace = selectedPlace ?? (targetInRange ? target!.place : null);
  const mode = selectedPlace ? 'card' : 'cta';

  const actionAvail = actionPlace ? availability.get(actionPlace.id) : undefined;
  const actionDistance = actionPlace ? distances.get(actionPlace.id) ?? null : null;
  const inRange = actionDistance != null && actionDistance <= RADIUS;

  // The switch can be used whenever a combination is valid now or only needs time, and it starts checked.
  // Unchecking shows the single-visit points. Saving a checked combination waits until it is valid;
  // the note under the card says why, in one place. Only an explicit uncheck turns it off, per place.
  const comboValid = !!actionAvail?.comboValid;
  const comboAvailable = !!actionAvail?.pinIsCombo;
  const actionPlaceId = actionPlace?.id ?? null;
  const useCombo = comboAvailable && comboOptOutId !== actionPlaceId;
  const setIsCombination = useCallback(
    (value: boolean) => setComboOptOutId(value ? null : actionPlaceId),
    [actionPlaceId]
  );

  const comboReward = actionPlace ? calculateReward(actionPlace, selectedSport, lastVisit, true) : 0;
  const singleReward = actionPlace?.default_reward ?? 0;
  const reward = useCombo ? comboReward : singleReward;

  // Every block is temporary (the cooldown, the pause, the distance, the speed), so none is shown as an error.
  const comboWaitText =
    useCombo && !comboValid && actionAvail?.waitMinutes != null
      ? `Kombinace bude možná za ${formatWait(actionAvail.waitMinutes)}.`
      : null;
  const singleWaitText =
    !useCombo && actionAvail?.single.kind === 'min_interval' && actionAvail.single.waitMinutes != null
      ? `Samostatná návštěva bude možná za ${formatWait(actionAvail.single.waitMinutes)}.`
      : null;
  let blockedText: string | null = null;
  if (!actionPlace) blockedText = null;
  else if (actionAvail?.state === 'done') blockedText = actionAvail.reason ?? 'Tady už body máš.';
  else if (!inRange) blockedText = ['Jsi mimo dosah místa.', comboWaitText ?? singleWaitText].filter(Boolean).join(' ');
  else if (useCombo && !comboValid) {
    blockedText = `${comboWaitText ?? 'Kombinace teď není možná.'} Teď je to na ni moc rychle.` +
      (actionAvail?.single.allowed ? ' Pokud ji vypneš, uložíš samostatnou návštěvu.' : '');
  } else if (!useCombo && !actionAvail?.single.allowed) {
    blockedText = singleWaitText ?? actionAvail?.single.reason ?? 'Návštěva teď není možná.';
  }
  const blocked: { text: string; tone: 'info' | 'danger' } | null = blockedText ? { text: blockedText, tone: 'info' } : null;

  // A place that already scored cannot be a combination either, so the combination row is left out.
  const placeDone = actionAvail?.state === 'done';
  const allowed = !!actionPlace && blocked == null;

  // The combination continues the last visit, so it only works with the same sport.
  const sportHint =
    actionAvail?.prediction?.kind === 'sport' && actionAvail.combo.allowed && lastVisit?.sport
      ? `Kombinace navazuje na návštěvu se sportem ${lastVisit.sport.name}. Přepni na něj a body se přepočítají.`
      : null;

  // Every message is shown once: the reason under the combination row is dropped when the note at the
  // bottom of the card (or the sport hint) already says the same.
  const rawComboReason = sportHint || comboAvailable || placeDone ? null : actionAvail?.comboReason ?? null;
  const comboReasonText =
    rawComboReason && !(blockedText && (blockedText.includes(rawComboReason) || rawComboReason.includes(blockedText)))
      ? rawComboReason
      : null;

  const level = getCombinationLevel(lastVisit);
  const multiplier = selectedSport ? getCombinationMultiplier(selectedSport, level) : 1;

  const selectPlace = useCallback((id: number | null, focus = false) => setSelection({ id, focus }), []);
  const closeSheet = useCallback(() => setSelection({ id: null }), []);

  const activePlace = useMemo<ActivePlace>(
    () => ({ id: target?.place.id ?? null, inRange: targetInRange }),
    [target?.place.id, targetInRange]
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return places
      .filter((p) => p.name.toLowerCase().includes(q))
      .sort((a, b) => (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity))
      .slice(0, 5);
  }, [places, query, distances]);

  const pickMatch = (id: number) => {
    setQuery('');
    setSearchFocused(false);
    Keyboard.dismiss();
    selectPlace(id, true);
  };

  const handleSaveVisit = async () => {
    if (!actionPlace || !selectedSport || !allowed || isSaving) return;
    const place = actionPlace;
    const sport = selectedSport;
    const timestamp = new Date().toISOString();
    const attached = photos;

    setIsSaving(true);
    try {
      if (pendingCount > 0) await flushNow();
      const result = await submitVisit({
        userId,
        place,
        sport,
        isCombination: useCombo,
        timestamp,
        expectedReward: reward,
        photos: attached,
      });
      closeSheet();
      setPhotos([]);
      if (result.kind === 'queued') {
        showToast(
          'Návštěva čeká na připojení',
          `Odešleme ji${attached.length && !result.photosDropped ? ' i s fotkami' : ''}, jakmile budeš online. Zatím počítáme +${reward} b.` +
            (result.photosDropped ? ' Fotky se do telefonu nevešly.' : ''),
          'info'
        );
      } else {
        addConfirmedVisit(result.visit, place, sport);
        if (result.visit.cheat_note) {
          showToast(`Uloženo, +${result.visit.reward} b.`, `${result.visit.cheat_note}`, 'info');
        } else {
          showToast(`Návštěva uložena, +${result.visit.reward} b.`, undefined, 'success');
        }
        void uploadVisitPhotos(result.visit.id, place.id, attached);
      }
    } catch (err) {
      showToast('Návštěva nebyla uznána', getErrorMessage(err, 'Zkus to prosím později.'), 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const isInitialLoading = (loadingPlaces || loadingSports || loadingStats) && places.length === 0;
  if (isInitialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const showMatches = searchFocused && query.trim().length > 0;

  return (
    <View style={styles.container} onLayout={(e) => setAreaHeight(e.nativeEvent.layout.height)}>
      <View style={StyleSheet.absoluteFill}>
        <LeafletMapView
          places={places}
          statusMap={statusMap}
          userLocation={position}
          activePlace={activePlace}
          selection={selection}
          onSelectPlace={selectPlace}
          recenter={recenter}
          defaultLat={config.defaultLat}
          defaultLng={config.defaultLng}
          visitRadiusMeters={RADIUS}
        />
      </View>

      <View style={styles.top} pointerEvents="box-none">
        <View style={styles.searchRow} pointerEvents="box-none">
          <View style={[styles.searchBox, searchFocused && styles.searchBoxFocus]}>
            <Ionicons name="search-outline" size={16} color={colors.inactive} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Hledat místo"
              placeholderTextColor={colors.inactive}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => matches[0] && pickMatch(matches[0].id)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Smazat hledání">
                <Ionicons name="close-circle" size={18} color={colors.inactive} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.locate} onPress={() => setRecenter((n) => n + 1)} accessibilityLabel="Moje poloha">
            <Ionicons name="locate-outline" size={21} color={colors.navy} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.locate, legendOpen && styles.toolActive]}
            onPress={() => setLegendOpen((v) => !v)}
            accessibilityLabel="Co znamenají body na mapě"
          >
            <Ionicons name="help" size={22} color={legendOpen ? colors.white : colors.navy} />
          </TouchableOpacity>
        </View>

        <SportChips sports={sports} selectedId={selectedSportId} onSelect={setSelectedSportId} />

        {legendOpen && !showMatches && <MapLegend onClose={() => setLegendOpen(false)} />}

        {showMatches && (
          <View style={styles.results}>
            {matches.length === 0 ? (
              <Text style={styles.noResult}>Nic jsme nenašli</Text>
            ) : (
              matches.map((p, i) => {
                const d = distances.get(p.id);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => pickMatch(p.id)}
                    style={[styles.result, i > 0 && styles.resultBorder]}
                  >
                    <Ionicons name="location-outline" size={18} color={colors.muted} />
                    <Text style={styles.resultName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    {d != null && (
                      <Text style={styles.resultDist}>{formatDistance(d)}</Text>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {!!error && (
          <View style={[styles.errorBanner, styles.bannerGap]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <LocationBanner status={locationStatus} onRetry={() => void retryLocation()} />
      </View>

      <View style={styles.sheetLayer} pointerEvents="box-none">
        <VisitSheet
          mode={mode}
          place={actionPlace}
          distance={actionDistance}
          sport={selectedSport}
          sports={sports}
          onSelectSport={setSelectedSportId}
          sportHint={sportHint}
          multiplier={multiplier}
          hasLastVisit={!!lastVisit && !placeDone}
          comboAvailable={comboAvailable}
          comboReason={comboReasonText}
          isCombination={useCombo}
          onToggleCombination={setIsCombination}
          allowed={allowed}
          inRange={inRange}
          blocked={blocked}
          reward={reward}
          comboReward={comboReward}
          isSaving={isSaving}
          onSave={handleSaveVisit}
          onClose={closeSheet}
          onNavigate={() => {
            if (!actionPlace) return;
            const [lng, lat] = actionPlace.coordinates.coordinates;
            openNavigation({ lat, lng }, position, selectedSport?.mapy_route_type);
          }}
          photos={photos}
          onPhotosChange={setPhotos}
          maxHeight={areaHeight > 0 ? areaHeight - SHEET_TOP_GAP : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  top: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5 },
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10 },
  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    ...shadows.float,
  },
  searchBoxFocus: { boxShadow: '0px 3px 14px rgba(19, 63, 99, 0.22)' },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    height: '100%',
    borderWidth: 0,
    outlineWidth: 0,
  },
  locate: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.float,
  },
  toolActive: { backgroundColor: colors.navy },
  sheetLayer: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 8 },
  results: {
    position: 'absolute',
    top: 62,
    left: 12,
    right: 64,
    zIndex: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    boxShadow: '0px 6px 20px rgba(19, 63, 99, 0.18)',
  },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  resultBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  resultName: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.navy },
  resultDist: { fontSize: 12, fontWeight: '800', color: colors.muted },
  noResult: { padding: 14, fontSize: 13, fontWeight: '700', color: colors.muted },
  errorBanner: {
    marginHorizontal: 12,
    backgroundColor: colors.danger,
    padding: 10,
    borderRadius: 10,
  },
  errorText: { color: colors.white, textAlign: 'center', fontWeight: '700' },
  bannerGap: { marginBottom: 8 },
});
