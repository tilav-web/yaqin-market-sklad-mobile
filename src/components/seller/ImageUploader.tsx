import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { extractErrorMessage, resolveMedia, uploadImage } from '@/lib/api';

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
 * resulting list of public URLs. Used for both shop photos and product photos.
 */
export function ImageUploader({ value, onChange, max = 5, size = 88, label, hint }: Props) {
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    if (value.length >= max) {
      Alert.alert('Limit', `Ko'pi bilan ${max} ta rasm qo'shish mumkin`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        // The in-app prompt was already dismissed/denied for good — asking
        // again does nothing, only Settings can re-enable it.
        Alert.alert(
          'Ruxsat kerak',
          "Galereyaga ruxsat butunlay o'chirilgan. Sozlamalardan yoqing.",
          [
            { text: 'Bekor', style: 'cancel' },
            { text: 'Sozlamalar', onPress: () => void Linking.openSettings() },
          ],
        );
      } else {
        Alert.alert('Ruxsat kerak', 'Rasm tanlash uchun galereyaga ruxsat bering');
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
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {value.map((url) => (
          <View key={url} style={[styles.thumbWrap, { width: size, height: size }]}>
            <Image source={{ uri: resolveMedia(url) }} style={styles.thumb} />
            <Pressable style={styles.removeBtn} onPress={() => remove(url)} hitSlop={8}>
              <X size={14} color={Brand.white} strokeWidth={3} />
            </Pressable>
          </View>
        ))}

        {value.length < max ? (
          <Pressable
            style={[styles.addTile, { width: size, height: size }]}
            onPress={pick}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={Brand.red} />
            ) : (
              <>
                <ImagePlus size={26} color={Brand.gray600} strokeWidth={2} />
                <Text style={styles.addText}>Rasm</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.gray800,
    marginBottom: Spacing.two,
  },
  row: {
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  thumbWrap: {
    borderRadius: Radius.md,
    overflow: 'visible',
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
    backgroundColor: Brand.gray100,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Brand.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Brand.white,
  },
  addTile: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Brand.gray200,
    borderStyle: 'dashed',
    backgroundColor: Brand.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.gray600,
  },
  hint: {
    fontSize: 12,
    color: Brand.gray400,
    marginTop: Spacing.one,
  },
});
