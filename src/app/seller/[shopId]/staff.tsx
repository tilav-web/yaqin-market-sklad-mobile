import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useGlobalSearchParams } from 'expo-router';
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

import { tr } from '@/i18n';
import { OwnerOnlyNotice } from '@/components/seller/OwnerOnlyNotice';
import { Brand, Radius, Spacing } from '@/constants/theme';
import {
  PERMISSION_GROUPS,
  PRESET_PERMISSIONS,
  PRESETS,
  PRESET_LABELS,
  StaffMember,
  StaffPreset,
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
  preset?: StaffPreset;
  customPresetId?: string;
  permissions?: string[];
  customRoleName?: string;
}

export default function StaffScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const [invite, setInvite] = useState<InviteResp | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  // Staff management is owner-only server-side — skip the call once confirmed
  // this user isn't the owner and explain why instead of a raw 403.
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

  // Mark stale on focus (no immediate refetch) — data refreshes on next staleTime expiry
  // or pull-to-refresh. invalidateQueries with refetchType:'none' avoids freeze on tab switch.
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

  // The QR is only valid 10 minutes — without a ticking clock the countdown
  // text was computed once at open and never changed, so the owner had no
  // idea it had expired until a scan failed.
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
        <Text style={styles.hint}>
          Yangi xodim qo‘shish uchun QR yarating va xodim uni ilova orqali skanlasin. Boshlang‘ich
          ruxsatlarni hozir tanlashingiz yoki keyinroq o‘zgartirishingiz mumkin.
        </Text>

        <Pressable style={styles.addBtn} onPress={() => setSetupOpen(true)}>
          <Text style={styles.addBtnText}>＋ Yangi xodim qo‘shish</Text>
        </Pressable>

        {staffQuery.isLoading ? (
          <ActivityIndicator color={Brand.red} style={{ marginTop: 30 }} />
        ) : active.length === 0 ? (
          <Text style={styles.empty}>Hozircha xodimlar yo‘q</Text>
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

      <Modal visible={!!invite} transparent animationType="fade" onRequestClose={() => setInvite(null)}>
        <Pressable style={styles.backdrop} onPress={() => setInvite(null)} />
        <View style={styles.qrWrap} pointerEvents="box-none">
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Xodimni qo‘shish</Text>
            <Text style={styles.qrSub}>
              Xodim bu QR ni ilova orqali skanlasin
              {invite
                ? (() => {
                    const msLeft = new Date(invite.expiresAt).getTime() - nowTick;
                    if (msLeft <= 0) return ' — muddati tugadi, yangisini yarating';
                    return ` (${Math.max(1, Math.round(msLeft / 60000))} daqiqa amal qiladi)`;
                  })()
                : ''}
            </Text>
            <View style={styles.qrBox}>
              {invite && (
                <QRCode value={`yaqinmarket://staff/join?token=${invite.token}`} size={220} />
              )}
            </View>
            <Pressable
              style={styles.qrRegen}
              onPress={() => inviteMutation.mutate({})}
              disabled={inviteMutation.isPending}>
              <Text style={styles.qrRegenText}>
                {inviteMutation.isPending ? 'Yaratilmoqda…' : 'Yangi QR (ruxsatsiz)'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.qrClose}
              onPress={() => {
                setInvite(null);
                qc.invalidateQueries({ queryKey: ['shop-staff', shopId] });
              }}>
              <Text style={styles.qrCloseText}>Yopish</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/**
 * Pre-QR setup step: pick a system preset, one of the shop's own saved
 * custom presets, or hand-toggle individual permissions — all three
 * resolve to a single request body createStaffInvitation understands.
 * Optionally save the chosen permission set as a new reusable preset.
 */
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
  const qc = useQueryClient();
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('none');
  const [manuallyEdited, setManuallyEdited] = useState(false);
  const [showPerms, setShowPerms] = useState(false);
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Fresh state every time the modal is (re)opened.
  useEffect(() => {
    if (!visible) return;
    setRoleName('');
    setPermissions([]);
    setSelectedKey('none');
    setManuallyEdited(false);
    setShowPerms(false);
    setSaveAsPreset(false);
    setPresetName('');
  }, [visible]);

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

  const pickPreset = (key: string) => {
    setSelectedKey(key);
    setManuallyEdited(false);
    if (key === 'none') {
      setPermissions([]);
      return;
    }
    if (key.startsWith('custom:')) {
      const found = customPresets.find((p) => p.id === key.slice(7));
      setPermissions(found ? [...found.permissions] : []);
      setRoleName((prev) => prev || found?.name || '');
      return;
    }
    setPermissions([...(PRESET_PERMISSIONS[key as Exclude<StaffPreset, 'custom'>] ?? [])]);
  };

  const togglePerm = (key: string) => {
    setManuallyEdited(true);
    setSelectedKey('');
    setPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  };

  const confirmDeletePreset = (p: StaffPresetDto) => {
    Alert.alert('Shablonni o‘chirish', `"${p.name}" shablonini o‘chirasizmi?`, [
      { text: 'Bekor', style: 'cancel' },
      {
        text: 'O‘chirish',
        style: 'destructive',
        onPress: () => {
          if (selectedKey === `custom:${p.id}`) pickPreset('none');
          deletePresetMutation.mutate(p.id);
        },
      },
    ]);
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
    const body: GrantBody = { customRoleName: roleName.trim() || undefined };
    if (!manuallyEdited && selectedKey.startsWith('custom:')) {
      body.customPresetId = selectedKey.slice(7);
    } else if (!manuallyEdited && selectedKey !== 'none' && selectedKey !== '') {
      body.preset = selectedKey as StaffPreset;
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
          <Text style={styles.qrTitle}>Yangi xodim</Text>
          <ScrollView contentContainerStyle={{ gap: Spacing.three }} showsVerticalScrollIndicator={false}>
            <Text style={styles.setupHint}>
              Boshlang‘ich ruxsatlarni tanlang — keyinchalik istalgan vaqt o‘zgartirishingiz mumkin.
            </Text>

            <Text style={styles.presetLabel}>Lavozim nomi (ixtiyoriy)</Text>
            <TextInput
              style={styles.input}
              value={roleName}
              onChangeText={setRoleName}
              placeholder="Masalan: Kechki kassir"
              placeholderTextColor={Brand.gray400}
            />

            <Text style={styles.presetLabel}>Shablon tanlang</Text>
            <View style={styles.presetRow}>
              <Text
                onPress={() => pickPreset('none')}
                style={[styles.presetChip, selectedKey === 'none' && styles.presetChipActive]}>
                Ruxsatsiz
              </Text>
              {PRESETS.map((p) => (
                <Text
                  key={p.key}
                  onPress={() => pickPreset(p.key)}
                  style={[styles.presetChip, selectedKey === p.key && styles.presetChipActive]}>
                  {p.label}
                </Text>
              ))}
            </View>

            {customPresets.length > 0 && (
              <>
                <Text style={styles.presetLabel}>Sizning shablonlaringiz</Text>
                <View style={styles.presetRow}>
                  {customPresets.map((p) => (
                    <View key={p.id} style={styles.customPresetChipWrap}>
                      <Text
                        onPress={() => pickPreset(`custom:${p.id}`)}
                        style={[styles.presetChip, selectedKey === `custom:${p.id}` && styles.presetChipActive]}>
                        {p.name}
                      </Text>
                      <Pressable hitSlop={8} onPress={() => confirmDeletePreset(p)} style={styles.presetDeleteBtn}>
                        <Text style={styles.presetDeleteX}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Pressable style={styles.expandRow} onPress={() => setShowPerms((v) => !v)}>
              <Text style={styles.expandText}>
                Ruxsatlarni ko‘rish/sozlash ({permissions.length}) {showPerms ? '▲' : '▼'}
              </Text>
            </Pressable>

            {showPerms && PERMISSION_GROUPS.map((group) => (
              <View key={group.title} style={styles.permGroup}>
                <Text style={styles.permGroupTitle}>{group.title}</Text>
                {group.items.map((item) => (
                  <View key={item.key} style={styles.permRow}>
                    <Text style={styles.permLabel}>{item.label}</Text>
                    <Switch
                      value={permissions.includes(item.key)}
                      onValueChange={() => togglePerm(item.key)}
                      trackColor={{ true: Brand.success }}
                    />
                  </View>
                ))}
              </View>
            ))}

            <Pressable style={styles.saveAsRow} onPress={() => setSaveAsPreset((v) => !v)}>
              <Switch value={saveAsPreset} onValueChange={setSaveAsPreset} trackColor={{ true: Brand.success }} />
              <Text style={styles.saveAsLabel}>Shu tanlovni shablon sifatida saqlash</Text>
            </Pressable>
            {saveAsPreset && (
              <TextInput
                style={styles.input}
                value={presetName}
                onChangeText={setPresetName}
                placeholder="Shablon nomi (masalan: Kechki kassir)"
                placeholderTextColor={Brand.gray400}
              />
            )}
          </ScrollView>

          <View style={styles.setupBtnRow}>
            <Pressable style={styles.setupCancelBtn} onPress={onCancel}>
              <Text style={styles.setupCancelText}>Bekor</Text>
            </Pressable>
            <Pressable
              style={[styles.setupSubmitBtn, (pending || savePresetMutation.isPending) && { opacity: 0.6 }]}
              disabled={pending || savePresetMutation.isPending || (saveAsPreset && !presetName.trim())}
              onPress={handleSubmit}>
              <Text style={styles.setupSubmitText}>
                {pending || savePresetMutation.isPending ? 'Yaratilmoqda…' : 'QR yaratish'}
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
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const update = useMutation({
    mutationFn: async (body: Partial<Pick<StaffMember, 'permissions' | 'preset' | 'isActive'>> & { customPresetId?: string }) => {
      await api.patch(`/seller/shops/${shopId}/staff/${member.id}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop-staff', shopId] }),
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

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
          <Text style={styles.name}>{member.name ?? 'Xodim'}</Text>
          <Text style={styles.phone}>{member.phone}</Text>
        </View>
        <View style={styles.roleTag}>
          <Text style={styles.roleText}>
            {member.preset === 'custom' && member.customRoleName ? member.customRoleName : PRESET_LABELS[member.preset]}
          </Text>
        </View>
      </View>

      <Pressable style={styles.expandRow} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.expandText}>
          Ruxsatlar ({member.permissions.length}) {expanded ? '▲' : '▼'}
        </Text>
        <Pressable
          onPress={() =>
            Alert.alert('O‘chirish', `${member.name ?? 'Xodim'}ni do‘kondan chiqarasizmi?`, [
              { text: 'Bekor', style: 'cancel' },
              {
                text: 'Chiqarish',
                style: 'destructive',
                onPress: () => update.mutate({ isActive: false }),
              },
            ])
          }>
          <Text style={styles.removeText}>Chiqarish</Text>
        </Pressable>
      </Pressable>

      {expanded && (
        <View style={styles.permArea}>
          <Text style={styles.presetLabel}>Tayyor rol:</Text>
          <View style={styles.presetRow}>
            {PRESETS.map((p) => (
              <Text
                key={p.key}
                onPress={() => update.mutate({ preset: p.key as StaffPreset })}
                style={[styles.presetChip, member.preset === p.key && styles.presetChipActive]}>
                {p.label}
              </Text>
            ))}
          </View>

          {customPresets.length > 0 && (
            <>
              <Text style={styles.presetLabel}>Saqlangan shablonlar:</Text>
              <View style={styles.presetRow}>
                {customPresets.map((p) => (
                  <Text
                    key={p.id}
                    onPress={() => update.mutate({ customPresetId: p.id })}
                    style={[
                      styles.presetChip,
                      member.preset === 'custom' && member.customRoleName === p.name && styles.presetChipActive,
                    ]}>
                    {p.name}
                  </Text>
                ))}
              </View>
            </>
          )}

          {PERMISSION_GROUPS.map((group) => (
            <View key={group.title} style={styles.permGroup}>
              <Text style={styles.permGroupTitle}>{group.title}</Text>
              {group.items.map((item) => (
                <View key={item.key} style={styles.permRow}>
                  <Text style={styles.permLabel}>{item.label}</Text>
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
  hint: { fontSize: 13, color: Brand.gray600, lineHeight: 19 },
  addBtn: {
    backgroundColor: Brand.red,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: { color: Brand.white, fontWeight: '800', fontSize: 15 },
  empty: { textAlign: 'center', color: Brand.gray600, marginTop: 30 },
  card: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
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
  expandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Brand.gray100,
    paddingTop: Spacing.three,
  },
  expandText: { fontSize: 14, fontWeight: '700', color: Brand.red },
  removeText: { fontSize: 13, fontWeight: '700', color: Brand.gray600 },
  permArea: { gap: Spacing.three },
  presetLabel: { fontSize: 13, color: Brand.gray600, fontWeight: '600' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Brand.gray50,
    borderWidth: 1,
    borderColor: Brand.gray200,
    fontSize: 13,
    color: Brand.gray800,
    overflow: 'hidden',
  },
  presetChipActive: { backgroundColor: Brand.red, color: Brand.white, borderColor: Brand.red, fontWeight: '700' },
  customPresetChipWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  presetDeleteBtn: {
    marginLeft: -22,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  presetDeleteX: { fontSize: 12, color: Brand.gray600, fontWeight: '700' },
  permGroup: { gap: 2 },
  permGroupTitle: { fontSize: 12, fontWeight: '800', color: Brand.red, textTransform: 'uppercase', marginTop: Spacing.two },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  permLabel: { fontSize: 14, color: Brand.gray800, flex: 1, paddingRight: Spacing.three },

  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  qrWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  qrCard: {
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: 340,
  },
  qrTitle: { fontSize: 18, fontWeight: '800', color: Brand.black },
  qrSub: { fontSize: 13, color: Brand.gray600, textAlign: 'center' },
  qrBox: { padding: Spacing.four, backgroundColor: Brand.white, borderRadius: Radius.md },
  qrRegen: { paddingVertical: 8 },
  qrRegenText: { color: Brand.red, fontWeight: '700', fontSize: 14 },
  qrClose: {
    backgroundColor: Brand.red,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  qrCloseText: { color: Brand.white, fontWeight: '800', fontSize: 15 },

  setupWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  setupCard: {
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: Spacing.five,
    gap: Spacing.three,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
  },
  setupHint: { fontSize: 13, color: Brand.gray600, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: Brand.gray200,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Brand.black,
  },
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
    alignItems: 'center',
    backgroundColor: Brand.red,
  },
  setupSubmitText: { color: Brand.white, fontWeight: '800', fontSize: 14 },
});
