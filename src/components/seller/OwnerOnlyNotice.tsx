import { router } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

export function OwnerOnlyNotice() {
  const { tr } = useTranslation();
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg.canvas }} edges={['bottom']}>
      <View className="flex-1 items-center justify-center">
        <EmptyState
          icon={ShieldAlert}
          title={tr('access.ownerOnlyTitle')}
          description={tr('access.ownerOnlyDesc')}
          actionLabel={tr('common.back')}
          onAction={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
        />
      </View>
    </SafeAreaView>
  );
}

export function NoPermissionNotice() {
  const { tr } = useTranslation();
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg.canvas }} edges={['bottom']}>
      <View className="flex-1 items-center justify-center">
        <EmptyState
          icon={ShieldAlert}
          title={tr('access.noPermTitle')}
          description={tr('access.noPermDesc')}
          actionLabel={tr('common.back')}
          onAction={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
        />
      </View>
    </SafeAreaView>
  );
}
