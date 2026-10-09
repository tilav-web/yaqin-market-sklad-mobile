import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QrCode, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  computePermissionsForRoles,
  StaffRole,
} from '@/constants/staffPermissions';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { colors } from '@/theme';

import { InviteAdvancedPerms } from './InviteAdvancedPerms';
import { InviteRolesSection } from './InviteRolesSection';
import { GrantBody, StaffPresetDto } from './types';

interface InviteSetupModalProps {
  visible: boolean;
  shopId: string;
  customPresets: StaffPresetDto[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (body: GrantBody) => void;
}

export function InviteSetupModal({
  visible,
  shopId,
  customPresets,
  pending,
  onCancel,
  onSubmit,
}: InviteSetupModalProps) {
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const [roleName, setRoleName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<StaffRole[]>(['cashier']);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [customPresetId, setCustomPresetId] = useState<string | null>(null);
  const [showAdvancedPerms, setShowAdvancedPerms] = useState(false);
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  const [syncedVisible, setSyncedVisible] = useState<boolean | null>(null);
  if (syncedVisible !== visible) {
    setSyncedVisible(visible);
    if (visible) {
      setRoleName('');
      setSelectedRoles(['cashier']);
      setPermissions(computePermissionsForRoles(['cashier']));
      setCustomPresetId(null);
      setShowAdvancedPerms(false);
      setSaveAsPreset(false);
      setPresetName('');
    }
  }

  const savePresetMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/seller/shops/${shopId}/staff-presets`, {
        name: presetName.trim(),
        permissions,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop-staff-presets', shopId] }),
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/seller/shops/${shopId}/staff-presets/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop-staff-presets', shopId] }),
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const handleToggleRole = (roleKey: StaffRole) => {
    setCustomPresetId(null);
    let nextRoles: StaffRole[];
    if (selectedRoles.includes(roleKey)) {
      if (selectedRoles.length === 1) {
        nextRoles = [];
      } else {
        nextRoles = selectedRoles.filter((r) => r !== roleKey);
      }
    } else {
      nextRoles = [...selectedRoles, roleKey];
    }
    setSelectedRoles(nextRoles);
    setPermissions(computePermissionsForRoles(nextRoles));
  };

  const handleApplyShortcut = (shortcutRoles: StaffRole[]) => {
    setCustomPresetId(null);
    setSelectedRoles(shortcutRoles);
    setPermissions(computePermissionsForRoles(shortcutRoles));
  };

  const handlePickCustomPreset = (preset: StaffPresetDto) => {
    setCustomPresetId(preset.id);
    setSelectedRoles(['custom']);
    setPermissions([...preset.permissions]);
    setRoleName((prev) => prev || preset.name);
  };

  const toggleSinglePerm = (key: string) => {
    setCustomPresetId(null);
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  };

  const handleSubmit = async () => {
    if (saveAsPreset && presetName.trim()) {
      try {
        await savePresetMutation.mutateAsync();
      } catch (e) {
        Alert.alert(tr('common.error'), extractErrorMessage(e));
        return;
      }
    }

    const body: GrantBody = {
      customRoleName: roleName.trim() || undefined,
    };

    if (customPresetId) {
      body.customPresetId = customPresetId;
    } else if (selectedRoles.length > 0) {
      body.roles = selectedRoles;
      body.permissions = permissions;
    } else if (permissions.length > 0) {
      body.permissions = permissions;
    }

    onSubmit(body);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable className="absolute inset-0 bg-black/55" onPress={onCancel} />
      <View className="flex-1 items-center justify-center p-4" pointerEvents="box-none">
        <View className="bg-bg-surface rounded-3xl p-5 gap-4 w-full max-w-[440px] max-h-[90%]">
          <View className="flex-row justify-between items-start border-b border-border-subtle pb-3">
            <View>
              <Text className="text-lg font-extrabold text-text-primary">Yangi xodim biriktirish</Text>
              <Text className="text-xs text-text-secondary mt-0.5">Vazifalar va huquqlarni belgilang</Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={10} className="p-1">
              <X size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ gap: 14, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <InviteRolesSection
              selectedRoles={selectedRoles}
              onApplyShortcut={handleApplyShortcut}
              onToggleRole={handleToggleRole}
            />

            <View className="gap-2">
              <Text className="text-xs font-semibold text-text-primary">Xodim lavozimi yoki ismi (ixtiyoriy)</Text>
              <TextInput
                className="bg-bg-canvas rounded-xl border border-border-default px-3 py-2.5 text-sm text-text-primary"
                value={roleName}
                onChangeText={setRoleName}
                placeholder="Masalan: Kechki kassir, Sardor"
                placeholderTextColor={colors.text.hint}
              />
            </View>

            {customPresets.length > 0 && (
              <View className="gap-2">
                <Text className="text-xs font-semibold text-text-primary">Do'koningizning saqlangan shablonlari</Text>
                <View className="flex-row flex-wrap gap-2">
                  {customPresets.map((p) => {
                    const isSelected = customPresetId === p.id;
                    return (
                      <View key={p.id} className="flex-row items-center">
                        <Pressable
                          onPress={() => handlePickCustomPreset(p)}
                          className={`px-3 py-1.5 rounded-l-full border ${
                            isSelected
                              ? 'bg-brand-primary/10 border-brand-primary'
                              : 'bg-bg-surface-muted border-border-default'
                          }`}
                        >
                          <Text
                            className={`text-xs ${
                              isSelected ? 'text-brand-primary font-bold' : 'text-text-secondary font-medium'
                            }`}
                          >
                            {p.name}
                          </Text>
                        </Pressable>
                        <Pressable
                          hitSlop={8}
                          onPress={() => {
                            Alert.alert(
                              'Shablonni o\'chirish',
                              `"${p.name}" shablonini o'chirmoqchimisiz?`,
                              [
                                { text: 'Bekor qilish', style: 'cancel' },
                                {
                                  text: 'O\'chirish',
                                  style: 'destructive',
                                  onPress: () => deletePresetMutation.mutate(p.id),
                                },
                              ],
                            );
                          }}
                          className={`px-2 py-1.5 rounded-r-full border-y border-r ${
                            isSelected
                              ? 'bg-brand-primary/10 border-brand-primary'
                              : 'bg-bg-surface-muted border-border-default'
                          }`}
                        >
                          <X size={14} color={colors.text.secondary} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <InviteAdvancedPerms
              show={showAdvancedPerms}
              onToggleShow={() => setShowAdvancedPerms((v) => !v)}
              permissions={permissions}
              onTogglePerm={toggleSinglePerm}
              saveAsPreset={saveAsPreset}
              onToggleSaveAsPreset={setSaveAsPreset}
              presetName={presetName}
              onChangePresetName={setPresetName}
            />
          </ScrollView>

          <View className="flex-row gap-3 pt-2">
            <Pressable className="flex-1 py-3 rounded-2xl bg-bg-surface-muted items-center" onPress={onCancel}>
              <Text className="text-sm font-bold text-text-secondary">Bekor qilish</Text>
            </Pressable>
            <Pressable
              className={`flex-1 py-3 rounded-2xl bg-brand-primary flex-row items-center justify-center gap-2 ${
                pending || savePresetMutation.isPending || (saveAsPreset && !presetName.trim())
                  ? 'opacity-60'
                  : 'active:opacity-85'
              }`}
              disabled={
                pending || savePresetMutation.isPending || (saveAsPreset && !presetName.trim())
              }
              onPress={handleSubmit}
            >
              <QrCode size={18} color={colors.text.onPrimary} />
              <Text className="text-sm font-bold text-text-on-primary">
                {pending || savePresetMutation.isPending ? 'Yaratilmoqda...' : 'QR Kod Yaratish'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
