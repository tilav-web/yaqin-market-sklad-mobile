import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

interface Props {
  readonly visible: boolean;
  /** Currently selected date as 'YYYY-MM-DD', or null/undefined for none. */
  readonly value?: string | null;
  readonly onConfirm: (isoDate: string) => void;
  readonly onClose: () => void;
  readonly title?: string;
}

const WEEKDAYS = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

// Wide enough for birth dates (a century back) as well as near-future dates
// (promotion/expiry fields also use this picker).
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_MIN = CURRENT_YEAR - 100;
const YEAR_MAX = CURRENT_YEAR + 10;
const YEARS: number[] = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MAX - i);
const YEAR_COLUMNS = 4;
const YEAR_ROW_HEIGHT = 48;

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Lightweight, dependency-free date picker (no `@react-native-community/
 * datetimepicker` in this project yet — this avoids adding a new native
 * module that would need a dev-client rebuild). Replaces raw "YYYY-MM-DD"
 * free-text date fields (promotions start/end, stock-receive expiry, birth
 * date) with a simple month-grid picker built from the same primitives as
 * the rest of the app's modals. Tapping the "Month Year" header jumps to a
 * scrollable year grid — flipping month-by-month to reach a birth year
 * decades back would otherwise take dozens of taps.
 */
export function DatePickerModal({ visible, value, onConfirm, onClose, title }: Props) {
  const [viewDate, setViewDate] = useState(() => parseIso(value ?? '') ?? new Date());
  const [selected, setSelected] = useState<string | null>(value ?? null);
  const [mode, setMode] = useState<'calendar' | 'year'>('calendar');

  // Re-sync to the field's current value each time the picker opens.
  useEffect(() => {
    if (visible) {
      const parsed = parseIso(value ?? '');
      setViewDate(parsed ?? new Date());
      setSelected(value ?? null);
      setMode('calendar');
    }
  }, [visible, value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const pickYear = (y: number) => {
    setViewDate(new Date(y, month, 1));
    setMode('calendar');
  };

  const yearIndex = Math.max(0, YEARS.indexOf(year));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.wrap} pointerEvents="box-none">
        <View style={styles.card}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <View style={styles.header}>
            {mode === 'calendar' ? (
              <Pressable style={styles.navBtn} onPress={() => setViewDate(new Date(year, month - 1, 1))} hitSlop={8}>
                <ChevronLeft size={20} color={colors.brand.primary} strokeWidth={2.4} />
              </Pressable>
            ) : (
              <View style={styles.navBtn} />
            )}
            <Pressable onPress={() => setMode(mode === 'calendar' ? 'year' : 'calendar')} hitSlop={8}>
              <Text style={styles.headerText}>
                {mode === 'calendar' ? `${MONTHS[month]} ${year}` : 'Yilni tanlang'}
              </Text>
            </Pressable>
            {mode === 'calendar' ? (
              <Pressable style={styles.navBtn} onPress={() => setViewDate(new Date(year, month + 1, 1))} hitSlop={8}>
                <ChevronRight size={20} color={colors.brand.primary} strokeWidth={2.4} />
              </Pressable>
            ) : (
              <View style={styles.navBtn} />
            )}
          </View>

          {mode === 'year' ? (
            <FlatList
              data={YEARS}
              keyExtractor={(y) => String(y)}
              numColumns={YEAR_COLUMNS}
              initialScrollIndex={Math.floor(yearIndex / YEAR_COLUMNS)}
              getItemLayout={(_, index) => ({
                length: YEAR_ROW_HEIGHT,
                offset: YEAR_ROW_HEIGHT * Math.floor(index / YEAR_COLUMNS),
                index,
              })}
              style={styles.yearList}
              renderItem={({ item: y }) => {
                const active = y === year;
                return (
                  <Pressable
                    style={[styles.yearCell, active && styles.yearCellActive]}
                    onPress={() => pickYear(y)}>
                    <Text style={[styles.yearText, active && styles.yearTextActive]}>{y}</Text>
                  </Pressable>
                );
              }}
            />
          ) : (
            <>
              <View style={styles.weekRow}>
                {WEEKDAYS.map((w) => (
                  <Text key={w} style={styles.weekday}>
                    {w}
                  </Text>
                ))}
              </View>

              <View style={styles.grid}>
                {cells.map((day, i) => {
                  if (day === null) return <View key={`empty-${i}`} style={styles.cell} />;
                  const iso = toIso(year, month, day);
                  const active = selected === iso;
                  return (
                    <Pressable
                      key={iso}
                      style={[styles.cell, active && styles.cellActive]}
                      onPress={() => setSelected(iso)}>
                      <Text style={[styles.cellText, active && styles.cellTextActive]}>{day}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Bekor qilish</Text>
            </Pressable>
            {mode === 'calendar' && (
              <Pressable
                style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
                disabled={!selected}
                onPress={() => selected && onConfirm(selected)}>
                <Text style={styles.confirmText}>Tanlash</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...typography.bodyStrong, color: colors.text.primary, textAlign: 'center', marginBottom: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primarySurface,
  },
  headerText: { ...typography.bodyStrong, color: colors.text.primary },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  weekday: { ...typography.caption, color: colors.text.tertiary, fontWeight: '700', width: CELL_SIZE, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  cellActive: { backgroundColor: colors.brand.primary },
  cellText: { ...typography.body, color: colors.text.primary },
  cellTextActive: { color: colors.text.onPrimary, fontWeight: '700' },
  yearList: { maxHeight: YEAR_ROW_HEIGHT * 4.5, marginTop: spacing.xs },
  yearCell: {
    flex: 1 / YEAR_COLUMNS,
    height: YEAR_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearCellActive: {},
  yearText: { ...typography.body, color: colors.text.primary },
  yearTextActive: { color: colors.brand.primary, fontWeight: '800', fontSize: 17 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cancelText: { ...typography.bodyStrong, color: colors.text.secondary },
  confirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
  },
  confirmBtnDisabled: { backgroundColor: colors.border.strong },
  confirmText: { ...typography.bodyStrong, color: colors.text.onPrimary },
});
