import { Check, Moon, Smartphone, Sun } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { useTheme, type ThemeMode } from '@/stores/theme';
import { shadow, typography } from '@/theme';
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
      <Pressable className="flex-1" style={{ backgroundColor: activeColors.overlay.scrim }} onPress={onClose} />
      <SafeAreaView edges={['bottom']} className="absolute inset-x-0 bottom-0" pointerEvents="box-none">
        <View
          className="rounded-t-3xl p-4 pb-6"
          style={[{ backgroundColor: activeColors.bg.surface }, shadow.lg]}
        >
          <View
            className="w-10 h-1 rounded-full self-center mb-3"
            style={{ backgroundColor: activeColors.border.strong }}
          />
          <Text className="mb-2" style={[typography.h4, { color: activeColors.text.primary }]}>
            {tr('profile.theme')}
          </Text>
          {THEME_OPTIONS.map((opt) => {
            const active = value === opt.mode;
            const Icon = opt.icon;
            return (
              <Pressable
                key={opt.mode}
                className="flex-row items-center gap-3 py-3 px-2 rounded-xl"
                style={[active && { backgroundColor: activeColors.brand.primarySurface }]}
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
                  className="flex-1"
                  style={[
                    typography.body,
                    {
                      color: active ? activeColors.brand.primary : activeColors.text.primary,
                      fontWeight: active ? '700' : '600',
                    },
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
