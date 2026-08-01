import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, BadgeCheck, CircleAlert, CircleHelp, Landmark } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface MySellerProfile {
  fullName: string | null;
  stir: string | null;
  entityType: string | null;
  vatPayer: boolean;
  komissionerStatus: 'none' | 'pending' | 'confirmed';
  komissionerConfirmedAt: string | null;
  verifiedAt: string | null;
}

/**
 * Sellerning soliq holati: STIR, yuridik shakl, QQS va komissioner
 * ro'yxati. Komissioner modeli: platforma sotuvchi nomidan fiskal chek
 * chiqaradi — buning uchun seller my.soliq.uz kabinetida platformani
 * "vositachi" sifatida qo'shishi shart.
 */
export default function SellerTaxStatusScreen() {
  const profileQ = useQuery({
    queryKey: ['my-seller-profile'],
    queryFn: async () => (await api.get<MySellerProfile | null>('/sellers/my-profile')).data,
  });

  const p = profileQ.data;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text.primary} strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.title}>Soliq ma'lumotlari</Text>
        <View style={{ width: 22 }} />
      </View>

      {profileQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <StatusRow label="F.I.O. / Tashkilot" value={p?.fullName ?? '—'} />
            <StatusRow
              label="STIR / INN"
              value={p?.stir ?? 'Kiritilmagan'}
              ok={!!p?.stir}
              warnText={!p?.stir ? 'STIRsiz sotuvlaringizga chek chiqarib bo\'lmaydi' : undefined}
            />
            <StatusRow label="Yuridik shakl" value={p?.entityType ?? '—'} />
            <StatusRow
              label="QQS"
              value={p?.vatPayer ? "To'lovchi (cheklar QQS bilan)" : "To'lovchi emas"}
              ok
            />
          </View>

          {/* Komissioner holati */}
          <View style={styles.card}>
            <View style={styles.komissionerHeader}>
              <Landmark size={18} color={colors.brand.primary} strokeWidth={2.2} />
              <Text style={styles.cardTitle}>Komissioner ro'yxati (my.soliq.uz)</Text>
            </View>

            {p?.komissionerStatus === 'confirmed' ? (
              <View style={styles.statusBanner}>
                <BadgeCheck size={18} color={colors.feedback.success} strokeWidth={2.2} />
                <Text style={[styles.statusText, { color: colors.feedback.success }]}>
                  Tasdiqlangan — sotuvlaringizga cheklar sizning STIRingiz bilan chiqadi va soliq
                  hisobotingizda avtomatik aks etadi.
                </Text>
              </View>
            ) : p?.komissionerStatus === 'pending' ? (
              <View>
                <View style={styles.statusBanner}>
                  <CircleAlert size={18} color={colors.feedback.warning} strokeWidth={2.2} />
                  <Text style={[styles.statusText, { color: colors.feedback.warning }]}>
                    Kutilmoqda — quyidagi qadamni bajaring, so'ng admin tasdiqlaydi.
                  </Text>
                </View>
                <Text style={styles.steps}>
                  1. my.soliq.uz shaxsiy kabinetingizga kiring{'\n'}
                  2. "Vositachilar / komissionerlar" bo'limini oching{'\n'}
                  3. Yaqin Market platformasini (STIRi admin tomonidan beriladi) komissioner
                  sifatida qo'shing{'\n'}
                  4. Bo'ldi — admin tekshirib tasdiqlaydi
                </Text>
              </View>
            ) : (
              <View style={styles.statusBanner}>
                <CircleHelp size={18} color={colors.text.secondary} strokeWidth={2.2} />
                <Text style={[styles.statusText, { color: colors.text.secondary }]}>
                  Avval STIR kiritilishi kerak — admin bilan bog'laning yoki profil
                  ma'lumotlaringizni yangilatib oling.
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.footnote}>
            Nega kerak? Qonun bo'yicha har bir sotuvga fiskal chek chiqishi shart. Yaqin Market
            komissioner (vositachi) sifatida chekni SIZNING nomingizdan chiqaradi — buning uchun
            yuqoridagi ro'yxatdan o'tish talab qilinadi. Ma'lumotlarni o'zgartirish uchun
            admin bilan bog'laning.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatusRow({
  label,
  value,
  ok,
  warnText,
}: {
  label: string;
  value: string;
  ok?: boolean;
  warnText?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {ok === true ? (
            <BadgeCheck size={14} color={colors.feedback.success} strokeWidth={2.4} />
          ) : ok === false ? (
            <CircleAlert size={14} color={colors.feedback.warning} strokeWidth={2.4} />
          ) : null}
          <Text style={styles.rowValue}>{value}</Text>
        </View>
        {warnText ? <Text style={styles.rowWarn}>{warnText}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  backBtn: { padding: 2 },
  title: { ...typography.h3, color: colors.text.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['3xl'] },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: { ...typography.subtitle, color: colors.text.primary },
  komissionerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowLabel: { ...typography.body, color: colors.text.secondary },
  rowValue: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  rowWarn: { ...typography.caption, color: colors.feedback.warning, marginTop: 2, textAlign: 'right' },
  statusBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  statusText: { ...typography.body, flex: 1, lineHeight: 20 },
  steps: { ...typography.body, color: colors.text.primary, marginTop: spacing.md, lineHeight: 22 },
  footnote: { ...typography.caption, color: colors.text.secondary, lineHeight: 18 },
});
