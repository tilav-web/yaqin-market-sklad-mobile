import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { useGlobalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoPermissionNotice } from '@/components/seller/OwnerOnlyNotice';
import { DatePickerModal } from '@/components/ui';
import { tr, useTranslation, type TranslationKey } from '@/i18n';
import { API_URL, api, extractErrorMessage } from '@/lib/api';
import { tokenStorage } from '@/lib/storage';
import { useShopAccess } from '@/lib/useIsShopOwner';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

interface ImportError {
  row: number;
  message: string;
}

/** Mirror of server/src/products/excel/dto/excel.dto.ts#ImportRowDto + the `warnings` preview adds. */
interface ImportPreviewRow {
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

interface ImportPreviewResult {
  willCreate: number;
  errors: ImportError[];
  rows: ImportPreviewRow[];
}

interface ConfirmImportResult {
  created: number;
  failed: ImportError[];
}

type StockStatus = 'low' | 'ok' | 'zero';
const STOCK_FILTERS: { key: StockStatus | undefined; labelKey: TranslationKey }[] = [
  { key: undefined, labelKey: 'excel.filterAll' },
  { key: 'low', labelKey: 'excel.filterLow' },
  { key: 'ok', labelKey: 'excel.filterOk' },
  { key: 'zero', labelKey: 'excel.filterZero' },
];

/**
 * Downloads a shop-scoped `.xlsx` (auth required — reuses the stored access
 * token, same as the axios interceptor in lib/api.ts) straight to the cache
 * directory, then opens the native share sheet so the seller can save it to
 * Files/Drive or open it in Excel. The destination is a Directory (not a
 * named File) so the actual filename comes from the server's
 * `Content-Disposition` header (see excel.controller.ts#sendXlsx).
 */
async function downloadAndShare(path: string, fallbackName: string): Promise<void> {
  const token = await tokenStorage.getAccess();
  const file = await File.downloadFileAsync(`${API_URL}/api${path}`, Paths.cache, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    idempotent: true,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: XLSX_MIME, dialogTitle: fallbackName });
  } else {
    Alert.alert(tr('excel.fileSaved'), file.uri);
  }
}

/**
 * Sklad → Excel import/eksport (SPEC.md §25). Import needs
 * `inventory.product.create` (it creates ProductVariants); each export needs
 * the permission that guards the underlying data (`inventory.view`,
 * `orders.view_all`, `inventory.movement.view`) — owners always pass all of
 * these (shop-access.util.ts#assertShopPermission).
 */
export default function SellerExcelScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const access = useShopAccess(shopId);
  const canImport = access.has('inventory.product.create');
  const canExportInventory = access.has('inventory.view');
  const canExportOrders = access.has('orders.view_all');
  const canExportMovements = access.has('inventory.movement.view');
  const hasAnyAccess = canImport || canExportInventory || canExportOrders || canExportMovements;

  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [stockStatus, setStockStatus] = useState<StockStatus | undefined>(undefined);
  const [ordersRange, setOrdersRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [movementsRange, setMovementsRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [pickingDate, setPickingDate] = useState<null | {
    forRange: 'orders' | 'movements';
    field: 'from' | 'to';
  }>(null);

  const runDownload = async (key: string, path: string, filename: string) => {
    try {
      setBusy(key);
      await downloadAndShare(path, filename);
    } catch (e) {
      Alert.alert(tr('common.error'), extractErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const downloadTemplate = () =>
    runDownload('template', `/seller/shops/${shopId}/products/excel/template`, 'shablon.xlsx');

  const exportInventory = () => {
    const qs = stockStatus ? `?stockStatus=${stockStatus}` : '';
    return runDownload(
      'inventory',
      `/seller/shops/${shopId}/products/excel/export/inventory${qs}`,
      'sklad-holati.xlsx',
    );
  };

  const exportOrders = () => {
    if (!ordersRange.from || !ordersRange.to) {
      Alert.alert(tr('excel.dateNotPicked'), tr('excel.dateNotPickedDesc'));
      return;
    }
    return runDownload(
      'orders',
      `/seller/shops/${shopId}/products/excel/export/orders?from=${ordersRange.from}&to=${ordersRange.to}`,
      'buyurtmalar.xlsx',
    );
  };

  const exportMovements = () => {
    if (!movementsRange.from || !movementsRange.to) {
      Alert.alert(tr('excel.dateNotPicked'), tr('excel.dateNotPickedDesc'));
      return;
    }
    return runDownload(
      'movements',
      `/seller/shops/${shopId}/products/excel/export/movements?from=${movementsRange.from}&to=${movementsRange.to}`,
      'kirim-chiqim-tarixi.xlsx',
    );
  };

  const pickAndPreview = useMutation({
    mutationFn: async (): Promise<ImportPreviewResult | null> => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [XLSX_MIME, 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return null;
      const asset = picked.assets[0];
      const form = new FormData();
      // React Native FormData file shape — same convention as uploadImage() in lib/api.ts.
      form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? XLSX_MIME } as unknown as Blob);
      const res = await api.post<ImportPreviewResult>(
        `/seller/shops/${shopId}/products/excel/import/preview`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data;
    },
    onSuccess: (data) => {
      if (data) setPreview(data);
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const confirmImport = useMutation({
    mutationFn: async (): Promise<ConfirmImportResult> => {
      const rows = (preview?.rows ?? []).map(({ warnings: _warnings, ...row }) => row);
      const res = await api.post<ConfirmImportResult>(
        `/seller/shops/${shopId}/products/excel/import/confirm`,
        { rows },
      );
      return res.data;
    },
    onSuccess: (result) => {
      setPreview(null);
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      Alert.alert(
        tr('excel.importDone'),
        tr('excel.importDoneCount', { count: result.created }) +
          (result.failed.length
            ? tr('excel.importDoneErrors', { count: result.failed.length })
            : ''),
      );
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  if (access.isResolved && !hasAnyAccess) {
    return <NoPermissionNotice />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {canImport && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr('excel.importTitle')}</Text>
            <Text style={styles.sectionHint}>{tr('excel.importHint')}</Text>

            <Pressable style={styles.actionBtn} onPress={downloadTemplate} disabled={busy === 'template'}>
              {busy === 'template' ? (
                <ActivityIndicator color={colors.brand.primary} />
              ) : (
                <Download size={17} color={colors.brand.primary} strokeWidth={2.2} />
              )}
              <Text style={styles.actionBtnText}>{tr('excel.downloadTemplate')}</Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => pickAndPreview.mutate()}
              disabled={pickAndPreview.isPending}>
              {pickAndPreview.isPending ? (
                <ActivityIndicator color={colors.text.onPrimary} />
              ) : (
                <Upload size={17} color={colors.text.onPrimary} strokeWidth={2.2} />
              )}
              <Text style={styles.actionBtnTextPrimary}>{tr('excel.pickFile')}</Text>
            </Pressable>

            {preview && (
              <View style={styles.previewCard}>
                <Text style={styles.previewSummary}>
                  {tr('excel.previewSummary', {
                    count: preview.willCreate,
                    errors: preview.errors.length,
                  })}
                </Text>

                {preview.errors.length > 0 && (
                  <View style={styles.errorList}>
                    {preview.errors.slice(0, 20).map((err, i) => (
                      <View key={`${err.row}-${i}`} style={styles.errorRow}>
                        <AlertTriangle size={13} color={colors.feedback.danger} strokeWidth={2.2} />
                        <Text style={styles.errorText}>
                          {tr('excel.rowLabel', { row: err.row })}: {err.message}
                        </Text>
                      </View>
                    ))}
                    {preview.errors.length > 20 && (
                      <Text style={styles.errorMore}>
                        {tr('excel.moreErrors', { count: preview.errors.length - 20 })}
                      </Text>
                    )}
                  </View>
                )}

                {preview.rows.length > 0 && (
                  <View style={styles.rowsPreview}>
                    {preview.rows.slice(0, 8).map((r) => (
                      <View key={r.rowNumber} style={styles.rowPreviewLine}>
                        <CheckCircle2 size={13} color={colors.feedback.success} strokeWidth={2.2} />
                        <Text style={styles.rowPreviewText} numberOfLines={1}>
                          {r.name} — {r.price.toLocaleString('ru-RU')} {tr('common.som')},{' '}
                          {tr('excel.qtyPcs', { count: r.stock })}
                        </Text>
                      </View>
                    ))}
                    {preview.rows.length > 8 && (
                      <Text style={styles.errorMore}>
                        {tr('excel.moreProducts', { count: preview.rows.length - 8 })}
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.previewActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setPreview(null)}>
                    <Text style={styles.cancelBtnText}>{tr('common.cancel')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.confirmBtn, (!preview.rows.length || confirmImport.isPending) && styles.confirmBtnDisabled]}
                    disabled={!preview.rows.length || confirmImport.isPending}
                    onPress={() => confirmImport.mutate()}>
                    {confirmImport.isPending ? (
                      <ActivityIndicator color={colors.text.onPrimary} />
                    ) : (
                      <Text style={styles.confirmBtnText}>{tr('common.confirm')}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {canExportInventory && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr('excel.inventoryTitle')}</Text>
            <Text style={styles.sectionHint}>{tr('excel.inventoryHint')}</Text>
            <View style={styles.chipRow}>
              {STOCK_FILTERS.map((f) => (
                <Pressable
                  key={f.labelKey}
                  style={[styles.chip, stockStatus === f.key && styles.chipActive]}
                  onPress={() => setStockStatus(f.key)}>
                  <Text style={[styles.chipText, stockStatus === f.key && styles.chipTextActive]}>
                    {tr(f.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.actionBtn} onPress={exportInventory} disabled={busy === 'inventory'}>
              {busy === 'inventory' ? (
                <ActivityIndicator color={colors.brand.primary} />
              ) : (
                <FileSpreadsheet size={17} color={colors.brand.primary} strokeWidth={2.2} />
              )}
              <Text style={styles.actionBtnText}>{tr('excel.exportInventory')}</Text>
            </Pressable>
          </View>
        )}

        {canExportOrders && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr('excel.ordersTitle')}</Text>
            <Text style={styles.sectionHint}>{tr('excel.ordersHint')}</Text>
            <DateRangeRow
              range={ordersRange}
              onPickFrom={() => setPickingDate({ forRange: 'orders', field: 'from' })}
              onPickTo={() => setPickingDate({ forRange: 'orders', field: 'to' })}
            />
            <Pressable style={styles.actionBtn} onPress={exportOrders} disabled={busy === 'orders'}>
              {busy === 'orders' ? (
                <ActivityIndicator color={colors.brand.primary} />
              ) : (
                <FileSpreadsheet size={17} color={colors.brand.primary} strokeWidth={2.2} />
              )}
              <Text style={styles.actionBtnText}>{tr('excel.exportOrders')}</Text>
            </Pressable>
          </View>
        )}

        {canExportMovements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr('excel.movementsTitle')}</Text>
            <Text style={styles.sectionHint}>{tr('excel.movementsHint')}</Text>
            <DateRangeRow
              range={movementsRange}
              onPickFrom={() => setPickingDate({ forRange: 'movements', field: 'from' })}
              onPickTo={() => setPickingDate({ forRange: 'movements', field: 'to' })}
            />
            <Pressable style={styles.actionBtn} onPress={exportMovements} disabled={busy === 'movements'}>
              {busy === 'movements' ? (
                <ActivityIndicator color={colors.brand.primary} />
              ) : (
                <FileSpreadsheet size={17} color={colors.brand.primary} strokeWidth={2.2} />
              )}
              <Text style={styles.actionBtnText}>{tr('excel.exportMovements')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <DatePickerModal
        visible={pickingDate !== null}
        value={
          pickingDate
            ? (pickingDate.forRange === 'orders' ? ordersRange : movementsRange)[pickingDate.field]
            : null
        }
        title={pickingDate?.field === 'from' ? tr('excel.startDate') : tr('excel.endDate')}
        onClose={() => setPickingDate(null)}
        onConfirm={(iso) => {
          if (!pickingDate) return;
          const setter = pickingDate.forRange === 'orders' ? setOrdersRange : setMovementsRange;
          setter((prev) => ({ ...prev, [pickingDate.field]: iso }));
          setPickingDate(null);
        }}
      />
    </SafeAreaView>
  );
}

function DateRangeRow({
  range,
  onPickFrom,
  onPickTo,
}: {
  range: { from: string; to: string };
  onPickFrom: () => void;
  onPickTo: () => void;
}) {
  const { tr } = useTranslation();
  return (
    <View style={styles.dateRow}>
      <Pressable style={styles.dateField} onPress={onPickFrom}>
        <CalendarDays size={15} color={colors.brand.primary} strokeWidth={2.2} />
        <Text style={[styles.dateFieldText, !range.from && styles.dateFieldPlaceholder]}>
          {range.from || tr('excel.from')}
        </Text>
      </Pressable>
      <Text style={styles.dateDash}>—</Text>
      <Pressable style={styles.dateField} onPress={onPickTo}>
        <CalendarDays size={15} color={colors.brand.primary} strokeWidth={2.2} />
        <Text style={[styles.dateFieldText, !range.to && styles.dateFieldPlaceholder]}>
          {range.to || tr('excel.to')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, gap: spacing.lg, paddingBottom: spacing['4xl'] },
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.xs,
  },
  sectionTitle: { ...typography.h4, color: colors.text.primary },
  sectionHint: { ...typography.bodySmall, color: colors.text.secondary, lineHeight: 19 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    backgroundColor: colors.brand.primarySurface,
    marginTop: spacing.xs,
  },
  actionBtnText: { ...typography.bodyStrong, color: colors.brand.primary },
  actionBtnPrimary: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  actionBtnTextPrimary: { ...typography.bodyStrong, color: colors.text.onPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  chipTextActive: { color: colors.text.onPrimary },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.bg.surfaceMuted,
  },
  dateFieldText: { ...typography.bodySmall, color: colors.text.primary },
  dateFieldPlaceholder: { color: colors.text.hint },
  dateDash: { ...typography.body, color: colors.text.tertiary },
  previewCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewSummary: { ...typography.bodyStrong, color: colors.text.primary },
  errorList: { gap: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  errorText: { ...typography.caption, color: colors.feedback.danger, flex: 1 },
  errorMore: { ...typography.caption, color: colors.text.tertiary, fontStyle: 'italic' },
  rowsPreview: { gap: 4 },
  rowPreviewLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowPreviewText: { ...typography.caption, color: colors.text.secondary, flex: 1 },
  previewActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: layout.buttonHeight.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cancelBtnText: { ...typography.bodySmall, fontWeight: '700', color: colors.text.secondary },
  confirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: layout.buttonHeight.sm,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary,
  },
  confirmBtnDisabled: { backgroundColor: colors.border.strong },
  confirmBtnText: { ...typography.bodySmall, fontWeight: '700', color: colors.text.onPrimary },
});
