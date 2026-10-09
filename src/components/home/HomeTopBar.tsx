import { router } from 'expo-router';
import { Bell, ChevronDown, MapPin, ShoppingBag } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/stores/theme';
import { radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface HomeTopBarProps {
  locationLabel: string;
  onOpenLocationPicker: () => void;
  totalCartCount: number;
}

export function HomeTopBar({
  locationLabel,
  onOpenLocationPicker,
  totalCartCount,
}: HomeTopBarProps) {
  const { colors: activeColors } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: activeColors.bg.surface,
          borderBottomColor: activeColors.border.subtle,
        },
      ]}
    >
      {/* Left: Location Picker */}
      <Pressable
        onPress={() => {
          haptics.selection();
          onOpenLocationPicker();
        }}
        style={[styles.locationPill, { backgroundColor: activeColors.bg.surfaceMuted }]}
      >
        <MapPin size={15} color={activeColors.brand.primary} />
        <Text style={[styles.locationText, { color: activeColors.text.primary }]} numberOfLines={1}>
          {locationLabel}
        </Text>
        <ChevronDown size={14} color={activeColors.text.secondary} />
      </Pressable>

      {/* Center: Brand Name */}
      <View style={styles.brandContainer}>
        <Text style={[styles.brandTitle, { color: activeColors.brand.primary }]}>Yaqin</Text>
      </View>

      {/* Right: Cart & Notifications */}
      <View style={styles.rightActions}>
        <Pressable
          onPress={() => {
            haptics.selection();
            router.push('/(tabs)/carts');
          }}
          style={[styles.iconButton, { backgroundColor: activeColors.bg.surfaceMuted }]}
        >
          <ShoppingBag size={19} color={activeColors.text.primary} />
          {totalCartCount > 0 && (
            <View
              style={[
                styles.cartBadge,
                {
                  backgroundColor: activeColors.brand.primary,
                  borderColor: activeColors.bg.surface,
                },
              ]}
            >
              <Text style={styles.cartBadgeText}>
                {totalCartCount > 99 ? '99+' : totalCartCount}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            haptics.selection();
            router.push('/notifications');
          }}
          style={[styles.iconButton, { backgroundColor: activeColors.bg.surfaceMuted }]}
        >
          <Bell size={19} color={activeColors.text.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    maxWidth: 135,
  },
  locationText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 80,
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 12,
  },
});
