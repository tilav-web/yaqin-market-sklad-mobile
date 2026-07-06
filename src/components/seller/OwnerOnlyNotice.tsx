import { router } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { colors } from '@/theme';

/**
 * Shown instead of an owner-only screen's content when the current user is
 * shop staff, not the owner. These actions 403 server-side regardless (staff
 * management, shop settings, balance, stats, promotions, permanent delete,
 * blocking a customer) — this avoids making the failing call at all and
 * explains why, instead of a raw error.
 */
export function OwnerOnlyNotice() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.center}>
        <EmptyState
          icon={ShieldAlert}
          title="Faqat do'kon egasi uchun"
          description="Bu bo'lim faqat do'kon egasiga ochiq. Sizga kerakli ruxsat yo'q."
          actionLabel="Orqaga"
          onAction={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
        />
      </View>
    </SafeAreaView>
  );
}

/**
 * Same shell as `OwnerOnlyNotice`, but for screens a staff member COULD reach
 * if they held the right `StaffPermission` (e.g. `reviews.view`,
 * `promotions.view`) — as opposed to the truly owner-only screens above that
 * have no permission flag at all. Shown once `useShopAccess(...).isResolved`
 * confirms the current user is neither the owner nor holds that permission.
 */
export function NoPermissionNotice() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.center}>
        <EmptyState
          icon={ShieldAlert}
          title="Ruxsat yo'q"
          description="Bu bo'lim uchun sizda kerakli ruxsat yo'q. Do'kon egasidan so'rang."
          actionLabel="Orqaga"
          onAction={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
