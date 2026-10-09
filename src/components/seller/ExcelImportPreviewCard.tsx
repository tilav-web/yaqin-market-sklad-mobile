import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  name: string;
  barcode?: string;
  categoryId?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  unitType?: string;
  unitSize?: number;
  lowStockThreshold?: number;
  criticalThreshold?: number;
  expiryDate?: string;
  globalProductId?: string;
  warnings: string[];
}

export interface ImportPreviewResult {
  willCreate: number;
  errors: ImportError[];
  rows: ImportPreviewRow[];
}

interface ExcelImportPreviewCardProps {
  preview: ImportPreviewResult;
  onCancel: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
}

export function ExcelImportPreviewCard({
  preview,
  onCancel,
  onConfirm,
  isConfirming,
}: ExcelImportPreviewCardProps) {
  const { tr } = useTranslation();

  return (
    <View className="bg-canvas rounded-2xl p-4 gap-3 border border-border-default mt-1">
      <Text className="text-sm font-bold text-text-primary">
        {tr('excel.previewSummary', {
          count: preview.willCreate,
          errors: preview.errors.length,
        })}
      </Text>

      {preview.errors.length > 0 && (
        <View className="bg-red-500/10 rounded-xl p-3 gap-1.5 border border-red-500/30">
          {preview.errors.slice(0, 20).map((err, i) => (
            <View key={`${err.row}-${i}`} className="flex-row items-center gap-1.5">
              <AlertTriangle size={13} color={colors.feedback.danger} strokeWidth={2.2} />
              <Text className="text-xs text-red-600 flex-1">
                {tr('excel.rowLabel', { row: err.row })}: {err.message}
              </Text>
            </View>
          ))}
          {preview.errors.length > 20 && (
            <Text className="text-[11px] text-text-tertiary text-center font-bold">
              {tr('excel.moreErrors', { count: preview.errors.length - 20 })}
            </Text>
          )}
        </View>
      )}

      {preview.rows.length > 0 && (
        <View className="gap-1.5">
          {preview.rows.slice(0, 8).map((r) => (
            <View key={r.rowNumber} className="flex-row items-center gap-1.5">
              <CheckCircle2 size={13} color={colors.feedback.success} strokeWidth={2.2} />
              <Text className="text-xs text-text-secondary flex-1" numberOfLines={1}>
                {r.name} — {r.price.toLocaleString('ru-RU')} {tr('common.som')},{' '}
                {tr('excel.qtyPcs', { count: r.stock })}
              </Text>
            </View>
          ))}
          {preview.rows.length > 8 && (
            <Text className="text-[11px] text-text-tertiary text-center font-bold">
              {tr('excel.moreProducts', { count: preview.rows.length - 8 })}
            </Text>
          )}
        </View>
      )}

      <View className="flex-row gap-2.5 mt-1">
        <Pressable
          className="flex-1 h-11 rounded-xl border border-border-default bg-surface items-center justify-center active:opacity-70"
          onPress={onCancel}
        >
          <Text className="text-sm font-bold text-text-secondary">{tr('common.cancel')}</Text>
        </Pressable>
        <Pressable
          className={`flex-1 h-11 rounded-xl items-center justify-center ${
            !preview.rows.length || isConfirming ? 'bg-border-strong' : 'bg-brand-primary active:opacity-90'
          }`}
          disabled={!preview.rows.length || isConfirming}
          onPress={onConfirm}
        >
          {isConfirming ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-sm font-bold text-white">{tr('common.confirm')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
