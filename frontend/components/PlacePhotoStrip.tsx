import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlacePhotos } from '../hooks/usePlacePhotos';
import { PhotoViewer } from './PhotoViewer';
import { colors, radius } from '../utils/theme';

const THUMB = 64;

/** Photos other visitors took at the place, as one compact row of thumbnails. */
export function PlacePhotoStrip({ placeId }: { placeId: number }) {
  const { photos } = usePlacePhotos(placeId);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const count = photos?.length ?? 0;

  // Without photos the section takes no room at all, not even while loading or offline.
  if (count === 0) return null;

  const body = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {photos!.map((p, i) => (
        <Pressable key={p.id} onPress={() => setOpenIndex(i)} accessibilityLabel={`Fotka ${i + 1} z ${count}`}>
          <Image source={{ uri: p.url }} style={styles.thumb} />
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Ionicons name="images-outline" size={15} color={colors.muted} />
        <Text style={styles.label}>Fotky z místa</Text>
        <Text style={styles.count}>{count}</Text>
      </View>
      {body}
      <PhotoViewer photos={photos ?? []} index={openIndex} onClose={() => setOpenIndex(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  count: { marginLeft: 'auto', fontSize: 12, fontWeight: '800', color: colors.navy },
  row: { flexDirection: 'row', gap: 6 },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: colors.background },
});
