import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, BadgeCheck, CircleAlert, CircleHelp, Landmark } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View , Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
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
  const { tr } = useTranslation();
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
        <Text style={styles.title}>{tr('tax.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      {profileQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <StatusRow label={tr('tax.fullName')} value={p?.fullName ?? '—'} />
            <StatusRow
              label={tr('tax.stir')}
              value={p?.stir ?? tr('tax.notSet')}
              ok={!!p?.stir}
              warnText={!p?.stir ? tr('tax.stirWarn') : undefined}
            />
            <StatusRow label={tr('tax.entityType')} value={p?.entityType ?? '—'} />
            <StatusRow
              label={tr('tax.vat')}
              value={tr(p?.vatPayer ? 'tax.vatPayer' : 'tax.vatNonPayer')}
              ok
            />
          </View>

          {/* Komissioner holati */}
          <View style={styles.card}>
            <View style={styles.komissionerHeader}>
              <Landmark size={18} color={colors.brand.primary} strokeWidth={2.2} />
              <Text style={styles.cardTitle}>{tr('tax.komissionerList')}</Text>
            </View>

            {p?.komissionerStatus === 'confirmed' ? (
              <View style={styles.statusBanner}>
                <BadgeCheck size={18} color={colors.feedback.success} strokeWidth={2.2} />
                <Text style={[styles.statusText, { color: colors.feedback.success }]}>
                  {tr('tax.confirmed')}
                </Text>
              </View>
            ) : p?.komissionerStatus === 'pending' ? (
              <View>
                <View style={styles.statusBanner}>
                  <CircleAlert size={18} color={colors.feedback.warning} strokeWidth={2.2} />
                  <Text style={[styles.statusText, { color: colors.feedback.warning }]}>
                    {tr('tax.pending')}
                  </Text>
                </View>
                <Text style={styles.steps}>
                  {tr('tax.step1')}{'\n'}
                  {tr('tax.step2')}{'\n'}
                  {tr('tax.step3')}{'\n'}
                  {tr('tax.step4')}
                </Text>
              </View>
            ) : (
              <View style={styles.statusBanner}>
                <CircleHelp size={18} color={colors.text.secondary} strokeWidth={2.2} />
                <Text style={[styles.statusText, { color: colors.text.secondary }]}>
                  {tr('tax.needStir')}
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
