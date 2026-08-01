import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [stir, setStir] = useState('');
  const [entityType, setEntityType] = useState('');
  const [note, setNote] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      const res = await api.post('/sellers/apply', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        contactPhone: contactPhone.trim() || undefined,
        stir: stir.trim() || undefined,
        entityType: entityType || undefined,
        note: note.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-applications'] });
      Alert.alert(
        tr('sellerApp.sentTitle'),
        tr('sellerApp.sentBody'),
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
          <Text style={styles.title}>{tr('sellerApp.title')}</Text>
          <Text style={styles.subtitle}>{tr('sellerApp.subtitle')}</Text>
        </View>

        <View style={styles.form}>
          <Field label={tr('sellerApp.firstName')}>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={tr('sellerApp.firstNamePh')}
              placeholderTextColor={Brand.gray400}
            />
          </Field>

          <Field label={tr('sellerApp.lastName')}>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder={tr('sellerApp.lastNamePh')}
              placeholderTextColor={Brand.gray400}
            />
          </Field>

          <Field label={tr('sellerApp.contactPhone')}>
            <TextInput
              style={styles.input}
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="+998 90 000 00 00"
              keyboardType="phone-pad"
              placeholderTextColor={Brand.gray400}
            />
          </Field>

          <Field label={tr('sellerApp.entityType')}>
            <View style={styles.chipRow}>
              {/* value serverga o'zbekcha ketadi (admin shu qiymatni ko'radi), label joriy tilda */}
              {[
                { value: 'YaTT', label: 'YaTT' },
                { value: 'MChJ', label: 'MChJ' },
                { value: 'Boshqa', label: tr('sellerApp.entityOther') },
              ].map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setEntityType(entityType === t.value ? '' : t.value)}
                  style={[styles.chip, entityType === t.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, entityType === t.value && styles.chipTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label={tr('sellerApp.stirOptional')}>
            <TextInput
              style={styles.input}
              value={stir}
              onChangeText={(v) => setStir(v.replace(/\D/g, ''))}
              placeholder="123456789"
              keyboardType="number-pad"
              maxLength={9}
              placeholderTextColor={Brand.gray400}
            />
            <Text style={styles.fieldHint}>{tr('sellerApp.stirHint')}</Text>
          </Field>

          <Field label={tr('sellerApp.note')}>
            <TextInput
              style={[styles.input, { height: 90 }]}
              value={note}
              onChangeText={setNote}
              placeholder={tr('sellerApp.notePh')}
              multiline
              placeholderTextColor={Brand.gray400}
            />
          </Field>
        </View>

        <View style={styles.footer}>
          <BrandButton
            label={tr('sellerApp.submit')}
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
  fieldHint: { fontSize: 12, color: Brand.gray600, lineHeight: 16 },
  chipRow: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Brand.gray50,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  chipActive: { backgroundColor: Brand.blue, borderColor: Brand.blue },
  chipText: { fontSize: 14, fontWeight: '600', color: Brand.gray800 },
  chipTextActive: { color: Brand.white },
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
