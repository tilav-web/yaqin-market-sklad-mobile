import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Store } from 'lucide-react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShopCard } from '@/components/ShopCard';
import { ShopCardSkeleton } from '@/components/ShopCardSkeleton';
import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { useEffectiveCoords } from '@/stores/location';
import { colors, layout, spacing } from '@/theme';

export default function ShopsListScreen() {
  const { tr } = useTranslation();
  const coords = useEffectiveCoords();

  const shopsQuery = useQuery({
    queryKey: ['shops', 'nearby-full', coords?.latitude, coords?.longitude],
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
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={shopsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          shopsQuery.isLoading ? (
            <View>
              <ShopCardSkeleton />
              <ShopCardSkeleton />
            </View>
          ) : (
            <EmptyState icon={Store} title={tr('home.empty.title')} description={tr('home.empty.desc')} />
          )
        }
        renderItem={({ item }) => (
          <ShopCard shop={item} onPress={() => router.push(`/shop/${item.id}`)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.canvas },
  list: { padding: layout.screenPadding },
});
