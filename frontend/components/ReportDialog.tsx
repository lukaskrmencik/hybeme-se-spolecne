import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportContent, ReportTarget, ReportType } from '../services/reports';
import { getErrorMessage } from '../services/api';
import { showToast } from '../utils/alert';
import { colors, radius } from '../utils/theme';

interface ReportDialogProps {
  /** What is being reported; `null` keeps the dialog closed. */
  target: ReportTarget | null;
  onClose: () => void;
}

const OPTIONS: Record<ReportType, { label: string; text: string }> = {
  visit_photo: { label: 'Nevhodná fotka', text: 'Fotka je urážlivá, nevhodná nebo nesouvisí s místem.' },
  avatar: { label: 'Nevhodná profilová fotka', text: 'Fotka je urážlivá nebo jinak nevhodná.' },
  name: { label: 'Nevhodné jméno', text: 'Jméno je vulgární, urážlivé nebo se za někoho vydává.' },
};

/** Lets anyone report a photo, a profile photo or a name to the admins. */
export function ReportDialog({ target, onClose }: ReportDialogProps) {
  const types: ReportType[] =
    target?.kind === 'photo' ? ['visit_photo'] : target?.kind === 'user' ? [...(target.hasAvatar ? ['avatar' as const] : []), 'name'] : [];
  const [type, setType] = useState<ReportType | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setType(types.length === 1 ? types[0] : null);
    setNote('');
    // Reset whenever another thing is reported.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const send = async () => {
    if (!target || !type || sending) return;
    setSending(true);
    try {
      const created = await reportContent(type, target, note);
      onClose();
      showToast(
        created ? 'Díky za nahlášení' : 'Už nahlášeno',
        created ? 'Správci se na to podívají.' : 'Tohle už máš nahlášené, správci o tom vědí.',
        created ? 'success' : 'info'
      );
    } catch (err) {
      showToast('Nahlášení se nepodařilo odeslat', getErrorMessage(err, 'Zkus to prosím znovu.'), 'danger');
    } finally {
      setSending(false);
    }
  };

  const title = target?.kind === 'user' ? `Nahlásit uživatele ${target.name}` : 'Nahlásit fotku';

  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.head}>
            <Ionicons name="flag" size={18} color={colors.danger} />
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          </View>
          <Text style={styles.lead}>Nahlášení uvidí jen správci aplikace. Nahlášený uživatel se nedozví, od koho přišlo.</Text>

          {types.map((t) => {
            const active = type === t;
            return (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[styles.option, active && styles.optionActive]}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? colors.navy : colors.inactive} />
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{OPTIONS[t].label}</Text>
                  <Text style={styles.optionHelp}>{OPTIONS[t].text}</Text>
                </View>
              </Pressable>
            );
          })}

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Chceš něco doplnit? (nepovinné)"
            placeholderTextColor={colors.inactive}
            style={styles.note}
            multiline
            maxLength={500}
          />

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.button, styles.cancel]} accessibilityRole="button">
              <Text style={styles.cancelText}>Zrušit</Text>
            </Pressable>
            <Pressable
              onPress={() => void send()}
              disabled={!type || sending}
              style={[styles.button, styles.submit, (!type || sending) && styles.disabled]}
              accessibilityRole="button"
            >
              {sending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Nahlásit</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5, 16, 26, 0.55)', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: colors.navy, fontSize: 18, fontWeight: '900' },
  lead: { color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionActive: { borderColor: colors.navy, backgroundColor: colors.navyBg },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { color: colors.navy, fontSize: 15, fontWeight: '800' },
  optionHelp: { color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  note: {
    minHeight: 64,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },
  actions: { flexDirection: 'row', gap: 8 },
  button: { flex: 1, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: colors.background },
  cancelText: { color: colors.navy, fontSize: 15, fontWeight: '800' },
  submit: { backgroundColor: colors.danger },
  submitText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  disabled: { opacity: 0.5 },
});
