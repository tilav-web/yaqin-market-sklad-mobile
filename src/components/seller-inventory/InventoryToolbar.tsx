import {
  ClipboardCheck,
  FileSpreadsheet,
  ScanLine,
  Search,
  Tag,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { tr } from '@/i18n';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface InventoryToolbarProps {
  searchInput: string;
  onSearchChange: (text: string) => void;
  lowOnly: boolean;
  onToggleLowOnly: () => void;
  onOpenBulkPrice: () => void;
  onOpenExcel: () => void;
  onOpenScanner: () => void;
  onOpenCount: () => void;
}

export function InventoryToolbar({
  searchInput,
  onSearchChange,
  lowOnly,
  onToggleLowOnly,
  onOpenBulkPrice,
  onOpenExcel,
  onOpenScanner,
  onOpenCount,
}: InventoryToolbarProps) {
  return (
    <View style={styles.toolbar}>
      <View style={styles.searchBox}>
        <Search size={17} color={colors.text.tertiary} strokeWidth={2.2} />
        <TextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={onSearchChange}
          placeholder={tr('inv.searchPlaceholder')}
          placeholderTextColor={colors.text.hint}
          returnKeyType="search"
        />
        {searchInput.length > 0 ? (
          <Pressable onPress={() => onSearchChange('')} hitSlop={8}>
            <Text style={styles.clearSearch}>✕</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.toolbarActions}>
        <Pressable
          onPress={onToggleLowOnly}
          style={[styles.lowChip, lowOnly && styles.lowChipActive]}
        >
          <Text style={[styles.lowChipText, lowOnly && styles.lowChipTextActive]}>
            {tr('inv.lowOnlyChip')}
          </Text>
        </Pressable>
        <Pressable onPress={onOpenBulkPrice} style={styles.iconBtn}>
          <Tag size={18} color={colors.brand.primary} strokeWidth={2.2} />
        </Pressable>
        <Pressable onPress={onOpenExcel} style={styles.iconBtn}>
          <FileSpreadsheet size={18} color={colors.brand.primary} strokeWidth={2.2} />
        </Pressable>
        <Pressable onPress={onOpenScanner} style={styles.iconBtn}>
          <ScanLine size={18} color={colors.brand.primary} strokeWidth={2.2} />
        </Pressable>
        <Pressable onPress={onOpenCount} style={styles.iconBtn}>
          <ClipboardCheck size={18} color={colors.brand.primary} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    ...typography.body,
    color: colors.text.primary,
  },
  clearSearch: {
    ...typography.body,
    color: colors.text.tertiary,
    paddingHorizontal: spacing.xs,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lowChip: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  lowChipActive: {
    backgroundColor: colors.feedback.warning,
    borderColor: colors.feedback.warning,
  },
  lowChipText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  lowChipTextActive: {
    color: colors.text.onPrimary,
  },
});
