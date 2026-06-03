import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/ui/brand-button';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { api, extractErrorMessage } from '@/lib/api';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';

export default function SellerApplicationScreen() {
  const qc = useQueryClient();
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [stir, setStir] = useState('');
  // Photos field is a placeholder — file uploads to MinIO will be added in a follow-up
  const [photoUrl, setPhotoUrl] = useState('https://placehold.co/600x400?text=Shop');
  const coords = useEffectiveCoords();
  const refresh = useLocationStore((s) => s.refresh);

  const submit = useMutation({
    mutationFn: async () => {
      if (!coords) throw new Error('Lokatsiya yo\'q');
      const res = await api.post('/sellers/apply', {
        shopName,
        shopAddress,
        shopLatitude: coords.latitude,
        shopLongitude: coords.longitude,
        shopPhotos: [photoUrl],
        stir: stir || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-applications'] });
      Alert.alert(
        'Yuborildi!',
        'Arizangiz adminga yuborildi. Tasdiqlangach do\'koningiz yaratiladi.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const canSubmit = shopName && shopAddress && coords;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Sotuvchi bo&apos;lish</Text>
          <Text style={styles.subtitle}>
            O&apos;z mahalla do&apos;koningizni Yaqin Market platformasiga qo&apos;shing
          </Text>
        </View>

        <View style={styles.form}>
          <Field label="Do'kon nomi *">
            <TextInput
              style={styles.input}
              value={shopName}
              onChangeText={setShopName}
              placeholder="Masalan: Yaqin Mahalla Market"
              placeholderTextColor={Brand.gray400}
            />
          </Field>

          <Field label="Do'kon manzili *">
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={shopAddress}
              onChangeText={setShopAddress}
              placeholder="To'liq manzilni yozing"
              multiline
              placeholderTextColor={Brand.gray400}
            />
          </Field>

          <Field label="STIR / INN raqami (ixtiyoriy)">
            <TextInput
              style={styles.input}
              value={stir}
              onChangeText={setStir}
              placeholder="123456789"
              keyboardType="number-pad"
              placeholderTextColor={Brand.gray400}
            />
          </Field>

          <Field label="Do'kon GPS lokatsiyasi *">
            <View style={styles.gpsBox}>
              {coords ? (
                <Text style={styles.gpsText}>
                  📍 {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                </Text>
              ) : (
                <Text style={[styles.gpsText, { color: Brand.gray600 }]}>
                  Lokatsiya yuklanmoqda...
                </Text>
              )}
              <Text style={styles.gpsHint}>
                Do&apos;kon turgan joyda turib &quot;Yangilash&quot; bosing
              </Text>
              <View style={{ marginTop: 8 }}>
                <BrandButton label="Joriy lokatsiyani olish" onPress={() => refresh()} variant="ghost" />
              </View>
            </View>
          </Field>
        </View>

        <View style={styles.footer}>
          <BrandButton
            label="Arizani yuborish"
            onPress={() => submit.mutate()}
            loading={submit.isPending}
            disabled={!canSubmit}
            variant="accent"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.gray50 },
  scroll: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  header: { gap: Spacing.two, paddingTop: Spacing.four },
  title: { fontSize: 28, fontWeight: '800', color: Brand.blue },
  subtitle: { fontSize: 14, color: Brand.gray600, lineHeight: 20 },
  form: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.four },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Brand.gray800 },
  input: {
    backgroundColor: Brand.gray50,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    fontSize: 15,
    color: Brand.black,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  gpsBox: { backgroundColor: Brand.gray50, padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.gray200, gap: 4 },
  gpsText: { fontSize: 14, color: Brand.blue, fontWeight: '600' },
  gpsHint: { fontSize: 12, color: Brand.gray600 },
  footer: { marginTop: Spacing.two },
});
