import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Place } from '../types/place';
import { Sport } from '../types/sport';
import { colors, radius, shadows } from '../utils/theme';
import { formatDistance, formatNumber } from '../utils/format';
import { routeTypeLabel } from '../utils/navigation';
import { SportChips } from './SportChips';
import { PlacePhotoStrip } from './PlacePhotoStrip';
import { PhotoAttach } from './PhotoAttach';
import { LocalPhoto } from '../types/visit';

export interface BlockInfo {
  text: string;
  /** `info` is a temporary or neutral reason (too far, wait a bit), `danger` is a hard no. */
  tone: 'info' | 'danger';
}

interface VisitSheetProps {
  /** `card` follows a tapped pin and can be closed, `cta` is only the big button for a place in range. */
  mode: 'card' | 'cta';
  place: Place | null;
  distance: number | null;
  sport: Sport | null;
  sports: Sport[];
  onSelectSport: (id: number) => void;
  /** Shown under the sport picker when the combination needs a different sport. */
  sportHint: string | null;
  multiplier: number;
  hasLastVisit: boolean;
  /** The switch can be used: the combination is valid now, or only needs time (saving then waits). */
  comboAvailable: boolean;
  /** Why the switch is disabled. */
  comboReason: string | null;
  isCombination: boolean;
  onToggleCombination: (value: boolean) => void;
  allowed: boolean;
  blocked: BlockInfo | null;
  /** Points for the current choice, they follow the switch and the sport live. */
  reward: number;
  comboReward: number;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
  /** Opens the route to the place in Mapy.com. */
  onNavigate: () => void;
  /** Photos the user attaches to the visit being saved. */
  photos: LocalPhoto[];
  onPhotosChange: (photos: LocalPhoto[]) => void;
  /** Room left on the screen above the tab bar; the card scrolls inside it and keeps the button visible. */
  maxHeight?: number;
}

const COMBO_INFO =
  'Kombinace znamená, že navážeš na svou poslední návštěvu: přesuneš se na další místo stejným sportem a stihneš to ' +
  'v rozumné rychlosti. Za každé další místo v řadě roste násobek bodů a počítají se i body za ujetou vzdálenost.';

function ComboRow({
  multiplier,
  comboAvailable,
  comboReason,
  isCombination,
  comboReward,
  onToggle,
}: Pick<VisitSheetProps, 'multiplier' | 'comboAvailable' | 'comboReason' | 'isCombination' | 'comboReward'> & {
  onToggle: (value: boolean) => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <View style={styles.comboWrap}>
      <View style={[styles.combo, isCombination && styles.comboOn, !comboAvailable && styles.comboDisabled]}>
        <TouchableOpacity
          style={styles.comboMain}
          onPress={() => onToggle(!isCombination)}
          disabled={!comboAvailable}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isCombination, disabled: !comboAvailable }}
        >
          <View style={[styles.checkbox, isCombination && styles.checkboxOn]}>
            {isCombination && <Ionicons name="checkmark" size={14} color={colors.white} />}
          </View>
          <Text style={[styles.comboText, isCombination && styles.comboTextOn]} numberOfLines={1}>
            Kombinace ×{multiplier}
          </Text>
          <Text style={[styles.comboReward, isCombination && styles.comboRewardOn]}>+{formatNumber(comboReward)} b.</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setInfoOpen((v) => !v)}
          hitSlop={8}
          style={styles.info}
          accessibilityRole="button"
          accessibilityLabel="Co je kombinace?"
        >
          <Ionicons name={infoOpen ? 'information-circle' : 'information-circle-outline'} size={22} color={colors.skyText} />
        </TouchableOpacity>
      </View>
      {infoOpen && <Text style={styles.infoText}>{COMBO_INFO}</Text>}
      {!comboAvailable && comboReason && <Text style={styles.comboReason}>{comboReason}</Text>}
    </View>
  );
}

function SaveButton({
  allowed,
  isSaving,
  reward,
  onSave,
  caption,
}: Pick<VisitSheetProps, 'allowed' | 'isSaving' | 'reward' | 'onSave'> & { caption?: string }) {
  return (
    <TouchableOpacity
      style={[styles.button, !allowed && styles.buttonDisabled]}
      onPress={onSave}
      disabled={!allowed || isSaving}
      accessibilityRole="button"
    >
      {isSaving ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          <Ionicons name="location" size={24} color={colors.white} />
          <View style={styles.buttonTextWrap}>
            {!!caption && (
              <Text style={styles.buttonCaption} numberOfLines={1}>
                {caption}
              </Text>
            )}
            <Text style={styles.buttonText}>{allowed ? 'Jsem tu!' : 'Návštěva není možná'}</Text>
          </View>
          {allowed && <Text style={styles.buttonReward}>+{formatNumber(reward)} b.</Text>}
        </>
      )}
    </TouchableOpacity>
  );
}

/** The sport is picked right where the visit is saved, so a wrong one is hard to miss. */
function SportPicker({ sport, sports, onSelectSport, sportHint }: Pick<VisitSheetProps, 'sport' | 'sports' | 'onSelectSport' | 'sportHint'>) {
  if (sports.length === 0) return null;
  return (
    <View style={styles.sportWrap}>
      <View style={styles.sportHead}>
        <Ionicons name="bicycle-outline" size={15} color={colors.muted} />
        <Text style={styles.sportLabel}>Sport</Text>
      </View>
      <SportChips sports={sports} selectedId={sport?.id} onSelect={onSelectSport} variant="inline" />
      {!!sportHint && (
        <View style={styles.sportHint}>
          <Ionicons name="swap-horizontal" size={14} color={colors.skyText} />
          <Text style={styles.sportHintText}>{sportHint}</Text>
        </View>
      )}
    </View>
  );
}

function BlockNote({ blocked }: { blocked: BlockInfo }) {
  const danger = blocked.tone === 'danger';
  return (
    <View style={[styles.block, danger ? styles.blockDanger : styles.blockInfo]}>
      <Ionicons
        name={danger ? 'alert-circle' : 'time-outline'}
        size={16}
        color={danger ? colors.dangerText : colors.navy}
      />
      <Text style={[styles.blockText, { color: danger ? colors.dangerText : colors.navy }]}>{blocked.text}</Text>
    </View>
  );
}

/** Bottom area of the map: the card for a tapped pin, or the big „Jsem tu!“ button for a place in range. */
export function VisitSheet({
  mode,
  place,
  distance,
  sport,
  sports,
  onSelectSport,
  sportHint,
  multiplier,
  hasLastVisit,
  comboAvailable,
  comboReason,
  isCombination,
  onToggleCombination,
  allowed,
  blocked,
  reward,
  comboReward,
  isSaving,
  onSave,
  onClose,
  onNavigate,
  photos,
  onPhotosChange,
  maxHeight,
}: VisitSheetProps) {
  const appear = useRef(new Animated.Value(0)).current;
  const visible = !!place;

  useEffect(() => {
    Animated.timing(appear, { toValue: visible ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [visible, appear]);

  if (!place) return null;

  const animation = {
    opacity: appear,
    transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };

  if (mode === 'cta') {
    return (
      <Animated.View style={[styles.cta, animation]}>
        <View style={styles.ctaBox}>
          <SportPicker sport={sport} sports={sports} onSelectSport={onSelectSport} sportHint={sportHint} />
          {allowed && (
            <>
              <View style={styles.divider} />
              <PhotoAttach photos={photos} onChange={onPhotosChange} disabled={isSaving} />
            </>
          )}
        </View>
        {hasLastVisit && comboAvailable && (
          <View style={styles.ctaCombo}>
            <ComboRow
              multiplier={multiplier}
              comboAvailable={comboAvailable}
              comboReason={comboReason}
              isCombination={isCombination}
              comboReward={comboReward}
              onToggle={onToggleCombination}
            />
          </View>
        )}
        {blocked && <BlockNote blocked={blocked} />}
        <SaveButton allowed={allowed} isSaving={isSaving} reward={reward} onSave={onSave} caption={place.name} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.card, maxHeight != null && { maxHeight }, animation]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title} numberOfLines={2}>
            {place.name}
          </Text>
          <View style={styles.meta}>
            <View style={styles.tagNavy}>
              <Ionicons name="navigate-outline" size={12} color={colors.navy} />
              <Text style={styles.tagNavyText}>
                {distance != null ? `${formatDistance(distance)} od tebe` : 'Zjišťuji polohu…'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onNavigate} style={styles.navigate} accessibilityRole="link">
            <Ionicons name="navigate" size={15} color={colors.white} />
            <Text style={styles.navigateText}>Navigovat</Text>
            <Text style={styles.navigateSub}>Mapy.com · {routeTypeLabel(sport?.mapy_route_type, true)}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.close}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Zavřít"
        >
          <Ionicons name="close" size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        <PlacePhotoStrip placeId={place.id} />

        <SportPicker sport={sport} sports={sports} onSelectSport={onSelectSport} sportHint={sportHint} />

        <View style={styles.rewardRow}>
          <View>
            <Text style={styles.rewardLabel}>Získáš</Text>
            <Text style={styles.rewardSub}>{isCombination ? `Kombinace ×${multiplier}` : 'Samostatná návštěva'}</Text>
          </View>
          <Text style={styles.rewardValue}>+{formatNumber(reward)} b.</Text>
        </View>

        {hasLastVisit && (
          <ComboRow
            multiplier={multiplier}
            comboAvailable={comboAvailable}
            comboReason={comboReason}
            isCombination={isCombination}
            comboReward={comboReward}
            onToggle={onToggleCombination}
          />
        )}

        {allowed && (
          <View style={styles.attach}>
            <Text style={styles.attachLabel}>Tvoje fotky k návštěvě</Text>
            <PhotoAttach photos={photos} onChange={onPhotosChange} disabled={isSaving} />
          </View>
        )}

        {blocked && <BlockNote blocked={blocked} />}
      </ScrollView>

      <SaveButton allowed={allowed} isSaving={isSaving} reward={reward} onSave={onSave} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    gap: 12,
    boxShadow: '0px 6px 24px rgba(19, 63, 99, 0.2)',
  },
  cta: { marginHorizontal: 12, marginBottom: 12, gap: 8 },
  body: { flexShrink: 1, marginHorizontal: -14 },
  bodyContent: { gap: 12, paddingHorizontal: 14 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  attach: { gap: 8 },
  attachLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  ctaBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...shadows.float,
  },
  sportWrap: { gap: 8 },
  sportHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sportLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sportHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.skyBg,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sportHintText: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.skyText },
  ctaCombo: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...shadows.float,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '900', color: colors.navy, lineHeight: 22 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tagNavy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.navyBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  navigate: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 10,
    backgroundColor: colors.navy,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  navigateText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  navigateSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  tagNavyText: { color: colors.navy, fontSize: 12, fontWeight: '800' },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rewardLabel: { fontSize: 13, fontWeight: '800', color: colors.navy },
  rewardSub: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 1 },
  rewardValue: { fontSize: 26, fontWeight: '900', color: colors.primary },
  comboWrap: { gap: 6 },
  combo: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  comboOn: { backgroundColor: colors.skyBg },
  comboDisabled: { opacity: 0.6 },
  comboMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.inactive,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.skyText, borderColor: colors.skyText },
  comboText: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.muted },
  comboTextOn: { color: colors.skyText },
  comboReward: { fontSize: 13, fontWeight: '900', color: colors.muted },
  comboRewardOn: { color: colors.skyText },
  info: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.navy,
    backgroundColor: colors.skyBg,
    borderRadius: radius.sm,
    padding: 10,
  },
  comboReason: { fontSize: 12, fontWeight: '700', color: colors.muted, paddingHorizontal: 4 },
  block: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  blockInfo: { backgroundColor: colors.navyBg },
  blockDanger: { backgroundColor: colors.dangerBg },
  blockText: { flex: 1, fontSize: 13, fontWeight: '700' },
  button: {
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    boxShadow: '0px 6px 16px rgba(82, 131, 26, 0.35)',
  },
  buttonDisabled: { backgroundColor: colors.inactive, boxShadow: 'none' },
  buttonTextWrap: { alignItems: 'flex-start', flexShrink: 1 },
  buttonCaption: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800' },
  buttonText: { color: colors.white, fontSize: 18, fontWeight: '900' },
  buttonReward: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});
