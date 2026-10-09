import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  computePermissionsForRoles,
  PERMISSION_GROUPS,
  ROLE_OPTIONS,
  StaffMember,
  StaffRole,
} from '@/constants/staffPermissions';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { colors } from '@/theme';

import { GrantBody, StaffPresetDto } from './types';

interface StaffCardProps {
  shopId: string;
  member: StaffMember;
  customPresets: StaffPresetDto[];
}

export function StaffCard({ shopId, member }: StaffCardProps) {
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const update = useMutation({
    mutationFn: async (body: GrantBody & { isActive?: boolean }) => {
      await api.patch(`/seller/shops/${shopId}/staff/${member.id}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop-staff', shopId] }),
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const memberRoles: StaffRole[] =
    member.roles && member.roles.length > 0
      ? member.roles
      : member.preset
        ? [member.preset as StaffRole]
        : ['custom'];

  const handleToggleCardRole = (roleKey: StaffRole) => {
    let nextRoles: StaffRole[];
    if (memberRoles.includes(roleKey)) {
      nextRoles = memberRoles.filter((r) => r !== roleKey);
    } else {
      nextRoles = [...memberRoles.filter((r) => r !== 'custom'), roleKey];
    }
    if (nextRoles.length === 0) nextRoles = ['custom'];
    update.mutate({ roles: nextRoles, permissions: computePermissionsForRoles(nextRoles) });
  };

  const togglePerm = (key: string) => {
    const has = member.permissions.includes(key);
    const next = has
      ? member.permissions.filter((p) => p !== key)
      : [...member.permissions, key];
    update.mutate({ permissions: next });
  };

  return (
    <View className="bg-bg-surface rounded-2xl p-4 gap-3 border border-border-default">
      <View className="flex-row items-center gap-3">
        <View className="w-11 h-11 rounded-full bg-brand-primary items-center justify-center">
          <Text className="text-text-on-primary font-extrabold text-base">
            {(member.name?.[0] ?? member.phone.slice(-2)).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-text-primary">{member.name ?? tr('staff.staffFallback')}</Text>
          <Text className="text-xs text-text-secondary mt-0.5">{member.phone}</Text>
        </View>
        <View className="bg-bg-surface-muted rounded-md px-2.5 py-1">
          <Text className="text-xs font-bold text-text-primary">
            {member.customRoleName ||
              memberRoles
                .map((r) => {
                  if (r === 'cashier') return 'Kassir';
                  if (r === 'storekeeper') return 'Omborchi';
                  if (r === 'courier') return 'Kuryer';
                  if (r === 'manager') return 'Menejer';
                  return r;
                })
                .join(', ')}
          </Text>
        </View>
      </View>

      {/* Role Badges */}
      <View className="flex-row flex-wrap gap-1.5 mt-0.5">
        {ROLE_OPTIONS.map((opt) => {
          const isActive = memberRoles.includes(opt.key);
          return (
            <Pressable
              key={opt.key}
              className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                isActive
                  ? 'bg-brand-primary/10 border-brand-primary'
                  : 'border-border-default bg-bg-surface-muted'
              }`}
              onPress={() => handleToggleCardRole(opt.key)}
            >
              <Text className="text-xs">{opt.badge}</Text>
              <Text
                className={`text-xs ${
                  isActive ? 'text-brand-primary font-bold' : 'font-semibold text-text-secondary'
                }`}
              >
                {opt.titleUz}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable className="flex-row justify-between items-center border-t border-border-subtle pt-3" onPress={() => setExpanded((v) => !v)}>
        <Text className="text-xs font-bold text-brand-primary">
          Huquqlar ({member.permissions.length} ta) {expanded ? '▲' : '▼'}
        </Text>
        <Pressable
          onPress={() =>
            Alert.alert(
              tr('common.delete'),
              `"${member.name ?? member.phone}" ni xodimlar safidan chiqarishni xohlaysizmi?`,
              [
                { text: tr('common.cancel'), style: 'cancel' },
                {
                  text: tr('staff.remove'),
                  style: 'destructive',
                  onPress: () => update.mutate({ isActive: false }),
                },
              ],
            )
          }
        >
          <Text className="text-xs font-bold text-text-secondary">{tr('staff.remove')}</Text>
        </Pressable>
      </Pressable>

      {expanded && (
        <View className="gap-3 mt-2">
          {PERMISSION_GROUPS.map((group) => (
            <View key={group.titleKey} className="gap-0.5">
              <Text className="text-xs font-extrabold text-brand-primary uppercase mt-2">{tr(group.titleKey)}</Text>
              {group.items.map((item) => (
                <View key={item.key} className="flex-row justify-between items-center py-1.5">
                  <Text className="text-xs text-text-primary flex-1 pr-3">{tr(item.labelKey)}</Text>
                  <Switch
                    value={member.permissions.includes(item.key)}
                    onValueChange={() => togglePerm(item.key)}
                    trackColor={{ true: colors.feedback.success }}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
