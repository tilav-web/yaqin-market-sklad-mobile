import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/ui/brand-button';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { api, extractErrorMessage } from '@/lib/api';
import { Order, STATUS_LABEL_UZ } from '@/lib/types';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get<Order>(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: 10_000,
  });

  const confirmReceived = useMutation({
    mutationFn: async () => {
      const res = await api.patch<Order>(`/orders/${id}/status`, { status: 'delivered' });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const res = await api.patch<Order>(`/orders/${id}/status`, { status: 'cancelled' });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  if (orderQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Brand.blue} />
      </View>
    );
  }

  const order = orderQuery.data;
  if (!order) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerCard}>
          <Text style={styles.orderNum}>#{order.orderNumber}</Text>
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{STATUS_LABEL_UZ[order.status]}</Text>
          </View>
        </View>

        <Section title="Bosqichlar">
          {(['new', 'accepted', 'preparing', 'delivering', 'delivered'] as const).map((s) => {
            const event = order.timeline.find((e) => e.status === s);
            const active = event !== undefined;
            return (
              <View key={s} style={styles.timelineRow}>
                <View
                  style={[styles.timelineDot, active && { backgroundColor: Brand.blue, borderColor: Brand.blue }]}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.timelineLabel,
                      active && { color: Brand.black, fontWeight: '700' },
                    ]}>
                    {STATUS_LABEL_UZ[s]}
                  </Text>
                  {event && (
                    <Text style={styles.timelineTime}>
                      {new Date(event.at).toLocaleString('uz-UZ')}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </Section>

        <Section title="Mahsulotlar">
          {order.items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.productName}</Text>
                <Text style={styles.itemQty}>
                  {it.quantity} × {it.unitPrice.toLocaleString()} so&apos;m
                </Text>
              </View>
              <Text style={styles.itemTotal}>{it.lineTotal.toLocaleString()}</Text>
            </View>
          ))}
        </Section>

        <Section title="Hisob-kitob">
          <Row label="Mahsulotlar:" value={`${order.subTotal.toLocaleString()} so'm`} />
          <Row label="Yetkazib berish:" value={`${order.deliveryFee.toLocaleString()} so'm`} />
          <Row label="Masofa:" value={`${order.distanceKm.toFixed(2)} km`} />
          <View style={styles.divider} />
          <Row label="Jami:" value={`${order.total.toLocaleString()} so'm`} bold />
        </Section>

        {order.status === 'delivering' && (
          <BrandButton
            label="Buyurtmani qabul qildim"
            onPress={() => confirmReceived.mutate()}
            loading={confirmReceived.isPending}
            variant="primary"
            style={{ marginHorizontal: Spacing.four, marginTop: Spacing.four }}
          />
        )}
        {(order.status === 'new' || order.status === 'accepted') && (
          <BrandButton
            label="Bekor qilish"
            onPress={() =>
              Alert.alert('Bekor qilish', 'Buyurtmani bekor qilasizmi?', [
                { text: 'Yo\'q', style: 'cancel' },
                { text: 'Ha', style: 'destructive', onPress: () => cancel.mutate() },
              ])
            }
            loading={cancel.isPending}
            variant="ghost"
            style={{ marginHorizontal: Spacing.four, marginTop: Spacing.three }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontWeight: '700', color: Brand.black }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontWeight: '800', fontSize: 18, color: Brand.blue }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.four, gap: Spacing.four },
  headerCard: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  orderNum: { fontSize: 20, fontWeight: '800', color: Brand.blue },
  statusBox: { backgroundColor: Brand.blue, paddingHorizontal: Spacing.four, paddingVertical: 6, borderRadius: Radius.full },
  statusText: { color: Brand.white, fontWeight: '700', fontSize: 13 },
  section: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.two },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Brand.gray600, textTransform: 'uppercase' },
  timelineRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center', paddingVertical: 6 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: Brand.gray200, backgroundColor: Brand.white },
  timelineLabel: { fontSize: 14, color: Brand.gray600 },
  timelineTime: { fontSize: 12, color: Brand.gray600, marginTop: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  itemName: { fontSize: 14, fontWeight: '600', color: Brand.black },
  itemQty: { fontSize: 12, color: Brand.gray600, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: Brand.blue },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 14, color: Brand.gray600 },
  rowValue: { fontSize: 14, fontWeight: '600', color: Brand.black },
  divider: { height: 1, backgroundColor: Brand.gray100, marginVertical: 4 },
});
