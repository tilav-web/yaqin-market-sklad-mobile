import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  ChevronUp,
  QrCode,
  Shield,
  Sparkles,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  computePermissionsForRoles,
  PERMISSION_GROUPS,
  ROLE_OPTIONS,
  SMALL_SHOP_SHORTCUTS,
  StaffRole,
} from '@/constants/staffPermissions';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';

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
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.setupWrap} pointerEvents="box-none">
        <View style={styles.setupCard}>
          <View style={styles.setupHeader}>
            <View>
              <Text style={styles.setupTitle}>Yangi xodim biriktirish</Text>
              <Text style={styles.setupSubtitle}>Vazifalar va huquqlarni belgilang</Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={10} style={styles.closeIconBtn}>
              <X size={20} color={Brand.gray600} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ gap: Spacing.four, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.block}>
              <View style={styles.blockTitleRow}>
                <Sparkles size={16} color={Brand.red} />
                <Text style={styles.blockTitle}>Tezkor shablonlar</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.shortcutScroll}
              >
                {SMALL_SHOP_SHORTCUTS.map((s) => {
                  const isMatch =
                    s.roles.length === selectedRoles.length &&
                    s.roles.every((r) => selectedRoles.includes(r));
                  return (
                    <Pressable
                      key={s.id}
                      style={[styles.shortcutCard, isMatch && styles.shortcutCardActive]}
                      onPress={() => handleApplyShortcut(s.roles)}
                    >
                      <Text
                        style={[styles.shortcutTitle, isMatch && styles.shortcutTitleActive]}
                      >
                        {s.labelUz}
                      </Text>
                      <Text style={[styles.shortcutSub, isMatch && styles.shortcutSubActive]}>
                        {s.subUz}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.block}>
              <View style={styles.blockTitleRow}>
                <Shield size={16} color={Brand.black} />
                <Text style={styles.blockTitle}>Xodim vazifalari (Bir nechtasini tanlang)</Text>
              </View>
              <View style={styles.roleGrid}>
                {ROLE_OPTIONS.map((opt) => {
                  const isSelected = selectedRoles.includes(opt.key);
                  return (
                    <Pressable
                      key={opt.key}
                      style={[styles.roleOptionCard, isSelected && styles.roleOptionCardActive]}
                      onPress={() => handleToggleRole(opt.key)}
                    >
                      <View style={styles.roleOptionTop}>
                        <View style={styles.roleBadgeWrap}>
                          <Text style={styles.roleBadge}>{opt.badge}</Text>
                          <Text
                            style={[
                              styles.roleOptionTitle,
                              isSelected && styles.roleOptionTitleActive,
                            ]}
                          >
                            {opt.titleUz}
                          </Text>
                        </View>
                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                          {isSelected && <Check size={14} color={Brand.white} strokeWidth={3} />}
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.roleOptionDesc,
                          isSelected && styles.roleOptionDescActive,
                        ]}
                      >
                        {opt.descUz}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.inputLabel}>Xodim lavozimi yoki ismi (ixtiyoriy)</Text>
              <TextInput
                style={styles.input}
                value={roleName}
                onChangeText={setRoleName}
                placeholder="Masalan: Kechki kassir, Sardor"
                placeholderTextColor={Brand.gray400}
              />
            </View>

            {customPresets.length > 0 && (
              <View style={styles.block}>
                <Text style={styles.inputLabel}>Do'koningizning saqlangan shablonlari</Text>
                <View style={styles.presetRow}>
                  {customPresets.map((p) => {
                    const isSelected = customPresetId === p.id;
                    return (
                      <View key={p.id} style={styles.customPresetChipWrap}>
                        <Pressable
                          onPress={() => handlePickCustomPreset(p)}
                          style={[styles.presetChip, isSelected && styles.presetChipActive]}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              isSelected && styles.presetChipTextActive,
                            ]}
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
                          style={styles.presetDeleteBtn}
                        >
                          <X size={14} color={Brand.gray600} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <Pressable
              style={styles.expandRow}
              onPress={() => setShowAdvancedPerms((v) => !v)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.expandText}>
                  Batafsil huquqlar ({permissions.length} ta yoqilgan)
                </Text>
              </View>
              {showAdvancedPerms ? (
                <ChevronUp size={18} color={Brand.red} />
              ) : (
                <ChevronDown size={18} color={Brand.red} />
              )}
            </Pressable>

            {showAdvancedPerms && (
              <View style={styles.permListWrap}>
                {PERMISSION_GROUPS.map((group) => (
                  <View key={group.titleKey} style={styles.permGroup}>
                    <Text style={styles.permGroupTitle}>{tr(group.titleKey)}</Text>
                    {group.items.map((item) => (
                      <View key={item.key} style={styles.permRow}>
                        <Text style={styles.permLabel}>{tr(item.labelKey)}</Text>
                        <Switch
                          value={permissions.includes(item.key)}
                          onValueChange={() => toggleSinglePerm(item.key)}
                          trackColor={{ true: Brand.success }}
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            <Pressable style={styles.saveAsRow} onPress={() => setSaveAsPreset((v) => !v)}>
              <Switch
                value={saveAsPreset}
                onValueChange={setSaveAsPreset}
                trackColor={{ true: Brand.success }}
              />
              <Text style={styles.saveAsLabel}>Ushbu rolni yangi shablon sifatida saqlash</Text>
            </Pressable>
            {saveAsPreset && (
              <TextInput
                style={styles.input}
                value={presetName}
                onChangeText={setPresetName}
                placeholder="Shablon nomi (masalan: 1-kassir)"
                placeholderTextColor={Brand.gray400}
              />
            )}
          </ScrollView>

          <View style={styles.setupBtnRow}>
            <Pressable style={styles.setupCancelBtn} onPress={onCancel}>
              <Text style={styles.setupCancelText}>Bekor qilish</Text>
            </Pressable>
            <Pressable
              style={[
                styles.setupSubmitBtn,
                (pending || savePresetMutation.isPending) && { opacity: 0.6 },
              ]}
              disabled={
                pending || savePresetMutation.isPending || (saveAsPreset && !presetName.trim())
              }
              onPress={handleSubmit}
            >
              <QrCode size={18} color={Brand.white} />
              <Text style={styles.setupSubmitText}>
                {pending || savePresetMutation.isPending ? 'Yaratilmoqda...' : 'QR Kod Yaratish'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  setupWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  setupCard: {
    backgroundColor: Brand.white,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    gap: Spacing.four,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
  },
  setupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray100,
    paddingBottom: Spacing.three,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.black,
  },
  setupSubtitle: {
    fontSize: 13,
    color: Brand.gray600,
    marginTop: 2,
  },
  closeIconBtn: {
    padding: 4,
  },
  block: {
    gap: 8,
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.black,
  },
  shortcutScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  shortcutCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Brand.gray50,
    borderWidth: 1,
    borderColor: Brand.gray200,
    minWidth: 140,
  },
  shortcutCardActive: {
    backgroundColor: '#FEF2F2',
    borderColor: Brand.red,
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.gray800,
  },
  shortcutTitleActive: {
    color: Brand.red,
  },
  shortcutSub: {
    fontSize: 11,
    color: Brand.gray600,
    marginTop: 2,
  },
  shortcutSubActive: {
    color: Brand.red,
  },
  roleGrid: {
    gap: 8,
  },
  roleOptionCard: {
    backgroundColor: Brand.gray50,
    borderRadius: Radius.md,
    padding: Spacing.three,
    borderWidth: 1.5,
    borderColor: Brand.gray200,
    gap: 4,
  },
  roleOptionCardActive: {
    backgroundColor: '#FEF2F2',
    borderColor: Brand.red,
  },
  roleOptionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    fontSize: 16,
  },
  roleOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.gray800,
  },
  roleOptionTitleActive: {
    color: Brand.red,
  },
  roleOptionDesc: {
    fontSize: 12,
    color: Brand.gray600,
    lineHeight: 16,
  },
  roleOptionDescActive: {
    color: Brand.gray800,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Brand.gray400,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Brand.red,
    borderColor: Brand.red,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.gray800,
  },
  input: {
    borderWidth: 1,
    borderColor: Brand.gray200,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Brand.black,
    backgroundColor: Brand.white,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Brand.gray50,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  presetChipActive: {
    backgroundColor: Brand.red,
    borderColor: Brand.red,
  },
  presetChipText: {
    fontSize: 12,
    color: Brand.gray800,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: Brand.white,
    fontWeight: '700',
  },
  customPresetChipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  presetDeleteBtn: {
    padding: 6,
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
  permListWrap: {
    gap: Spacing.two,
    paddingLeft: 4,
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
  saveAsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  saveAsLabel: {
    fontSize: 13,
    color: Brand.gray800,
    flex: 1,
  },
  setupBtnRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  setupCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: 'center',
    backgroundColor: Brand.gray100,
  },
  setupCancelText: {
    color: Brand.gray800,
    fontWeight: '700',
    fontSize: 14,
  },
  setupSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.red,
  },
  setupSubmitText: {
    color: Brand.white,
    fontWeight: '800',
    fontSize: 14,
  },
});
