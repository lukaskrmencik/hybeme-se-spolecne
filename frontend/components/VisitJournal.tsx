import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { groupJournal, JournalEntry, JournalVisit } from '../utils/visitJournal';
import { PlacePhoto } from '../types/photo';
import { PhotoViewer } from './PhotoViewer';
import { RouteMap } from './RouteMap';
import { MAX_PHOTOS_PER_VISIT } from '../services/photos';
import { formatNumber } from '../utils/format';
import { plural } from '../utils/plural';
import { colors, radius, shadows } from '../utils/theme';

const THUMB = 56;

interface VisitJournalProps {
  /** Newest first. */
  visits: JournalVisit[];
  /** Own history: photos can be added to a visit, and they are not offered for reporting. */
  own?: boolean;
  /** Adds photos to a saved visit; resolves when they are uploaded or queued. */
  onAddPhotos?: (visit: JournalVisit) => Promise<void>;
  /** Deletes an own photo; offered in the photo viewer. */
  onDeletePhoto?: (photoId: number, visit: JournalVisit) => Promise<void>;
  header?: React.ReactElement;
  empty?: React.ReactElement;
  refreshControl?: React.ComponentProps<typeof FlatList>['refreshControl'];
}

function Photos({
  visit,
  onOpen,
  onAdd,
  adding,
}: {
  visit: JournalVisit;
  onOpen: (visit: JournalVisit, index: number) => void;
  onAdd?: () => void;
  adding: boolean;
}) {
  const canAdd = !!onAdd && visit.photos.length < MAX_PHOTOS_PER_VISIT;
  if (visit.photos.length === 0 && !canAdd) return null;
  return (
    <View style={styles.photos}>
      {visit.photos.map((p, i) => (
        <Pressable key={p.id} onPress={() => onOpen(visit, i)} accessibilityLabel={`Fotka ${i + 1} z místa ${visit.placeName}`}>
          <Image source={{ uri: p.url }} style={styles.thumb} />
        </Pressable>
      ))}
      {canAdd && (
        <Pressable
          onPress={onAdd}
          disabled={adding}
          style={({ pressed }) => [visit.photos.length === 0 ? styles.addLink : styles.addPhoto, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Přidat fotku k návštěvě místa ${visit.placeName}`}
        >
          {adding ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="camera-outline" size={visit.photos.length === 0 ? 16 : 20} color={colors.primary} />
          )}
          {visit.photos.length === 0 && !adding && <Text style={styles.addPhotoText}>Přidat fotku</Text>}
        </Pressable>
      )}
    </View>
  );
}

/** Own visits and other players' profiles: combinations with their route, visits on their own, photos. */
export function VisitJournal({ visits, own = false, onAddPhotos, onDeletePhoto, header, empty, refreshControl }: VisitJournalProps) {
  const entries = useMemo(() => groupJournal(visits), [visits]);
  const [viewer, setViewer] = useState<{ photos: PlacePhoto[]; index: number; visit: JournalVisit } | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [bigMap, setBigMap] = useState<{ title: string; visits: JournalVisit[] } | null>(null);
  const insets = useSafeAreaInsets();

  const openPhoto = (visit: JournalVisit, index: number) =>
    setViewer({
      photos: visit.photos.map((p) => ({ id: p.id, visitId: visit.id, url: p.url, author: null, takenAt: null })),
      index,
      visit,
    });

  const add = onAddPhotos
    ? (visit: JournalVisit) => async () => {
        setAddingId(visit.id);
        try {
          await onAddPhotos(visit);
        } finally {
          setAddingId(null);
        }
      }
    : null;

  const renderVisitPhotos = (visit: JournalVisit) => (
    <Photos visit={visit} onOpen={openPhoto} onAdd={add?.(visit)} adding={addingId === visit.id} />
  );

  const renderEntry = ({ item }: { item: JournalEntry }) => {
    if (item.kind === 'single') {
      const v = item.visit;
      return (
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.place} numberOfLines={1}>
                {v.placeName}
              </Text>
              <Text style={styles.meta}>
                {v.sportName} · {v.when}
              </Text>
            </View>
            <Text style={styles.points}>+{formatNumber(v.reward)}</Text>
          </View>
          {renderVisitPhotos(v)}
        </View>
      );
    }

    const first = item.visits[0];
    const points = item.visits.map((v) => v.position).filter((p): p is [number, number] => !!p);
    const count = item.visits.length;
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <View style={styles.comboTag}>
              <Ionicons name="git-merge-outline" size={13} color={colors.skyText} />
              <Text style={styles.comboTagText}>
                Kombinace · {count} {plural(count, ['místo', 'místa', 'míst'])}
              </Text>
            </View>
            <Text style={styles.meta}>
              {first.sportName} · {first.when}
            </Text>
          </View>
          <Text style={styles.points}>+{formatNumber(item.total)}</Text>
        </View>

        {points.length >= 2 && (
          <Pressable
            onPress={() => setBigMap({ title: `${first.sportName} · ${first.when}`, visits: item.visits })}
            accessibilityRole="button"
            accessibilityLabel="Zobrazit kombinaci na velké mapě"
          >
            <RouteMap points={points} height={170} />
            <View style={styles.expand} pointerEvents="none">
              <Ionicons name="expand-outline" size={16} color={colors.navy} />
            </View>
          </Pressable>
        )}

        <View style={styles.steps}>
          {item.visits.map((v, i) => (
            <View key={v.id} style={styles.step}>
              <View style={styles.stepLine}>
                <View style={[styles.stepDot, i === 0 && styles.stepDotFirst]}>
                  <Text style={styles.stepDotText}>{i + 1}</Text>
                </View>
                {i < count - 1 && <View style={styles.stepConnector} />}
              </View>
              <View style={styles.stepBody}>
                <View style={styles.row}>
                  <Text style={[styles.place, styles.rowText]} numberOfLines={1}>
                    {v.placeName}
                  </Text>
                  <Text style={styles.stepPoints}>+{formatNumber(v.reward)}</Text>
                </View>
                {renderVisitPhotos(v)}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={entries}
        keyExtractor={(e) => e.key}
        renderItem={renderEntry}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        refreshControl={refreshControl}
      />
      <Modal visible={!!bigMap} animationType="slide" onRequestClose={() => setBigMap(null)}>
        <View style={styles.bigMap}>
          <View style={[styles.bigHead, { paddingTop: insets.top + 10 }]}>
            <View style={styles.rowText}>
              <Text style={styles.bigTitle}>Kombinace</Text>
              <Text style={styles.bigSub}>{bigMap?.title}</Text>
            </View>
            <Pressable onPress={() => setBigMap(null)} style={styles.bigClose} hitSlop={8} accessibilityLabel="Zavřít mapu">
              <Ionicons name="close" size={22} color={colors.navy} />
            </Pressable>
          </View>
          {bigMap && (
            <RouteMap
              interactive
              points={bigMap.visits.map((v) => v.position).filter((p): p is [number, number] => !!p)}
            />
          )}
          <ScrollView style={styles.bigListBox} contentContainerStyle={[styles.bigList, { paddingBottom: insets.bottom + 12 }]}>
            {bigMap?.visits.map((v, i) => (
              <View key={v.id} style={styles.bigItem}>
                <View style={[styles.stepDot, i === 0 && styles.stepDotFirst]}>
                  <Text style={styles.stepDotText}>{i + 1}</Text>
                </View>
                <Text style={[styles.place, styles.rowText]} numberOfLines={1}>
                  {v.placeName}
                </Text>
                <Text style={styles.stepPoints}>+{formatNumber(v.reward)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
      <PhotoViewer
        photos={viewer?.photos ?? []}
        index={viewer?.index ?? null}
        onClose={() => setViewer(null)}
        canReport={own ? () => false : () => true}
        onDelete={onDeletePhoto && viewer ? (photo) => onDeletePhoto(photo.id, viewer.visit) : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  pressed: { opacity: 0.8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1 },
  place: { fontSize: 15, fontWeight: '800', color: colors.navy },
  meta: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 3 },
  points: { fontSize: 17, fontWeight: '900', color: colors.primary },
  comboTag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  comboTagText: { fontSize: 15, fontWeight: '900', color: colors.skyText },

  steps: { gap: 0 },
  step: { flexDirection: 'row', gap: 10 },
  stepLine: { width: 24, alignItems: 'center' },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotFirst: { backgroundColor: colors.primary },
  stepDotText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  stepConnector: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  stepBody: { flex: 1, gap: 8, paddingTop: 2, paddingBottom: 14 },
  stepPoints: { fontSize: 14, fontWeight: '900', color: colors.navy },

  expand: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.float,
  },
  bigMap: { flex: 1, backgroundColor: colors.surface },
  bigHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bigTitle: { fontSize: 18, fontWeight: '900', color: colors.skyText },
  bigSub: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 2 },
  bigClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigListBox: { flexGrow: 0, maxHeight: '35%', borderTopWidth: 1, borderTopColor: colors.border },
  bigList: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  bigItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: colors.background },
  addPhoto: {
    minWidth: THUMB,
    height: THUMB,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Without photos only a small link, so the history of old visits does not fill up with empty boxes.
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  addPhotoText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
});
