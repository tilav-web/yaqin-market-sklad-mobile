import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { BrandButton } from '@/components/ui/brand-button';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { api, extractErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function SellerApplicationScreen() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const nameParts = (user?.name ?? '').trim().split(/\s+/);
  const [firstName, setFirstName] = useState(nameParts[0] ?? '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') ?? '');
  const [contactPhone, setContactPhone] = useState('');
  const [note, setNote] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      const res = await api.post('/sellers/apply', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        contactPhone: contactPhone.trim() || undefined,
        note: note.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-applications'] });
      Alert.alert(
        'Yuborildi!',
        'Arizangiz adminga yuborildi. Ko\'rib chiqilgach seller sifatida tasdiqlanasiz.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const canSubmit = firstName.trim() && lastName.trim();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Sotuvchi bo&apos;lish</Text>
          <Text style={styles.subtitle}>
            Ariza yuboring — admin ko&apos;rib chiqib, seller huquqini beradi.
          </Text>
        </View>

        <View style={styles.form}>
          <Field label="Ism *">
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Masalan: Jasur"
              placeholderTextColor={Brand.gray400}
            />
          </Field>

          <Field label="Familya *">
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Masalan: Karimov"
              placeholderTextColor={Brand.gray400}
            />
          </Field>

          <Field label="Qo'shimcha telefon (ixtiyoriy)">
            <TextInput
              style={styles.input}
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="+998 90 000 00 00"
              keyboardType="phone-pad"
              placeholderTextColor={Brand.gray400}
            />
          </Field>

          <Field label="Qisqacha izoh (ixtiyoriy)">
            <TextInput
              style={[styles.input, { height: 90 }]}
              value={note}
              onChangeText={setNote}
              placeholder="O'zingiz haqingizda qisqacha yozing"
              multiline
              placeholderTextColor={Brand.gray400}
            />
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
  footer: { marginTop: Spacing.two },
});
