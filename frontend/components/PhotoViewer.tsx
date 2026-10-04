import React, { useEffect, useState } from 'react';
import { FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PlacePhoto } from '../types/photo';
import { formatVisitTime } from '../utils/dates';
import { ReportDialog } from './ReportDialog';
import { ReportTarget } from '../services/reports';
import { colors } from '../utils/theme';

interface PhotoViewerProps {
  photos: PlacePhoto[];
  /** Index of the photo to open, `null` keeps the viewer closed. */
  index: number | null;
  onClose: () => void;
  /** Whether the photo can be reported to the admins; not shown when missing (e.g. in the administration). */
  canReport?: (photo: PlacePhoto) => boolean;
}

/** Full-screen gallery, swiping goes to the next photo. */
export function PhotoViewer({ photos, index, onClose, canReport }: PhotoViewerProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const open = index != null && photos.length > 0;

  useEffect(() => {
    if (index != null) setCurrent(index);
  }, [index]);

  const shown = photos[current] ?? photos[0];

  return (
    <Modal visible={open} animationType="fade" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        {open && (
          <FlatList
            data={photos}
            keyExtractor={(p) => String(p.id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.min(index ?? 0, photos.length - 1)}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
            onScroll={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
            scrollEventThrottle={64}
            renderItem={({ item }) => (
              <View style={{ width, height }}>
                <Image source={{ uri: item.url }} style={styles.image} resizeMode="contain" />
              </View>
            )}
          />
        )}

        <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Text style={styles.counter}>
            {Math.min(current + 1, photos.length)} / {photos.length}
          </Text>
          <View style={styles.topActions}>
          {shown && canReport?.(shown) && (
            <TouchableOpacity
              onPress={() => setReportTarget({ kind: 'photo', photoId: shown.id })}
              style={styles.close}
              hitSlop={10}
              accessibilityLabel="Nahlásit fotku"
            >
              <Ionicons name="flag-outline" size={20} color={colors.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={styles.close} hitSlop={10} accessibilityLabel="Zavřít fotky">
            <Ionicons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
          </View>
        </View>

        {shown && (shown.author || shown.takenAt) && (
          <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]} pointerEvents="none">
            {!!shown.author && <Text style={styles.author}>{shown.author}</Text>}
            {!!shown.takenAt && <Text style={styles.date}>{formatVisitTime(shown.takenAt)}</Text>}
          </View>
        )}
        <ReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5, 16, 26, 0.96)' },
  image: { width: '100%', height: '100%' },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topActions: { flexDirection: 'row', gap: 10 },
  counter: { color: colors.white, fontSize: 14, fontWeight: '800' },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 24 },
  author: { color: colors.white, fontSize: 15, fontWeight: '900' },
  date: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', marginTop: 2 },
});
