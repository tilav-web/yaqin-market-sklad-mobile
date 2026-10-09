import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
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
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';

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
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(member.name?.[0] ?? member.phone.slice(-2)).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{member.name ?? tr('staff.staffFallback')}</Text>
          <Text style={styles.phone}>{member.phone}</Text>
        </View>
        <View style={styles.roleTag}>
          <Text style={styles.roleText}>
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
      <View style={styles.roleBadgesRow}>
        {ROLE_OPTIONS.map((opt) => {
          const isActive = memberRoles.includes(opt.key);
          return (
            <Pressable
              key={opt.key}
              style={[styles.memberRoleBadge, isActive && styles.memberRoleBadgeActive]}
              onPress={() => handleToggleCardRole(opt.key)}
            >
              <Text style={styles.memberRoleBadgeEmoji}>{opt.badge}</Text>
              <Text
                style={[
                  styles.memberRoleBadgeText,
                  isActive && styles.memberRoleBadgeTextActive,
                ]}
              >
                {opt.titleUz}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.expandRow} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.expandText}>
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
          <Text style={styles.removeText}>{tr('staff.remove')}</Text>
        </Pressable>
      </Pressable>

      {expanded && (
        <View style={styles.permArea}>
          {PERMISSION_GROUPS.map((group) => (
            <View key={group.titleKey} style={styles.permGroup}>
              <Text style={styles.permGroupTitle}>{tr(group.titleKey)}</Text>
              {group.items.map((item) => (
                <View key={item.key} style={styles.permRow}>
                  <Text style={styles.permLabel}>{tr(item.labelKey)}</Text>
                  <Switch
                    value={member.permissions.includes(item.key)}
                    onValueChange={() => togglePerm(item.key)}
                    trackColor={{ true: Brand.success }}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Brand.white,
    fontWeight: '800',
    fontSize: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.black,
  },
  phone: {
    fontSize: 13,
    color: Brand.gray600,
    marginTop: 1,
  },
  roleTag: {
    backgroundColor: Brand.gray100,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.gray800,
  },
  roleBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  memberRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Brand.gray100,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  memberRoleBadgeActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  memberRoleBadgeEmoji: {
    fontSize: 13,
  },
  memberRoleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.gray600,
  },
  memberRoleBadgeTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  expandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Brand.gray100,
    paddingTop: Spacing.three,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.red,
  },
  removeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.gray600,
  },
  permArea: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  permGroup: {
    gap: 2,
  },
  permGroupTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Brand.red,
    textTransform: 'uppercase',
    marginTop: Spacing.two,
  },
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  permLabel: {
    fontSize: 13,
    color: Brand.gray800,
    flex: 1,
    paddingRight: Spacing.three,
  },
});
