import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/theme';

/** Phone (native): a tap shows the explanation under the label, in the flow, so nothing can cover it. */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} hitSlop={8} accessibilityRole="button" accessibilityLabel={text}>
        <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={16} color={colors.skyText} />
      </Pressable>
      {open && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.muted, fontSize: 12, lineHeight: 17, fontWeight: '600', maxWidth: 280, marginTop: 4 },
});
