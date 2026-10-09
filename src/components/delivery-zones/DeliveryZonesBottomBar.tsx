import { Pencil, RotateCcw, Save, X } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing, typography } from '@/theme';
import { ZoneKey } from './types';

interface DeliveryZonesBottomBarProps {
  zone: ZoneKey;
  onSelectZone: (zone: ZoneKey) => void;
  hint: string;
  pencilOn: boolean;
  onTogglePencil: () => void;
  isClosed: boolean;
  vertsCount: number;
  onUndo: () => void;
  onReset: () => void;
  onClosePolygon: () => void;
  onSave: () => void;
  isSaving: boolean;
  dColor: string;
  fColor: string;
  activeColor: string;
}

export function DeliveryZonesBottomBar({
  zone,
  onSelectZone,
  hint,
  pencilOn,
  onTogglePencil,
  isClosed,
  vertsCount,
  onUndo,
  onReset,
  onClosePolygon,
  onSave,
  isSaving,
  dColor,
  fColor,
  activeColor,
}: DeliveryZonesBottomBarProps) {
  return (
    <SafeAreaView style={styles.bottom} edges={['bottom']}>
      {/* Zone toggle + hint in one row */}
      <View style={styles.topRow}>
        {(['delivery', 'free'] as ZoneKey[]).map((z) => {
          const col = z === 'delivery' ? dColor : fColor;
          const active = zone === z;
          return (
            <TouchableOpacity
              key={z}
              style={[styles.chip, active && { borderColor: col, backgroundColor: col + '20' }]}
              onPress={() => onSelectZone(z)}
            >
              <View style={[styles.chipDot, { backgroundColor: col }]} />
              <Text style={[styles.chipText, active && { color: colors.text.primary, fontWeight: '700' }]}>
                {z === 'delivery' ? 'Yetkazib berish' : 'Tekin'}
              </Text>
            </TouchableOpacity>
          );
        })}
        <Text style={styles.hint} numberOfLines={1}>{hint}</Text>
      </View>

      {/* Tool row */}
      <View style={styles.toolRow}>
        <TouchableOpacity
          style={[styles.toolBtn, vertsCount === 0 && styles.disabled]}
          disabled={vertsCount === 0}
          onPress={onUndo}
          hitSlop={4}
        >
          <RotateCcw size={16} color={vertsCount === 0 ? colors.text.hint : colors.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolBtn, vertsCount === 0 && styles.disabled]}
          disabled={vertsCount === 0}
          onPress={onReset}
          hitSlop={4}
        >
          <X size={16} color={vertsCount === 0 ? colors.text.hint : colors.feedback.danger} />
        </TouchableOpacity>

        {pencilOn && vertsCount >= 3 && !isClosed && (
          <TouchableOpacity
            style={[styles.chipBtn, { borderColor: activeColor }]}
            onPress={onClosePolygon}
          >
            <Text style={[styles.chipBtnText, { color: activeColor }]}>Yop</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.pencilBtn,
            pencilOn && { backgroundColor: activeColor, borderColor: activeColor },
            isClosed && styles.disabled,
          ]}
          disabled={isClosed}
          onPress={onTogglePencil}
        >
          <Pencil size={15} color={pencilOn ? '#fff' : activeColor} />
          <Text style={[styles.pencilText, pencilOn && { color: '#fff' }]}>
            {pencilOn ? 'Chizmoqda' : 'Qalam'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
          disabled={isSaving}
          onPress={onSave}
        >
          <Save size={15} color="#fff" />
          <Text style={styles.saveBtnText}>
            {isSaving ? 'Saqlanmoqda…' : 'Saqlash'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
    ...shadow.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.surfaceMuted,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { ...typography.caption, color: colors.text.tertiary, fontSize: 11 },
  hint: {
    flex: 1,
    ...typography.caption,
    color: colors.text.hint,
    fontSize: 11,
    textAlign: 'right',
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  disabled: { opacity: 0.3 },
  chipBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: colors.bg.surface,
  },
  chipBtnText: { fontSize: 13, fontWeight: '700' },
  pencilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  pencilText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
  },
  saveBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
