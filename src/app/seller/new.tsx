import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { MapPin, Store } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { LocationPickerModal, PickedLocation } from '@/components/LocationPickerModal';
import { ImageUploader } from '@/components/seller/ImageUploader';
import { api, extractErrorMessage } from '@/lib/api';
import { useEffectiveCoords } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

export default function NewShopScreen() {
  const qc = useQueryClient();
  const coords = useEffectiveCoords();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const point = picked ?? coords;

  const create = useMutation({
    mutationFn: async () => {
      if (!point) throw new Error('Do‘kon joylashuvini tanlang');
      const res = await api.post<{ id: string }>('/seller/shops', {
        name: name.trim(),
        address: address.trim(),
        latitude: point.latitude,
        longitude: point.longitude,
        description: description.trim() || undefined,
        photos,
      });
      return res.data;
    },
    onSuccess: (shop) => {
      qc.invalidateQueries({ queryKey: ['shops', 'mine'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      router.replace(`/seller/${shop.id}/orders`);
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const onPick = (result: PickedLocation) => {
    setPicked(result);
    if (result.address) setAddress(result.address);
    setPickerVisible(false);
  };

  const canSave = !!name.trim() && !!address.trim() && !!point;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Store size={28} color={colors.brand.primary} strokeWidth={2} />
          </View>
          <Text style={styles.heroTitle}>Yangi do‘kon ochish</Text>
          <Text style={styles.heroDesc}>
            Do‘kon yaratganingizdan so‘ng darhol mahsulot qo‘shish, xodim biriktirish va buyurtmalarni
            qabul qilishni boshlaysiz.
          </Text>
        </View>

        <Field label="Do‘kon nomi">
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Masalan: Bahor Supermarket"
            placeholderTextColor={colors.text.hint}
            maxLength={128}
          />
        </Field>

        <Field label="Manzil">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={address}
            onChangeText={setAddress}
            placeholder="To‘liq manzil (xaritadan tanlasangiz to‘ladi)"
            placeholderTextColor={colors.text.hint}
            multiline
          />
        </Field>

        <Pressable style={styles.mapBtn} onPress={() => setPickerVisible(true)}>
          <MapPin size={18} color={colors.brand.primary} strokeWidth={2.4} />
          <Text style={styles.mapBtnText}>
            {point ? 'Joylashuvni xaritadan o‘zgartirish' : 'Joylashuvni xaritadan belgilash'}
          </Text>
        </Pressable>
        {point ? (
          <Text style={styles.coordHint}>
            📍 {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
          </Text>
        ) : null}

        <Field label="Tavsif (ixtiyoriy)">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Do‘kon haqida qisqacha"
            placeholderTextColor={colors.text.hint}
            multiline
          />
        </Field>

        <ImageUploader
          label="Do‘kon rasmlari (ixtiyoriy)"
          hint="Birinchi rasm do‘kon muqovasi bo‘ladi"
          value={photos}
          onChange={setPhotos}
          max={5}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          disabled={!canSave || create.isPending}
          onPress={() => create.mutate()}>
          <Text style={styles.saveText}>{create.isPending ? 'Yaratilmoqda…' : 'Do‘kon ochish'}</Text>
        </Pressable>
      </View>

      <LocationPickerModal
        visible={pickerVisible}
        initial={point}
        onCancel={() => setPickerVisible(false)}
        onConfirm={onPick}
      />
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['3xl'] },
  hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heroTitle: { ...typography.h3, color: colors.text.primary },
  heroDesc: { ...typography.bodySmall, color: colors.text.secondary, textAlign: 'center' },
  field: { gap: spacing.xs },
  label: { ...typography.bodySmall, fontWeight: '700', color: colors.text.primary },
  input: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    backgroundColor: colors.brand.primarySurface,
  },
  mapBtnText: { ...typography.body, fontWeight: '700', color: colors.brand.primary },
  coordHint: { ...typography.caption, color: colors.text.tertiary },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  saveBtn: {
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.border.strong },
  saveText: { ...typography.body, fontWeight: '700', color: colors.text.onPrimary },
});
