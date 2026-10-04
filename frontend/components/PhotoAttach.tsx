import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { discardLocalPhoto, MAX_PHOTOS_PER_VISIT, preparePhoto } from '../services/photos';
import { LocalPhoto } from '../types/visit';
import { showToast } from '../utils/alert';
import { colors, radius } from '../utils/theme';

const THUMB = 64;
const canUseCamera = Platform.OS !== 'web';

interface PhotoAttachProps {
  photos: LocalPhoto[];
  onChange: (photos: LocalPhoto[]) => void;
  disabled?: boolean;
}

/** Photos the user adds to the visit: straight from the camera on a phone, or from the gallery. */
export function PhotoAttach({ photos, onChange, disabled }: PhotoAttachProps) {
  const [preparing, setPreparing] = useState(0);
  const room = MAX_PHOTOS_PER_VISIT - photos.length - preparing;

  const addAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const picked = assets.slice(0, Math.max(0, room));
    if (picked.length === 0) return;
    setPreparing((n) => n + picked.length);
    const ready: LocalPhoto[] = [];
    for (const asset of picked) {
      try {
        ready.push(await preparePhoto(asset));
      } catch {
        showToast('Fotku se nepodařilo načíst', 'Zkus prosím jinou.', 'danger');
      } finally {
        setPreparing((n) => n - 1);
      }
    }
    if (ready.length) onChange([...photos, ...ready]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showToast('Chybí přístup k fotoaparátu', 'Povol ho v nastavení telefonu.', 'danger');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) await addAssets(result.assets);
  };

  const pickFromGallery = async () => {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast('Chybí přístup k fotkám', 'Povol ho v nastavení telefonu.', 'danger');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, room),
      quality: 1,
    });
    if (!result.canceled) await addAssets(result.assets);
  };

  const remove = (photo: LocalPhoto) => {
    discardLocalPhoto(photo);
    onChange(photos.filter((p) => p !== photo));
  };

  const full = room <= 0;
  const busy = disabled || full;

  return (
    <View style={styles.wrap}>
      <View style={styles.buttons}>
        {canUseCamera && (
          <TouchableOpacity
            style={[styles.add, busy && styles.addDisabled]}
            onPress={() => void takePhoto()}
            disabled={busy}
            accessibilityRole="button"
          >
            <Ionicons name="camera-outline" size={20} color={colors.primary} />
            <Text style={styles.addText}>Vyfotit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.add, busy && styles.addDisabled]}
          onPress={() => void pickFromGallery()}
          disabled={busy}
          accessibilityRole="button"
        >
          <Ionicons name="images-outline" size={20} color={colors.primary} />
          <Text style={styles.addText}>{canUseCamera ? 'Z galerie' : 'Přidat fotky'}</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>
          {photos.length}/{MAX_PHOTOS_PER_VISIT}
        </Text>
      </View>

      {photos.length + preparing > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
          {photos.map((p, i) => (
            <View key={p.uri}>
              <Image source={{ uri: p.uri }} style={styles.thumb} />
              <TouchableOpacity
                style={styles.remove}
                onPress={() => remove(p)}
                hitSlop={8}
                accessibilityLabel={`Odebrat fotku ${i + 1}`}
              >
                <Ionicons name="close" size={12} color={colors.white} />
              </TouchableOpacity>
            </View>
          ))}
          {Array.from({ length: preparing }, (_, i) => (
            <View key={`prep-${i}`} style={[styles.thumb, styles.preparing]}>
              <ActivityIndicator size="small" color={colors.inactive} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  add: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
  },
  addDisabled: { opacity: 0.45 },
  addText: { fontSize: 14, fontWeight: '800', color: colors.primary },
  counter: { minWidth: 30, textAlign: 'right', fontSize: 12, fontWeight: '800', color: colors.muted },
  // Room on top and right for the remove badge, which sticks out of the thumbnail.
  thumbs: { gap: 10, paddingTop: 6, paddingRight: 6 },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: colors.background },
  preparing: { alignItems: 'center', justifyContent: 'center' },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.navy,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
