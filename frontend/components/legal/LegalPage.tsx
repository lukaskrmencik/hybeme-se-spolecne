import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LEGAL } from '../../constants/legal';
import { colors, radius } from '../../utils/theme';

const logo = require('../../assets/images/logos/logo_hss_mark.png');

/** A paragraph, or a bulleted list. */
export type LegalBlock = string | { list: string[] };

export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

/** Highlights the parts the school still has to fill in ([DOPLNIT …]). */
function RichText({ text, style }: { text: string; style: object }) {
  const parts = text.split(/(\[DOPLNIT[^\]]*\])/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.startsWith('[DOPLNIT') ? (
          <Text key={i} style={styles.placeholder}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

export function LegalPage({
  title,
  summary,
  sections,
  other,
}: {
  title: string;
  summary: string[];
  sections: LegalSection[];
  /** Link to the other legal page. */
  other: { href: '/soukromi' | '/podminky'; label: string };
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={back} style={styles.back} accessibilityRole="button" accessibilityLabel="Zpět">
          <Ionicons name="arrow-back" size={20} color={colors.white} />
        </Pressable>
        <Image source={logo} style={styles.logo} />
        <Text style={styles.brand}>Hýbeme se společně</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <Text role="heading" aria-level={1} style={styles.title}>
            {title}
          </Text>
          <Text style={styles.meta}>Platné od {LEGAL.effectiveFrom}</Text>

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Ve zkratce</Text>
            {summary.map((line) => (
              <View key={line} style={styles.bullet}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                <RichText text={line} style={styles.summaryText} />
              </View>
            ))}
          </View>

          {sections.map((section, i) => (
            <View key={section.title} style={styles.section}>
              <Text role="heading" aria-level={2} style={styles.sectionTitle}>
                {i + 1}. {section.title}
              </Text>
              {section.blocks.map((block, j) =>
                typeof block === 'string' ? (
                  <RichText key={j} text={block} style={styles.paragraph} />
                ) : (
                  <View key={j} style={styles.list}>
                    {block.list.map((item) => (
                      <View key={item} style={styles.listItem}>
                        <Text style={styles.dot}>•</Text>
                        <RichText text={item} style={styles.paragraph} />
                      </View>
                    ))}
                  </View>
                )
              )}
            </View>
          ))}

          <Pressable onPress={() => router.replace(other.href)} style={styles.other} accessibilityRole="link">
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={styles.otherText}>{other.label}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  logo: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.white },
  brand: { color: colors.white, fontSize: 16, fontWeight: '900' },
  content: { padding: 20, paddingBottom: 48 },
  inner: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 16 },
  title: { color: colors.navy, fontSize: 26, fontWeight: '900', lineHeight: 32 },
  meta: { color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: -10 },
  summary: { backgroundColor: colors.primaryBg, borderRadius: radius.md, padding: 16, gap: 8 },
  summaryTitle: { color: colors.primary, fontSize: 13, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  bullet: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  summaryText: { flex: 1, color: colors.navy, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  section: { gap: 8 },
  sectionTitle: { color: colors.navy, fontSize: 18, fontWeight: '900', marginTop: 4 },
  paragraph: { flex: 1, color: colors.navy, fontSize: 15, lineHeight: 22, fontWeight: '500' },
  list: { gap: 4 },
  listItem: { flexDirection: 'row', gap: 8 },
  dot: { color: colors.primary, fontSize: 15, lineHeight: 22, fontWeight: '900' },
  placeholder: { backgroundColor: '#FFF3B0', color: '#7A5A00', fontWeight: '800' },
  other: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingVertical: 8 },
  otherText: { color: colors.primary, fontSize: 15, fontWeight: '800', textDecorationLine: 'underline' },
});
