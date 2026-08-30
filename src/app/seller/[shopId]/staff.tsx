import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useGlobalSearchParams } from 'expo-router';
import { Check, ChevronDown, ChevronUp, Plus, QrCode, Shield, Sparkles, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { useTranslation } from '@/i18n';
import { OwnerOnlyNotice } from '@/components/seller/OwnerOnlyNotice';
import { Brand, Radius, Spacing } from '@/constants/theme';
import {
  computePermissionsForRoles,
  PERMISSION_GROUPS,
  ROLE_OPTIONS,
  SMALL_SHOP_SHORTCUTS,
  StaffMember,
  StaffPreset,
  StaffRole,
} from '@/constants/staffPermissions';
import { api, extractErrorMessage } from '@/lib/api';
import { useIsShopOwner } from '@/lib/useIsShopOwner';

interface InviteResp {
  token: string;
  expiresAt: string;
  shopName: string;
}

interface StaffPresetDto {
  id: string;
  name: string;
  permissions: string[];
}

/** What createStaffInvitation / updateStaff both accept — resolved client-side by the setup UI below. */
interface GrantBody {
  roles?: StaffRole[];
  preset?: StaffPreset;
  customPresetId?: string;
  permissions?: string[];
  customRoleName?: string;
}

export default function StaffScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const [invite, setInvite] = useState<InviteResp | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const isOwner = useIsShopOwner(shopId);

  const staffQuery = useQuery({
    queryKey: ['shop-staff', shopId],
    staleTime: 60_000,
    enabled: isOwner !== false,
    queryFn: async () => {
      const res = await api.get<StaffMember[]>(`/seller/shops/${shopId}/staff`);
      return res.data;
    },
  });

  const presetsQuery = useQuery({
    queryKey: ['shop-staff-presets', shopId],
    staleTime: 60_000,
    enabled: isOwner !== false,
    queryFn: async () => (await api.get<StaffPresetDto[]>(`/seller/shops/${shopId}/staff-presets`)).data,
  });

  useFocusEffect(
    useCallback(() => {
      void qc.invalidateQueries({ queryKey: ['shop-staff', shopId], refetchType: 'none' });
      void qc.invalidateQueries({ queryKey: ['shop-staff-presets', shopId], refetchType: 'none' });
    }, [qc, shopId]),
  );

  const inviteMutation = useMutation({
    mutationFn: async (body: GrantBody) => {
      const res = await api.post<InviteResp>(`/seller/shops/${shopId}/staff/invitations`, body);
      return res.data;
    },
    onSuccess: (data) => {
      setInvite(data);
      setSetupOpen(false);
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!invite) return;
    const id = setInterval(() => setNowTick(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [invite]);

  const active = (staffQuery.data ?? []).filter((s) => s.isActive);
  const customPresets = presetsQuery.data ?? [];

  if (isOwner === false) {
    return <OwnerOnlyNotice />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={staffQuery.isFetching && !staffQuery.isLoading}
            onRefresh={() => void staffQuery.refetch()}
            tintColor={Brand.red}
            colors={[Brand.red]}
          />
        }>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconWrap}>
              <Users size={22} color={Brand.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Do'kon xodimlari</Text>
              <Text style={styles.heroSubtitle}>
                Kassir, Omborchi, Kuryer yoki bir vaqtning o'zida bir nechta vazifani bajara oladigan xodimlarni biriktiring
              </Text>
            </View>
          </View>
          <Pressable style={styles.addBtn} onPress={() => setSetupOpen(true)}>
            <Plus size={18} color={Brand.white} strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Yangi xodim qo'shish (QR Kod)</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>
          Biriktirilgan xodimlar ({active.length})
        </Text>

        {staffQuery.isLoading ? (
          <ActivityIndicator color={Brand.red} style={{ marginTop: 30 }} />
        ) : active.length === 0 ? (
          <View style={styles.emptyCard}>
            <Users size={40} color={Brand.gray400} />
            <Text style={styles.emptyTitle}>Hozircha xodimlar yo'q</Text>
            <Text style={styles.emptyText}>
              Do'koningizga kassir yoki omborchi qo'shish uchun "Yangi xodim qo'shish" tugmasini bosing
            </Text>
          </View>
        ) : (
          active.map((s) => (
            <StaffCard key={s.id} shopId={shopId} member={s} customPresets={customPresets} />
          ))
        )}
      </ScrollView>

      <InviteSetupModal
        visible={setupOpen}
        shopId={shopId}
        customPresets={customPresets}
        pending={inviteMutation.isPending}
        onCancel={() => setSetupOpen(false)}
        onSubmit={(body) => inviteMutation.mutate(body)}
      />

      <InviteQrModal
        invite={invite}
        nowTick={nowTick}
        onClose={() => setInvite(null)}
      />
    </SafeAreaView>
  );
}

function InviteQrModal({
  invite, nowTick, onClose,
}: {
  invite: InviteResp | null;
  nowTick: number;
  onClose: () => void;
}) {
  const { tr } = useTranslation();
  if (!invite) return null;

  const msLeft = new Date(invite.expiresAt).getTime() - nowTick;
  const minsLeft = Math.max(0, Math.ceil(msLeft / 60_000));
  const isExpired = msLeft <= 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modalCenter} pointerEvents="box-none">
        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>{tr('staff.qrTitle')}</Text>
          <Text style={styles.qrSubtitle}>{invite.shopName}</Text>

          <View style={[styles.qrWrapper, isExpired && { opacity: 0.3 }]}>
            <QRCode value={`yaqin://staff-invite?token=${encodeURIComponent(invite.token)}`} size={210} />
          </View>

          <Text style={[styles.qrTimer, isExpired && styles.qrTimerExpired]}>
            {isExpired ? tr('staff.qrExpired') : tr('staff.qrValidFor', { minutes: minsLeft })}
          </Text>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{tr('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function InviteSetupModal({
  visible, shopId, customPresets, pending, onCancel, onSubmit,
}: {
  visible: boolean;
  shopId: string;
  customPresets: StaffPresetDto[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (body: GrantBody) => void;
}) {
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
      await api.post(`/seller/shops/${shopId}/staff-presets`, { name: presetName.trim(), permissions });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop-staff-presets', shopId] }),
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/seller/shops/${shopId}/staff-presets/${id}`); },
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
    setPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
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

          <ScrollView contentContainerStyle={{ gap: Spacing.four, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            <View style={styles.block}>
              <View style={styles.blockTitleRow}>
                <Sparkles size={16} color={Brand.red} />
                <Text style={styles.blockTitle}>Tezkor shablonlar</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutScroll}>
                {SMALL_SHOP_SHORTCUTS.map((s) => {
                  const isMatch = s.roles.length === selectedRoles.length && s.roles.every((r) => selectedRoles.includes(r));
                  return (
                    <Pressable
                      key={s.id}
                      style={[styles.shortcutCard, isMatch && styles.shortcutCardActive]}
                      onPress={() => handleApplyShortcut(s.roles)}>
                      <Text style={[styles.shortcutTitle, isMatch && styles.shortcutTitleActive]}>
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
                      onPress={() => handleToggleRole(opt.key)}>
                      <View style={styles.roleOptionTop}>
                        <View style={styles.roleBadgeWrap}>
                          <Text style={styles.roleBadge}>{opt.badge}</Text>
                          <Text style={[styles.roleOptionTitle, isSelected && styles.roleOptionTitleActive]}>
                            {opt.titleUz}
                          </Text>
                        </View>
                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                          {isSelected && <Check size={14} color={Brand.white} strokeWidth={3} />}
                        </View>
                      </View>
                      <Text style={[styles.roleOptionDesc, isSelected && styles.roleOptionDescActive]}>
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
                          style={[styles.presetChip, isSelected && styles.presetChipActive]}>
                          <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                            {p.name}
                          </Text>
                        </Pressable>
                        <Pressable
                          hitSlop={8}
                          onPress={() => {
                            Alert.alert('Shablonni o\'chirish', `"${p.name}" shablonini o'chirmoqchimisiz?`, [
                              { text: 'Bekor qilish', style: 'cancel' },
                              { text: 'O\'chirish', style: 'destructive', onPress: () => deletePresetMutation.mutate(p.id) },
                            ]);
                          }}
                          style={styles.presetDeleteBtn}>
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
              onPress={() => setShowAdvancedPerms((v) => !v)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.expandText}>
                  Batafsil huquqlar ({permissions.length} ta yoqilgan)
                </Text>
              </View>
              {showAdvancedPerms ? <ChevronUp size={18} color={Brand.red} /> : <ChevronDown size={18} color={Brand.red} />}
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
              <Switch value={saveAsPreset} onValueChange={setSaveAsPreset} trackColor={{ true: Brand.success }} />
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
              style={[styles.setupSubmitBtn, (pending || savePresetMutation.isPending) && { opacity: 0.6 }]}
              disabled={pending || savePresetMutation.isPending || (saveAsPreset && !presetName.trim())}
              onPress={handleSubmit}>
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

function StaffCard({
  shopId, member, customPresets,
}: {
  shopId: string;
  member: StaffMember;
  customPresets: StaffPresetDto[];
}) {
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

  const memberRoles: StaffRole[] = member.roles && member.roles.length > 0
    ? member.roles
    : (member.preset ? [member.preset as StaffRole] : ['custom']);

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
    const next = has ? member.permissions.filter((p) => p !== key) : [...member.permissions, key];
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
            {member.customRoleName || memberRoles.map((r) => {
              if (r === 'cashier') return 'Kassir';
              if (r === 'storekeeper') return 'Omborchi';
              if (r === 'courier') return 'Kuryer';
              if (r === 'manager') return 'Menejer';
              return r;
            }).join(', ')}
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
              onPress={() => handleToggleCardRole(opt.key)}>
              <Text style={styles.memberRoleBadgeEmoji}>{opt.badge}</Text>
              <Text style={[styles.memberRoleBadgeText, isActive && styles.memberRoleBadgeTextActive]}>
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
          }>
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
  container: { flex: 1, backgroundColor: Brand.gray50 },
  scroll: { padding: Spacing.four, gap: Spacing.three },

  heroCard: {
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 17, fontWeight: '800', color: Brand.black },
  heroSubtitle: { fontSize: 12, color: Brand.gray600, marginTop: 2, lineHeight: 17 },

  addBtn: {
    backgroundColor: Brand.red,
    borderRadius: Radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: { color: Brand.white, fontWeight: '800', fontSize: 14 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: Brand.black, marginTop: Spacing.two },

  emptyCard: {
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Brand.gray200,
    marginTop: Spacing.two,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Brand.gray800 },
  emptyText: { fontSize: 13, color: Brand.gray600, textAlign: 'center', lineHeight: 18 },

  card: {
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Brand.white, fontWeight: '800', fontSize: 16 },
  name: { fontSize: 16, fontWeight: '700', color: Brand.black },
  phone: { fontSize: 13, color: Brand.gray600, marginTop: 1 },
  roleTag: { backgroundColor: Brand.gray100, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  roleText: { fontSize: 12, fontWeight: '700', color: Brand.gray800 },

  roleBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
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
  memberRoleBadgeEmoji: { fontSize: 13 },
  memberRoleBadgeText: { fontSize: 12, fontWeight: '600', color: Brand.gray600 },
  memberRoleBadgeTextActive: { color: '#1D4ED8', fontWeight: '700' },

  expandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Brand.gray100,
    paddingTop: Spacing.three,
  },
  expandText: { fontSize: 13, fontWeight: '700', color: Brand.red },
  removeText: { fontSize: 13, fontWeight: '700', color: Brand.gray600 },
  permArea: { gap: Spacing.three, marginTop: Spacing.two },

  setupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray100,
    paddingBottom: Spacing.three,
  },
  setupTitle: { fontSize: 18, fontWeight: '800', color: Brand.black },
  setupSubtitle: { fontSize: 13, color: Brand.gray600, marginTop: 2 },
  closeIconBtn: { padding: 4 },

  block: { gap: 8 },
  blockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blockTitle: { fontSize: 14, fontWeight: '700', color: Brand.black },

  shortcutScroll: { gap: 8, paddingVertical: 2 },
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
  shortcutTitle: { fontSize: 13, fontWeight: '700', color: Brand.gray800 },
  shortcutTitleActive: { color: Brand.red },
  shortcutSub: { fontSize: 11, color: Brand.gray600, marginTop: 2 },
  shortcutSubActive: { color: Brand.red },

  roleGrid: { gap: 8 },
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
  roleOptionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleBadgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleBadge: { fontSize: 16 },
  roleOptionTitle: { fontSize: 15, fontWeight: '700', color: Brand.gray800 },
  roleOptionTitleActive: { color: Brand.red },
  roleOptionDesc: { fontSize: 12, color: Brand.gray600, lineHeight: 16 },
  roleOptionDescActive: { color: Brand.gray800 },

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

  inputLabel: { fontSize: 13, fontWeight: '600', color: Brand.gray800 },
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

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Brand.gray50,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  presetChipActive: { backgroundColor: Brand.red, borderColor: Brand.red },
  presetChipText: { fontSize: 12, color: Brand.gray800, fontWeight: '600' },
  presetChipTextActive: { color: Brand.white, fontWeight: '700' },
  customPresetChipWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  presetDeleteBtn: { padding: 6 },

  permListWrap: { gap: Spacing.two, paddingLeft: 4 },
  permGroup: { gap: 2 },
  permGroupTitle: { fontSize: 12, fontWeight: '800', color: Brand.red, textTransform: 'uppercase', marginTop: Spacing.two },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  permLabel: { fontSize: 13, color: Brand.gray800, flex: 1, paddingRight: Spacing.three },

  saveAsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  saveAsLabel: { fontSize: 13, color: Brand.gray800, flex: 1 },

  setupBtnRow: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  setupCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: 'center',
    backgroundColor: Brand.gray100,
  },
  setupCancelText: { color: Brand.gray800, fontWeight: '700', fontSize: 14 },
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
  setupSubmitText: { color: Brand.white, fontWeight: '800', fontSize: 14 },

  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  qrCard: {
    backgroundColor: Brand.white,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: 320,
  },
  qrTitle: { fontSize: 18, fontWeight: '800', color: Brand.black },
  qrSubtitle: { fontSize: 13, color: Brand.gray600 },
  qrWrapper: { padding: Spacing.four, backgroundColor: Brand.white, borderRadius: Radius.md },
  qrTimer: { fontSize: 13, color: Brand.gray600, fontWeight: '600' },
  qrTimerExpired: { color: Brand.red, fontWeight: '700' },
  closeBtn: {
    backgroundColor: Brand.red,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  closeBtnText: { color: Brand.white, fontWeight: '800', fontSize: 15 },

  setupWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  setupCard: {
    backgroundColor: Brand.white,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    gap: Spacing.four,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
  },
});
