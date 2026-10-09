import { WifiOff, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { colors } from '@/theme';

export function OfflineBanner() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const { tr } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  if (dismissed) return null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await hydrate();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View className="flex-row items-center gap-2.5 bg-slate-800 rounded-2xl px-3.5 py-2.5 border border-brand-primary/40 w-full shadow-xl">
      <View className="w-8 h-8 rounded-full bg-brand-primary/15 items-center justify-center">
        <WifiOff size={15} color={colors.brand.primary} strokeWidth={2.4} />
      </View>
      <View className="flex-1">
        <Text className="text-white text-xs font-bold leading-4">Internet aloqasi yo'q</Text>
        <Text className="text-slate-400 text-[11px] leading-3.5">{tr('common.error.desc')}</Text>
      </View>
      <Pressable
        onPress={handleRetry}
        className="bg-brand-primary px-3 py-1.5 rounded-full items-center justify-center active:opacity-80"
        hitSlop={6}
        disabled={retrying}>
        {retrying ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text className="text-white text-xs font-bold">{tr('common.retry')}</Text>
        )}
      </Pressable>
      <Pressable onPress={() => setDismissed(true)} hitSlop={8} className="p-1">
        <X size={15} color="#9CA3AF" strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}
