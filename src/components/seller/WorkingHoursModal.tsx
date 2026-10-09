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
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr, type TranslationKey } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { colors } from '@/theme';

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
const DAY_LABEL_KEYS: TranslationKey[] = ['day.sun', 'day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat'];

function defaultHours(): DaySlot[] {
  return DAY_LABEL_KEYS.map((_, dayOfWeek) => ({ dayOfWeek, openTime: '09:00', closeTime: '21:00', isOpen: true }));
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
      Alert.alert(tr('common.error'), tr('workHours.badDate'));
      return;
    }
    if (!holidays.some((h) => h.date === d)) setHolidays((hs) => [...hs, { date: d }]);
    setNewHoliday('');
  };

  const save = useMutation({
    mutationFn: async () => {
      for (const d of hours) {
        if (d.isOpen && (!TIME_RE.test(d.openTime) || !TIME_RE.test(d.closeTime))) {
          throw new Error(tr('workHours.badTime', { day: tr(DAY_LABEL_KEYS[d.dayOfWeek]) }));
        }
      }
      await api.patch(`/seller/shops/${shopId}`, { workingHours: hours, holidays });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-shop', shopId] });
      Alert.alert(tr('common.saved'), tr('workHours.updated'));
      onClose();
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-bg-canvas" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <Text className="text-xl font-bold text-text-primary">{tr('workHours.title')}</Text>
          <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-bg-surface-muted items-center justify-center">
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {hours.map((d, i) => (
              <View key={d.dayOfWeek} className="bg-bg-surface rounded-xl p-3.5 border border-border-subtle gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-text-primary">{tr(DAY_LABEL_KEYS[d.dayOfWeek])}</Text>
                  <Switch
                    value={d.isOpen}
                    onValueChange={(v) => setDay(i, { isOpen: v })}
                    trackColor={{ true: colors.feedback.success }}
                    thumbColor={colors.bg.surface}
                  />
                </View>
                {d.isOpen ? (
                  <View className="flex-row items-center gap-3">
                    <TextInput
                      className="flex-1 text-center bg-bg-surface-muted rounded-xl py-2.5 text-base font-semibold text-text-primary border border-border-default"
                      value={d.openTime}
                      onChangeText={(t) => setDay(i, { openTime: t })}
                      placeholder="09:00"
                      placeholderTextColor={colors.text.hint}
                      maxLength={5}
                    />
                    <Text className="text-base text-text-secondary">—</Text>
                    <TextInput
                      className="flex-1 text-center bg-bg-surface-muted rounded-xl py-2.5 text-base font-semibold text-text-primary border border-border-default"
                      value={d.closeTime}
                      onChangeText={(t) => setDay(i, { closeTime: t })}
                      placeholder="21:00"
                      placeholderTextColor={colors.text.hint}
                      maxLength={5}
                    />
                  </View>
                ) : (
                  <Text className="text-sm text-text-tertiary">{tr('workHours.dayOff')}</Text>
                )}
              </View>
            ))}

            <Text className="text-xs uppercase tracking-wider font-bold text-text-secondary mt-3">{tr('workHours.holidays')}</Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 bg-bg-surface rounded-xl px-3 py-3 text-base text-text-primary border border-border-default"
                value={newHoliday}
                onChangeText={setNewHoliday}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text.hint}
                maxLength={10}
              />
              <Pressable className="w-12 rounded-xl bg-brand-primary items-center justify-center active:opacity-80" onPress={addHoliday}>
                <Plus size={18} color={colors.text.onPrimary} strokeWidth={2.6} />
              </Pressable>
            </View>
            {holidays.map((h) => (
              <View key={h.date} className="flex-row items-center justify-between bg-bg-surface rounded-xl p-3 border border-border-subtle">
                <Text className="text-sm text-text-primary">{h.date}</Text>
                <Pressable onPress={() => setHolidays((hs) => hs.filter((x) => x.date !== h.date))} hitSlop={8}>
                  <X size={16} color={colors.text.danger} strokeWidth={2.4} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>

        <View className="px-4 pt-3 pb-2 border-t border-border-subtle bg-bg-surface">
          <Pressable
            className={`h-12 rounded-2xl bg-brand-primary items-center justify-center ${save.isPending ? 'opacity-60' : 'active:opacity-85'}`}
            disabled={save.isPending}
            onPress={() => save.mutate()}
          >
            <Text className="text-base font-bold text-text-on-primary">{save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
