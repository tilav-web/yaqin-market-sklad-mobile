import { router } from 'expo-router';
import { Store } from 'lucide-react-native';
import React from 'react';

import { useTranslation } from '@/i18n';
import type { WorkingForMeEntry } from '@/lib/useIsShopOwner';
import { ProfileMenuRow, ProfileMenuSection } from './ProfileMenuRow';

interface ProfileStaffSectionProps {
  staffShops: WorkingForMeEntry[];
}

export function ProfileStaffSection({ staffShops }: ProfileStaffSectionProps) {
  const { tr } = useTranslation();

  if (staffShops.length === 0) return null;

  return (
    <ProfileMenuSection>
      {staffShops.map(({ shop, role }, idx) => (
        <ProfileMenuRow
          key={shop.id}
          icon={Store}
          title={shop.name}
          subtitle={`${role ?? tr('profile.staffRole')} · ${shop.address}`}
          borderBottom={idx !== staffShops.length - 1}
          onPress={() => router.push(`/seller/${shop.id}/orders`)}
        />
      ))}
    </ProfileMenuSection>
  );
}
