import { Image, Linking, Platform, Pressable } from 'react-native';

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=cz.hybemesespolecne.app';

const BADGE = '/images/google-play-badge.png';
const RATIO = 646 / 250;

export function PlayBadge({ height = 56 }: { height?: number }) {
  const width = Math.round(height * RATIO);
  if (Platform.OS !== 'web') {
    return (
      <Pressable onPress={() => void Linking.openURL(PLAY_STORE_URL)} accessibilityRole="link" accessibilityLabel="Stáhnout z Google Play">
        <Image source={{ uri: BADGE }} style={{ width, height }} />
      </Pressable>
    );
  }
  return (
    <a href={PLAY_STORE_URL} target="_blank" rel="noopener" style={{ display: 'inline-flex' }}>
      <img src={BADGE} alt="Stáhnout z Google Play" width={width} height={height} style={{ width, height, display: 'block' }} />
    </a>
  );
}
