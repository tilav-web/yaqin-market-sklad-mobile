import { Check, Shield, Sparkles } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  ROLE_OPTIONS,
  SMALL_SHOP_SHORTCUTS,
  StaffRole,
} from '@/constants/staffPermissions';
import { colors } from '@/theme';

interface InviteRolesSectionProps {
  selectedRoles: StaffRole[];
  onApplyShortcut: (roles: StaffRole[]) => void;
  onToggleRole: (roleKey: StaffRole) => void;
}

export function InviteRolesSection({
  selectedRoles,
  onApplyShortcut,
  onToggleRole,
}: InviteRolesSectionProps) {
  return (
    <>
      {/* Shortcuts */}
      <View className="gap-2">
        <View className="flex-row items-center gap-1.5">
          <Sparkles size={16} color={colors.brand.primary} />
          <Text className="text-sm font-bold text-text-primary">Tezkor shablonlar</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {SMALL_SHOP_SHORTCUTS.map((s) => {
            const isMatch =
              s.roles.length === selectedRoles.length &&
              s.roles.every((r) => selectedRoles.includes(r));
            return (
              <Pressable
                key={s.id}
                className={`p-3 rounded-2xl border min-w-[130px] ${
                  isMatch
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-border-default bg-bg-surface-muted'
                }`}
                onPress={() => onApplyShortcut(s.roles)}
              >
                <Text
                  className={`text-xs font-bold ${
                    isMatch ? 'text-brand-primary' : 'text-text-primary'
                  }`}
                >
                  {s.labelUz}
                </Text>
                <Text
                  className={`text-[11px] mt-0.5 ${
                    isMatch ? 'text-brand-primary font-medium' : 'text-text-secondary'
                  }`}
                >
                  {s.subUz}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Role selection grid */}
      <View className="gap-2">
        <View className="flex-row items-center gap-1.5">
          <Shield size={16} color={colors.text.primary} />
          <Text className="text-sm font-bold text-text-primary">
            Xodim vazifalari (Bir nechtasini tanlang)
          </Text>
        </View>
        <View className="gap-2">
          {ROLE_OPTIONS.map((opt) => {
            const isSelected = selectedRoles.includes(opt.key);
            return (
              <Pressable
                key={opt.key}
                className={`p-3 rounded-2xl border ${
                  isSelected
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-border-default bg-bg-surface-muted'
                }`}
                onPress={() => onToggleRole(opt.key)}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base">{opt.badge}</Text>
                    <Text
                      className={`text-sm font-bold ${
                        isSelected ? 'text-brand-primary' : 'text-text-primary'
                      }`}
                    >
                      {opt.titleUz}
                    </Text>
                  </View>
                  <View
                    className={`w-5 h-5 rounded-md items-center justify-center border ${
                      isSelected
                        ? 'bg-brand-primary border-brand-primary'
                        : 'border-border-default bg-bg-surface'
                    }`}
                  >
                    {isSelected && <Check size={14} color={colors.text.onPrimary} strokeWidth={3} />}
                  </View>
                </View>
                <Text
                  className={`text-xs leading-4 ${
                    isSelected ? 'text-brand-primary/90' : 'text-text-secondary'
                  }`}
                >
                  {opt.descUz}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}
