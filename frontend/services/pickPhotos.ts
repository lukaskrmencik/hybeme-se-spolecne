import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { preparePhoto } from './photos';
import { LocalPhoto } from '../types/visit';
import { showToast } from '../utils/alert';

type Source = 'camera' | 'gallery';

/** On a phone the user picks the camera or the gallery; the web has only the file picker. */
function chooseSource(): Promise<Source | null> {
  if (Platform.OS === 'web') return Promise.resolve('gallery');
  return new Promise((resolve) => {
    Alert.alert(
      'Přidat fotku',
      undefined,
      [
        { text: 'Vyfotit', onPress: () => resolve('camera') },
        { text: 'Z galerie', onPress: () => resolve('gallery') },
        { text: 'Zrušit', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

/** Up to `limit` photos, already shrunk for the upload; empty when the user cancels. */
export async function pickPhotos(limit: number): Promise<LocalPhoto[]> {
  if (limit <= 0) return [];
  const source = await chooseSource();
  if (!source) return [];

  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showToast('Chybí přístup k fotoaparátu', 'Povol ho v nastavení telefonu.', 'danger');
      return [];
    }
    result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  } else {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast('Chybí přístup k fotkám', 'Povol ho v nastavení telefonu.', 'danger');
        return [];
      }
    }
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: limit > 1,
      selectionLimit: limit,
      quality: 1,
    });
  }
  if (result.canceled) return [];

  const ready: LocalPhoto[] = [];
  for (const asset of result.assets.slice(0, limit)) {
    try {
      ready.push(await preparePhoto(asset));
    } catch {
      showToast('Fotku se nepodařilo načíst', 'Zkus prosím jinou.', 'danger');
    }
  }
  return ready;
}
