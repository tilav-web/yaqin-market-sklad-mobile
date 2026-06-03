import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, extractErrorMessage } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface DaySlot {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}
interface Holiday {
  date: string;
  reason?: string;
}

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  readonly initialHours?: DaySlot[];
  readonly initialHolidays?: Holiday[];
  readonly onClose: () => void;
}

// dayOfWeek matches JS getDay(): 0 = Sunday.
const DAY_LABELS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

function defaultHours(): DaySlot[] {
  return DAY_LABELS.map((_, dayOfWeek) => ({ dayOfWeek, openTime: '09:00', closeTime: '21:00', isOpen: true }));
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function WorkingHoursModal({ visible, shopId, initialHours, initialHolidays, onClose }: Props) {
  const qc = useQueryClient();
  const [hours, setHours] = useState<DaySlot[]>(
    initialHours && initialHours.length === 7
      ? [...initialHours].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      : defaultHours(),
  );
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays ?? []);
  const [newHoliday, setNewHoliday] = useState('');

  const setDay = (i: number, patch: Partial<DaySlot>) =>
    setHours((h) => h.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const addHoliday = () => {
    const d = newHoliday.trim();
    if (!DATE_RE.test(d)) {
      Alert.alert('Xato', 'Sana YYYY-MM-DD ko‘rinishida bo‘lsin');
      return;
    }
    if (!holidays.some((h) => h.date === d)) setHolidays((hs) => [...hs, { date: d }]);
    setNewHoliday('');
  };

  const save = useMutation({
    mutationFn: async () => {
      for (const d of hours) {
        if (d.isOpen && (!TIME_RE.test(d.openTime) || !TIME_RE.test(d.closeTime))) {
          throw new Error(`${DAY_LABELS[d.dayOfWeek]}: vaqt HH:MM bo‘lsin`);
        }
      }
      await api.patch(`/seller/shops/${shopId}`, { workingHours: hours, holidays });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-shop', shopId] });
      Alert.alert('Saqlandi', 'Ish vaqti yangilandi');
      onClose();
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Ish vaqti</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {hours.map((d, i) => (
              <View key={d.dayOfWeek} style={styles.dayRow}>
                <View style={styles.dayHead}>
                  <Text style={styles.dayName}>{DAY_LABELS[d.dayOfWeek]}</Text>
                  <Switch
                    value={d.isOpen}
                    onValueChange={(v) => setDay(i, { isOpen: v })}
                    trackColor={{ true: colors.feedback.success }}
                    thumbColor={colors.bg.surface}
                  />
                </View>
                {d.isOpen ? (
                  <View style={styles.timeRow}>
                    <TextInput
                      style={styles.timeInput}
                      value={d.openTime}
                      onChangeText={(t) => setDay(i, { openTime: t })}
                      placeholder="09:00"
                      placeholderTextColor={colors.text.hint}
                      maxLength={5}
                    />
                    <Text style={styles.dash}>—</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={d.closeTime}
                      onChangeText={(t) => setDay(i, { closeTime: t })}
                      placeholder="21:00"
                      placeholderTextColor={colors.text.hint}
                      maxLength={5}
                    />
                  </View>
                ) : (
                  <Text style={styles.closedLabel}>Dam olish kuni</Text>
                )}
              </View>
            ))}

            <Text style={styles.sectionTitle}>Bayram / yopiq kunlar</Text>
            <View style={styles.holidayAdd}>
              <TextInput
                style={styles.holidayInput}
                value={newHoliday}
                onChangeText={setNewHoliday}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text.hint}
                maxLength={10}
              />
              <Pressable style={styles.addBtn} onPress={addHoliday}>
                <Plus size={18} color={colors.text.onPrimary} strokeWidth={2.6} />
              </Pressable>
            </View>
            {holidays.map((h) => (
              <View key={h.date} style={styles.holidayRow}>
                <Text style={styles.holidayDate}>{h.date}</Text>
                <Pressable onPress={() => setHolidays((hs) => hs.filter((x) => x.date !== h.date))} hitSlop={8}>
                  <X size={16} color={colors.text.danger} strokeWidth={2.4} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <Pressable style={[styles.saveBtn, save.isPending && { opacity: 0.6 }]} disabled={save.isPending} onPress={() => save.mutate()}>
            <Text style={styles.saveText}>{save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  title: { ...typography.h4, color: colors.text.primary },
  closeBtn: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.bg.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: layout.screenPadding, gap: spacing.sm, paddingBottom: spacing['3xl'] },
  dayRow: { backgroundColor: colors.bg.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle, gap: spacing.sm },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { ...typography.bodyStrong, color: colors.text.primary },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timeInput: {
    flex: 1,
    textAlign: 'center',
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: 10,
    ...typography.bodyStrong,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  dash: { ...typography.body, color: colors.text.secondary },
  closedLabel: { ...typography.bodySmall, color: colors.text.tertiary },
  sectionTitle: { ...typography.overline, color: colors.text.secondary, marginTop: spacing.md },
  holidayAdd: { flexDirection: 'row', gap: spacing.sm },
  holidayInput: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  addBtn: { width: 48, borderRadius: radius.md, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  holidayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle },
  holidayDate: { ...typography.bodySmall, color: colors.text.primary },
  footer: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, paddingBottom: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.subtle, backgroundColor: colors.bg.surface },
  saveBtn: { height: layout.buttonHeight.md, borderRadius: radius.lg, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { ...typography.body, fontWeight: '700', color: colors.text.onPrimary },
});
