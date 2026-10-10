import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, ErrorBlock, InfoTip, useConfirm } from './ui';
import { deletePlaceAdminPhoto, fetchPlaceAdminPhotos, PlaceAdminPhoto, uploadPlaceAdminPhoto } from '../../services/admin';
import { getErrorMessage } from '../../services/api';
import { preparePhoto } from '../../services/photos';
import { showToast } from '../../utils/alert';
import { Place } from '../../types/place';
import { colors } from '../../utils/theme';

const HELP =
  'Fotky se v aplikaci zobrazí u místa jako první, před fotkami od návštěvníků. Hodí se hlavně pro místa, která ještě nikdo nevyfotil.';

/** Photos of a place added by the admin, without visiting it. */
export function PlacePhotosDialog({ place, onClose, onChanged }: { place: Place | null; onClose: () => void; onChanged: (count: number) => void }) {
  const [photos, setPhotos] = useState<PlaceAdminPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dialog, confirm] = useConfirm();
  const placeId = place?.id ?? null;

  const load = useCallback(async () => {
    if (placeId == null) return;
    setError(null);
    try {
      setPhotos(await fetchPlaceAdminPhotos(placeId));
    } catch (err) {
      setError(getErrorMessage(err, 'Fotky se nepodařilo načíst.'));
    }
  }, [placeId]);

  useEffect(() => {
    setPhotos(null);
    void load();
  }, [load]);

  const update = (next: PlaceAdminPhoto[]) => {
    setPhotos(next);
    onChanged(next.length);
  };

  const add = async () => {
    if (placeId == null) return;
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 1 });
    if (result.canceled) return;

    let list = photos ?? [];
    setUploading(result.assets.length);
    for (const asset of result.assets) {
      try {
        // Shrunk like visitors' photos: a photo from a camera would be several MB.
        const uploaded = await uploadPlaceAdminPhoto(placeId, await preparePhoto(asset));
        list = [...list, uploaded];
        update(list);
      } catch (err) {
        showToast('Fotku se nepodařilo nahrát', getErrorMessage(err, 'Zkuste to prosím znovu.'), 'danger');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const remove = async (photo: PlaceAdminPhoto) => {
    const ok = await confirm({
      title: 'Smazat fotku?',
      message: 'Fotka zmizí z aplikace. Tento krok nelze vrátit.',
      confirmLabel: 'Smazat',
      danger: true,
    });
    if (!ok) return;
    setDeletingId(photo.id);
    try {
      await deletePlaceAdminPhoto(photo.id);
      update((photos ?? []).filter((p) => p.id !== photo.id));
    } catch (err) {
      showToast('Fotku se nepodařilo smazat', getErrorMessage(err, 'Zkuste to prosím znovu.'), 'danger');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal visible={!!place} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          {dialog}
          <View style={styles.head}>
            <Ionicons name="images-outline" size={20} color={colors.navy} />
            <Text style={styles.title} numberOfLines={1}>
              {place?.name}
            </Text>
            <InfoTip text={HELP} />
            <Pressable onPress={onClose} hitSlop={8} style={styles.close} accessibilityLabel="Zavřít">
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.grid}>
            {error ? (
              <ErrorBlock message={error} onRetry={() => void load()} />
            ) : !photos ? (
              <ActivityIndicator style={styles.loading} color={colors.primary} />
            ) : (
              <>
                {photos.map((p) => (
                  <View key={p.id} style={styles.photo}>
                    <Image source={{ uri: p.photo_url }} style={styles.image} />
                    <Pressable
                      onPress={() => void remove(p)}
                      style={styles.delete}
                      disabled={deletingId === p.id}
                      accessibilityRole="button"
                      accessibilityLabel="Smazat fotku"
                    >
                      {deletingId === p.id ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Ionicons name="trash-outline" size={16} color={colors.white} />
                      )}
                    </Pressable>
                  </View>
                ))}
                {Array.from({ length: uploading }, (_, i) => (
                  <View key={`up-${i}`} style={[styles.photo, styles.pending]}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ))}
                <Pressable onPress={() => void add()} style={[styles.photo, styles.add]} accessibilityRole="button">
                  <Ionicons name="add" size={28} color={colors.primary} />
                  <Text style={styles.addText}>Přidat fotky</Text>
                </Pressable>
              </>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Button label="Hotovo" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5, 16, 26, 0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 640, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: 10, padding: 20, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flexShrink: 1, color: colors.navy, fontSize: 18, fontWeight: '900' },
  close: { marginLeft: 'auto', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  loading: { margin: 32 },
  photo: { width: 140, height: 105, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.background },
  image: { width: '100%', height: '100%' },
  delete: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(5, 16, 26, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pending: { alignItems: 'center', justifyContent: 'center' },
  add: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryBg,
  },
  addText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
});
