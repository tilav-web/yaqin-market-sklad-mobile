import { Check, Moon, Smartphone, Sun } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { useTheme, type ThemeMode } from '@/stores/theme';
import { layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

export const THEME_OPTIONS: {
  mode: ThemeMode;
  labelKey: 'theme.light' | 'theme.dark' | 'theme.system';
  icon: typeof Sun;
}[] = [
  { mode: 'light', labelKey: 'theme.light', icon: Sun },
  { mode: 'dark', labelKey: 'theme.dark', icon: Moon },
  { mode: 'system', labelKey: 'theme.system', icon: Smartphone },
];

interface Props {
  readonly visible: boolean;
  readonly value: ThemeMode;
  readonly onSelect: (mode: ThemeMode) => void;
  readonly onClose: () => void;
}

/** Single-choice theme sheet — identical pattern to LanguagePickerSheet. */
export function ThemePickerSheet({ visible, value, onSelect, onClose }: Props) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: activeColors.overlay.scrim }]} onPress={onClose} />
      <SafeAreaView edges={['bottom']} style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: activeColors.bg.surface }]}>
          <View style={[styles.handle, { backgroundColor: activeColors.border.strong }]} />
          <Text style={[styles.title, { color: activeColors.text.primary }]}>{tr('profile.theme')}</Text>
          {THEME_OPTIONS.map((opt) => {
            const active = value === opt.mode;
            const Icon = opt.icon;
            return (
              <Pressable
                key={opt.mode}
                style={[styles.row, active && { backgroundColor: activeColors.brand.primarySurface }]}
                onPress={() => {
                  haptics.selection();
                  onSelect(opt.mode);
                  onClose();
                }}>
                <Icon
                  size={19}
                  color={active ? activeColors.brand.primary : activeColors.text.tertiary}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.rowText,
                    { color: active ? activeColors.brand.primary : activeColors.text.primary },
                    active && styles.rowTextActive,
                  ]}>
                  {tr(opt.labelKey)}
                </Text>
                {active && <Check size={18} color={activeColors.brand.primary} strokeWidth={2.6} />}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  card: {
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
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h4, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  rowText: { ...typography.body, flex: 1, fontWeight: '600' },
  rowTextActive: { fontWeight: '700' },
});
