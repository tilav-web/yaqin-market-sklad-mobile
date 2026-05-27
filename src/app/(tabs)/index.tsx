import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { MapPin, Store } from 'lucide-react-native';
import { useEffect } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationHeader } from '@/components/LocationHeader';
import { ShopCard } from '@/components/ShopCard';
import { ShopCardSkeleton } from '@/components/ShopCardSkeleton';
import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, layout, spacing, typography } from '@/theme';

export default function HomeScreen() {
  const { tr } = useTranslation();
  const coords = useEffectiveCoords();
  const requestPermission = useLocationStore((s) => s.requestPermission);
  const refresh = useLocationStore((s) => s.refresh);
  const permissionStatus = useLocationStore((s) => s.permissionStatus);

  useEffect(() => {
    if (!permissionStatus) {
      void requestPermission().then(() => refresh());
    } else if (permissionStatus === 'granted' && !coords) {
      void refresh();
    }
  }, [permissionStatus, coords, requestPermission, refresh]);

  const shopsQuery = useQuery({
    queryKey: ['shops', 'nearby', coords?.latitude, coords?.longitude],
    queryFn: async () => {
      if (!coords) return [];
      const res = await api.get<PublicShop[]>('/shops/nearby', {
        params: { lat: coords.latitude, lng: coords.longitude },
      });
      return res.data;
    },
    enabled: !!coords,
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {!coords ? (
        <View style={styles.locPrompt}>
          <EmptyState
            icon={MapPin}
            title={tr('home.locationLoading')}
            description="Yaqin do'konlarni topish uchun lokatsiyangiz kerak"
            actionLabel={tr('home.locationRetry')}
            onAction={() => void refresh()}
          />
        </View>
      ) : (
        <FlatList
          data={shopsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={shopsQuery.isFetching && !shopsQuery.isLoading}
              onRefresh={() => {
                void refresh();
                void shopsQuery.refetch();
              }}
              tintColor={colors.brand.primary}
              colors={[colors.brand.primary]}
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <LocationHeader />
              <View style={styles.titleBlock}>
                <Text style={styles.title}>{tr('home.nearbyShops')}</Text>
                <Text style={styles.subtitle}>
                  {tr('home.shopsCount', { n: shopsQuery.data?.length ?? 0 })}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            shopsQuery.isLoading ? (
              <View>
                <ShopCardSkeleton />
                <ShopCardSkeleton />
                <ShopCardSkeleton />
              </View>
            ) : (
              <EmptyState
                icon={Store}
                title={tr('home.empty.title')}
                description={tr('home.empty.desc')}
              />
            )
          }
          renderItem={({ item }) => (
            <ShopCard
              shop={item}
              onPress={() => router.push(`/shop/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.canvas },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
  },
  header: { gap: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  titleBlock: { gap: 2 },
  title: { ...typography.h1, color: colors.text.primary },
  subtitle: { ...typography.bodySmall, color: colors.text.secondary },
  locPrompt: { flex: 1, justifyContent: 'center' },
});
