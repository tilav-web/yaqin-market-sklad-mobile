import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { Brand, Radius, Spacing } from '@/constants/theme';
import {
  PERMISSION_GROUPS,
  PRESETS,
  PRESET_LABELS,
  StaffMember,
  StaffPreset,
} from '@/constants/staffPermissions';
import { api, extractErrorMessage } from '@/lib/api';

interface InviteResp {
  token: string;
  expiresAt: string;
  shopName: string;
}

export default function StaffScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const [invite, setInvite] = useState<InviteResp | null>(null);

  const staffQuery = useQuery({
    queryKey: ['shop-staff', shopId],
    queryFn: async () => {
      const res = await api.get<StaffMember[]>(`/seller/shops/${shopId}/staff`);
      return res.data;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<InviteResp>(`/seller/shops/${shopId}/staff/invitations`);
      return res.data;
    },
    onSuccess: (data) => setInvite(data),
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const active = (staffQuery.data ?? []).filter((s) => s.isActive);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.hint}>
          Yangi xodim qo‘shish uchun QR yarating va xodim uni ilova orqali skanlasin. Yangi xodimda
          hech qanday ruxsat bo‘lmaydi — kerakli ruxsatlarni o‘zingiz berasiz.
        </Text>

        <Pressable
          style={styles.addBtn}
          onPress={() => inviteMutation.mutate()}
          disabled={inviteMutation.isPending}>
          <Text style={styles.addBtnText}>
            {inviteMutation.isPending ? 'Yaratilmoqda…' : '＋ Yangi xodim qo‘shish (QR)'}
          </Text>
        </Pressable>

        {staffQuery.isLoading ? (
          <ActivityIndicator color={Brand.red} style={{ marginTop: 30 }} />
        ) : active.length === 0 ? (
          <Text style={styles.empty}>Hozircha xodimlar yo‘q</Text>
        ) : (
          active.map((s) => <StaffCard key={s.id} shopId={shopId} member={s} />)
        )}
      </ScrollView>

      <Modal visible={!!invite} transparent animationType="fade" onRequestClose={() => setInvite(null)}>
        <Pressable style={styles.backdrop} onPress={() => setInvite(null)} />
        <View style={styles.qrWrap} pointerEvents="box-none">
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Xodimni qo‘shish</Text>
            <Text style={styles.qrSub}>Xodim bu QR ni ilova orqali skanlasin (15 daqiqa amal qiladi)</Text>
            <View style={styles.qrBox}>
              {invite && (
                <QRCode value={`yaqinmarket://staff/join?token=${invite.token}`} size={220} />
              )}
            </View>
            <Pressable style={styles.qrRegen} onPress={() => inviteMutation.mutate()}>
              <Text style={styles.qrRegenText}>Yangi QR</Text>
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

function StaffCard({ shopId, member }: { shopId: string; member: StaffMember }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const update = useMutation({
    mutationFn: async (body: Partial<Pick<StaffMember, 'permissions' | 'preset' | 'isActive'>>) => {
      await api.patch(`/seller/shops/${shopId}/staff/${member.id}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop-staff', shopId] }),
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
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
          <Text style={styles.roleText}>{PRESET_LABELS[member.preset]}</Text>
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
  },
  presetChipActive: { backgroundColor: Brand.red, color: Brand.white, borderColor: Brand.red, fontWeight: '700' },
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
});
