import { Check, Globe } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation, type Lang } from '@/i18n';
import { colors, shadow, typography } from '@/theme';
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
      <Pressable className="flex-1" style={{ backgroundColor: colors.overlay.scrim }} onPress={onClose} />
      <SafeAreaView edges={['bottom']} className="absolute inset-x-0 bottom-0" pointerEvents="box-none">
        <View
          className="rounded-t-3xl p-4 pb-6"
          style={[{ backgroundColor: colors.bg.surface }, shadow.lg]}
        >
          <View
            className="w-10 h-1 rounded-full self-center mb-3"
            style={{ backgroundColor: colors.border.strong }}
          />
          <Text className="mb-2" style={[typography.h4, { color: colors.text.primary }]}>
            {tr('profile.language')}
          </Text>
          {LANGS.map((l) => {
            const active = value === l;
            return (
              <Pressable
                key={l}
                className="flex-row items-center gap-3 py-3 px-2 rounded-xl"
                style={[active && { backgroundColor: colors.brand.primarySurface }]}
                onPress={() => {
                  haptics.selection();
                  onSelect(l);
                  onClose();
                }}>
                <Globe size={18} color={active ? colors.brand.primary : colors.text.tertiary} strokeWidth={2.2} />
                <Text
                  className="flex-1"
                  style={[
                    typography.body,
                    {
                      color: active ? colors.brand.primary : colors.text.primary,
                      fontWeight: active ? '700' : '600',
                    },
                  ]}>
                  {LANG_LABELS[l]}
                </Text>
                {active && <Check size={18} color={colors.brand.primary} strokeWidth={2.6} />}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
