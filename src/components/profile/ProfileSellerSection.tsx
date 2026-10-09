import { router } from 'expo-router';
import { Clock, Plus, Store, XCircle } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { MyShop } from '@/lib/types';
import { colors, typography } from '@/theme';
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
        <View
          className="flex-row items-center gap-3 p-4"
          style={{ backgroundColor: colors.feedback.warningSurface }}
        >
          <View
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.bg.surface }}
          >
            <Clock size={24} color={colors.feedback.warning} strokeWidth={2.4} />
          </View>
          <View className="flex-1">
            <Text style={[typography.h4, { color: colors.feedback.warning }]}>
              {tr('seller.pending.title')}
            </Text>
            <Text className="mt-0.5" style={[typography.bodySmall, { color: colors.text.secondary }]}>
              {tr('seller.pending.desc')}
            </Text>
          </View>
        </View>
      </ProfileMenuSection>
    );
  }

  if (latestApp?.status === 'rejected') {
    return (
      <ProfileMenuSection>
        <Pressable
          className="flex-row items-center gap-3 p-4"
          style={{ backgroundColor: colors.brand.primarySurface }}
          onPress={() => router.push('/seller-application')}
        >
          <View
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.bg.surface }}
          >
            <XCircle size={24} color={colors.brand.primary} strokeWidth={2.4} />
          </View>
          <View className="flex-1">
            <Text style={[typography.h4, { color: colors.brand.primary }]}>
              {tr('seller.rejected.title')}
            </Text>
            {latestApp.rejectionReason ? (
              <Text style={[typography.bodySmall, { color: colors.text.secondary }]} numberOfLines={2}>
                {tr('seller.rejected.reason', { reason: latestApp.rejectionReason })}
              </Text>
            ) : null}
            <Text className="font-extrabold mt-1" style={[typography.bodySmall, { color: colors.brand.primary }]}>
              {tr('profile.reapply')}
            </Text>
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
