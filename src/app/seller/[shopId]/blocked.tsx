import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { ShieldBan, ShieldCheck } from 'lucide-react-native';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { api, extractErrorMessage } from '@/lib/api';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface BlockedUser {
  id: string;
  name: string | null;
  phone: string;
}

export default function BlockedUsersScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();

  const blockedQuery = useQuery({
    queryKey: ['blocked', shopId],
    queryFn: async () => {
      const res = await api.get<BlockedUser[]>(`/seller/shops/${shopId}/blocked-users`);
      return res.data;
    },
  });

  const unblock = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/seller/shops/${shopId}/unblock-user`, { userId });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked', shopId] }),
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={blockedQuery.data ?? []}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          blockedQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="Bloklangan mijoz yo‘q"
              description="Buyurtma ichidan istalgan mijozni bu do‘kon uchun bloklashingiz mumkin"
            />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.icon}>
              <ShieldBan size={20} color={colors.text.danger} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name || 'Mijoz'}</Text>
              <Text style={styles.phone}>{item.phone}</Text>
            </View>
            <Pressable
              style={styles.unblockBtn}
              onPress={() =>
                Alert.alert('Blokdan chiqarish', `${item.name || item.phone} blokdan chiqarilsinmi?`, [
                  { text: 'Yo‘q', style: 'cancel' },
                  { text: 'Ha', onPress: () => unblock.mutate(item.id) },
                ])
              }>
              <Text style={styles.unblockText}>Chiqarish</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  list: { padding: layout.screenPadding, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.feedback.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.bodyStrong, color: colors.text.primary },
  phone: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  unblockBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
  },
  unblockText: { ...typography.bodySmall, fontWeight: '700', color: colors.brand.primary },
});
