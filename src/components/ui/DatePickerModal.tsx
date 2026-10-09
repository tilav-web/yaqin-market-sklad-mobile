import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, radius, typography } from '@/theme';

interface Props {
  readonly visible: boolean;
  /** Currently selected date as 'YYYY-MM-DD', or null/undefined for none. */
  readonly value?: string | null;
  readonly onConfirm: (isoDate: string) => void;
  readonly onClose: () => void;
  readonly title?: string;
  /** Latest selectable date ('YYYY-MM-DD') — e.g. birth date capped to "at least N years old". */
  readonly maxDate?: string;
}

const WEEKDAYS = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_MIN = CURRENT_YEAR - 100;
const YEAR_MAX = CURRENT_YEAR + 10;
const YEARS: number[] = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MAX - i);
const YEAR_COLUMNS = 4;
const YEAR_ROW_HEIGHT = 48;
const CELL_SIZE = 40;

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function DatePickerModal({ visible, value, onConfirm, onClose, title, maxDate }: Props) {
  const { tr } = useTranslation();
  const maxParsed = maxDate ? parseIso(maxDate) : null;
  const [viewDate, setViewDate] = useState(() => parseIso(value ?? '') ?? maxParsed ?? new Date());
  const [selected, setSelected] = useState<string | null>(value ?? null);
  const [mode, setMode] = useState<'calendar' | 'year'>('calendar');

  const syncKey = `${visible}|${value ?? ''}`;
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  if (syncedKey !== syncKey) {
    setSyncedKey(syncKey);
    if (visible) {
      const parsed = parseIso(value ?? '');
      setViewDate(parsed ?? maxParsed ?? new Date());
      setSelected(value ?? null);
      setMode('calendar');
    }
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const viewYm = year * 12 + month;
  const maxYm = maxParsed ? maxParsed.getFullYear() * 12 + maxParsed.getMonth() : null;
  const nextMonthDisabled = maxYm !== null && viewYm >= maxYm;
  const years = maxParsed ? YEARS.filter((y) => y <= maxParsed.getFullYear()) : YEARS;

  const pickYear = (y: number) => {
    let m = month;
    if (maxParsed && y === maxParsed.getFullYear() && m > maxParsed.getMonth()) m = maxParsed.getMonth();
    setViewDate(new Date(y, m, 1));
    setMode('calendar');
  };

  const yearIndex = Math.max(0, years.indexOf(year));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="absolute inset-0 bg-black/45" onPress={onClose} />
      <View className="flex-1 items-center justify-center p-6" pointerEvents="box-none">
        <View
          className="w-full max-w-sm p-4 gap-2"
          style={{ backgroundColor: colors.bg.surface, borderRadius: radius.xl }}>
          {title ? (
            <Text className="text-center mb-1" style={[typography.bodyStrong, { color: colors.text.primary }]}>
              {title}
            </Text>
          ) : null}

          {/* Header navigation */}
          <View className="flex-row items-center justify-between">
            {mode === 'calendar' ? (
              <Pressable
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.brand.primarySurface }}
                onPress={() => setViewDate(new Date(year, month - 1, 1))}
                hitSlop={8}>
                <ChevronLeft size={20} color={colors.brand.primary} strokeWidth={2.4} />
              </Pressable>
            ) : (
              <View className="w-8 h-8" />
            )}

            <Pressable onPress={() => setMode(mode === 'calendar' ? 'year' : 'calendar')} hitSlop={8}>
              <Text style={[typography.bodyStrong, { color: colors.text.primary }]}>
                {mode === 'calendar' ? `${MONTHS[month]} ${year}` : 'Yilni tanlang'}
              </Text>
            </Pressable>

            {mode === 'calendar' ? (
              <Pressable
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: nextMonthDisabled ? colors.bg.surfaceMuted : colors.brand.primarySurface }}
                disabled={nextMonthDisabled}
                onPress={() => setViewDate(new Date(year, month + 1, 1))}
                hitSlop={8}>
                <ChevronRight
                  size={20}
                  color={nextMonthDisabled ? colors.text.hint : colors.brand.primary}
                  strokeWidth={2.4}
                />
              </Pressable>
            ) : (
              <View className="w-8 h-8" />
            )}
          </View>

          {/* Calendar or Year view */}
          {mode === 'year' ? (
            <FlatList
              data={years}
              keyExtractor={(y) => String(y)}
              numColumns={YEAR_COLUMNS}
              initialScrollIndex={Math.floor(yearIndex / YEAR_COLUMNS)}
              getItemLayout={(_, index) => ({
                length: YEAR_ROW_HEIGHT,
                offset: YEAR_ROW_HEIGHT * Math.floor(index / YEAR_COLUMNS),
                index,
              })}
              className="mt-1"
              style={{ maxHeight: YEAR_ROW_HEIGHT * 4.5 }}
              renderItem={({ item: y }) => {
                const active = y === year;
                return (
                  <Pressable
                    className="flex-1 items-center justify-center"
                    style={{ height: YEAR_ROW_HEIGHT }}
                    onPress={() => pickYear(y)}>
                    <Text
                      style={[
                        typography.body,
                        { color: active ? colors.brand.primary : colors.text.primary },
                        active && { fontWeight: '800', fontSize: 17 },
                      ]}>
                      {y}
                    </Text>
                  </Pressable>
                );
              }}
            />
          ) : (
            <>
              {/* Day of week labels */}
              <View className="flex-row justify-between mt-1">
                {WEEKDAYS.map((w) => (
                  <Text
                    key={w}
                    className="text-center"
                    style={[
                      typography.caption,
                      { color: colors.text.tertiary, fontWeight: '700', width: CELL_SIZE },
                    ]}>
                    {w}
                  </Text>
                ))}
              </View>

              {/* Day grid */}
              <View className="flex-row flex-wrap">
                {cells.map((day, i) => {
                  if (day === null) {
                    return <View key={`empty-${i}`} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
                  }
                  const iso = toIso(year, month, day);
                  const active = selected === iso;
                  const disabled = !!maxParsed && viewYm === maxYm && day > maxParsed.getDate();
                  return (
                    <Pressable
                      key={iso}
                      disabled={disabled}
                      className="items-center justify-center rounded-full"
                      style={[
                        { width: CELL_SIZE, height: CELL_SIZE },
                        active && { backgroundColor: colors.brand.primary },
                      ]}
                      onPress={() => setSelected(iso)}>
                      <Text
                        style={[
                          typography.body,
                          {
                            color: active
                              ? colors.text.onPrimary
                              : disabled
                                ? colors.text.hint
                                : colors.text.primary,
                            fontWeight: active ? '700' : '400',
                          },
                        ]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Action buttons */}
          <View className="flex-row gap-2 mt-2">
            <Pressable
              className="flex-1 items-center justify-center py-3 rounded-xl border"
              style={{ borderColor: colors.border.default }}
              onPress={onClose}>
              <Text style={[typography.bodyStrong, { color: colors.text.secondary }]}>
                {tr('common.cancel')}
              </Text>
            </Pressable>
            {mode === 'calendar' && (
              <Pressable
                className="flex-1 items-center justify-center py-3 rounded-xl"
                style={{
                  backgroundColor: selected ? colors.brand.primary : colors.border.strong,
                }}
                disabled={!selected}
                onPress={() => selected && onConfirm(selected)}>
                <Text style={[typography.bodyStrong, { color: colors.text.onPrimary }]}>
                  {tr('common.confirm')}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
