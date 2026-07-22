import { Check, Globe } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation, type Lang } from '@/i18n';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

export const LANG_LABELS: Record<Lang, string> = {
  uz: "O'zbekcha",
  uz_cyrl: 'Ўзбекча',
  ru: 'Русский',
};

const LANGS: Lang[] = ['uz', 'uz_cyrl', 'ru'];

interface Props {
  readonly visible: boolean;
  readonly value: Lang;
  readonly onSelect: (lang: Lang) => void;
  readonly onClose: () => void;
}

/** Single-choice language sheet — the profile row shows the current pick and opens this. */
export function LanguagePickerSheet({ visible, value, onSelect, onClose }: Props) {
  const { tr } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView edges={['bottom']} style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.card}>
          <View style={styles.handle} />
          <Text style={styles.title}>{tr('profile.language')}</Text>
          {LANGS.map((l) => {
            const active = value === l;
            return (
              <Pressable
                key={l}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => {
                  haptics.selection();
                  onSelect(l);
                  onClose();
                }}>
                <Globe size={18} color={active ? colors.brand.primary : colors.text.tertiary} strokeWidth={2.2} />
                <Text style={[styles.rowText, active && styles.rowTextActive]}>{LANG_LABELS[l]}</Text>
                {active && <Check size={18} color={colors.brand.primary} strokeWidth={2.6} />}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay.scrim },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  card: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: layout.screenPadding,
    paddingBottom: spacing.xl,
    ...shadow.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.strong,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h4, color: colors.text.primary, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  rowActive: { backgroundColor: colors.brand.primarySurface },
  rowText: { ...typography.body, color: colors.text.primary, flex: 1, fontWeight: '600' },
  rowTextActive: { color: colors.brand.primary, fontWeight: '700' },
});
