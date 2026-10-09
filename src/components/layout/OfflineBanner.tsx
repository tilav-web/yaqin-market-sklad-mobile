import { WifiOff, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

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
    <View style={styles.banner}>
      <WifiOff size={14} color="#EF4444" strokeWidth={2.4} />
      <Text style={styles.text} numberOfLines={1}>
        Internet aloqasi yo&apos;q
      </Text>
      <Pressable
        onPress={handleRetry}
        style={styles.retryBtn}
        hitSlop={6}
        disabled={retrying}>
        {retrying ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.retryText}>{tr('common.retry')}</Text>
        )}
      </Pressable>
      <Pressable onPress={() => setDismissed(true)} hitSlop={8} style={styles.closeBtn}>
        <X size={14} color="#9CA3AF" strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  retryBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 2,
    marginLeft: 2,
  },
});
