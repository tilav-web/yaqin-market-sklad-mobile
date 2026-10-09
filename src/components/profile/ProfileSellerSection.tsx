import { router } from 'expo-router';
import { Clock, Plus, Store, XCircle } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { MyShop } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';
import { ProfileMenuRow, ProfileMenuSection } from './ProfileMenuRow';
import { SellerApplication } from './types';

interface ProfileSellerSectionProps {
  myShops: MyShop[];
  latestApp: SellerApplication | undefined;
  onOpenApplication: () => void;
}

export function ProfileSellerSection({
  myShops,
  latestApp,
  onOpenApplication,
}: ProfileSellerSectionProps) {
  const { tr } = useTranslation();

  if (myShops.length > 0) {
    return (
      <ProfileMenuSection>
        {myShops.map((shop) => (
          <ProfileMenuRow
            key={shop.id}
            icon={Store}
            title={shop.name}
            subtitle={`${shop.isOpenManual ? tr('profile.openShop') : tr('profile.closedShop')} · ${shop.address}`}
            badge={shop.newOrderCount}
            onPress={() => router.push(`/seller/${shop.id}/orders`)}
          />
        ))}
        <ProfileMenuRow
          icon={Plus}
          title={tr('nav.newShop')}
          borderBottom={false}
          onPress={() => router.push('/seller/new')}
        />
      </ProfileMenuSection>
    );
  }

  if (latestApp?.status === 'pending') {
    return (
      <ProfileMenuSection>
        <View style={styles.pendingCta}>
          <View style={styles.pendingIcon}>
            <Clock size={24} color={colors.feedback.warning} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pendingTitle}>{tr('seller.pending.title')}</Text>
            <Text style={styles.applySub}>{tr('seller.pending.desc')}</Text>
          </View>
        </View>
      </ProfileMenuSection>
    );
  }

  if (latestApp?.status === 'rejected') {
    return (
      <ProfileMenuSection>
        <Pressable style={styles.rejectedCta} onPress={() => router.push('/seller-application')}>
          <View style={styles.rejectedIcon}>
            <XCircle size={24} color={colors.brand.primary} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rejectedTitle}>{tr('seller.rejected.title')}</Text>
            {latestApp.rejectionReason ? (
              <Text style={styles.applySub} numberOfLines={2}>
                {tr('seller.rejected.reason', { reason: latestApp.rejectionReason })}
              </Text>
            ) : null}
            <Text style={styles.retryText}>{tr('profile.reapply')}</Text>
          </View>
        </Pressable>
      </ProfileMenuSection>
    );
  }

  return (
    <ProfileMenuSection>
      <ProfileMenuRow
        icon={Store}
        title={tr('profile.openShopShort')}
        borderBottom={false}
        onPress={onOpenApplication}
      />
    </ProfileMenuSection>
  );
}

const styles = StyleSheet.create({
  pendingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.feedback.warningSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  pendingIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: { ...typography.h4, color: colors.feedback.warning },
  applySub: { ...typography.bodySmall, color: colors.text.secondary, marginTop: 2 },
  rejectedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.brand.primarySurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rejectedIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectedTitle: { ...typography.h4, color: colors.brand.primary },
  retryText: { ...typography.bodySmall, color: colors.brand.primary, fontWeight: '800', marginTop: spacing.xs },
});
