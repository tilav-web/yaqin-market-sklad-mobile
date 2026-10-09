import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { tr } from '@/i18n';
import { extractErrorMessage, resolveMedia, uploadImage } from '@/lib/api';
import { colors, typography } from '@/theme';

interface Props {
  /** Current photo URLs. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Max number of images allowed (default 5). */
  max?: number;
  /** Square thumbnail size in px (default 88). */
  size?: number;
  label?: string;
  hint?: string;
}

/**
 * Pick images from the gallery, upload them to the server, and manage the
 * resulting list of public URLs.
 */
export function ImageUploader({ value, onChange, max = 5, size = 88, label, hint }: Props) {
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    if (value.length >= max) {
      Alert.alert(tr('imgUp.limitTitle'), tr('imgUp.limitBody', { n: max }));
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        Alert.alert(
          tr('imgUp.permTitle'),
          tr('imgUp.permBlocked'),
          [
            { text: 'Bekor', style: 'cancel' },
            { text: tr('imgUp.openSettings'), onPress: () => void Linking.openSettings() },
          ],
        );
      } else {
        Alert.alert(tr('imgUp.permTitle'), 'Rasm tanlash uchun galereyaga ruxsat bering');
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: max - value.length,
    });
    if (result.canceled || result.assets.length === 0) return;

    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const asset of result.assets) {
        const url = await uploadImage(asset.uri);
        uploaded.push(url);
      }
      onChange([...value, ...uploaded].slice(0, max));
    } catch (e) {
      Alert.alert(tr('common.error'), extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = (url: string) => onChange(value.filter((u) => u !== url));

  return (
    <View>
      {label ? (
        <Text className="text-sm font-bold mb-1" style={{ color: colors.text.primary }}>
          {label}
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
      >
        {value.map((url) => (
          <View key={url} className="rounded-xl overflow-visible relative" style={{ width: size, height: size }}>
            <Image
              source={{ uri: resolveMedia(url) }}
              className="w-full h-full rounded-xl"
              style={{ backgroundColor: colors.bg.surfaceMuted }}
            />
            <Pressable
              className="absolute -top-1.5 -right-1.5 w-5.5 h-5.5 rounded-full items-center justify-center border-2 border-white"
              style={{ backgroundColor: colors.feedback.danger }}
              onPress={() => remove(url)}
              hitSlop={8}
            >
              <X size={14} color="#FFFFFF" strokeWidth={3} />
            </Pressable>
          </View>
        ))}

        {value.length < max ? (
          <Pressable
            className="rounded-xl border-[1.5px] border-dashed items-center justify-center gap-0.5"
            style={{
              width: size,
              height: size,
              borderColor: colors.border.default,
              backgroundColor: colors.bg.surfaceMuted,
            }}
            onPress={pick}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.brand.primary} />
            ) : (
              <>
                <ImagePlus size={26} color={colors.text.tertiary} strokeWidth={2} />
                <Text className="text-xs font-semibold" style={{ color: colors.text.secondary }}>
                  {tr('imgUp.photo')}
                </Text>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
      {hint ? (
        <Text className="text-xs mt-1" style={[typography.caption, { color: colors.text.tertiary }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
