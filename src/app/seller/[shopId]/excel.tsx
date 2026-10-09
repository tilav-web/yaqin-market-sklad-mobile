import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { useGlobalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  Download,
  FileSpreadsheet,
  Upload,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ExcelDateRangeRow,
  ExcelImportPreviewCard,
  ImportPreviewResult,
} from '@/components/seller';
import { NoPermissionNotice } from '@/components/seller/OwnerOnlyNotice';
import { DatePickerModal } from '@/components/ui';
import { tr, useTranslation, type TranslationKey } from '@/i18n';
import { API_URL, api, extractErrorMessage } from '@/lib/api';
import { tokenStorage } from '@/lib/storage';
import { useShopAccess } from '@/lib/useIsShopOwner';
import { colors } from '@/theme';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

interface ConfirmImportResult {
  created: number;
  failed: { row: number; message: string }[];
}

type StockStatus = 'low' | 'ok' | 'zero';
const STOCK_FILTERS: { key: StockStatus | undefined; labelKey: TranslationKey }[] = [
  { key: undefined, labelKey: 'excel.filterAll' },
  { key: 'low', labelKey: 'excel.filterLow' },
  { key: 'ok', labelKey: 'excel.filterOk' },
  { key: 'zero', labelKey: 'excel.filterZero' },
];

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
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 64 }}>
        {canImport && (
          <View className="bg-surface rounded-2xl p-4 gap-3 border border-border-subtle shadow-sm">
            <Text className="text-base font-bold text-text-primary">{tr('excel.importTitle')}</Text>
            <Text className="text-xs text-text-secondary leading-5">{tr('excel.importHint')}</Text>

            <Pressable
              className="flex-row items-center justify-center gap-2 h-12 rounded-xl border border-brand-primary/30 bg-brand-primary-surface active:opacity-80"
              onPress={downloadTemplate}
              disabled={busy === 'template'}
            >
              {busy === 'template' ? (
                <ActivityIndicator color={colors.brand.primary} />
              ) : (
                <Download size={17} color={colors.brand.primary} strokeWidth={2.2} />
              )}
              <Text className="text-sm font-bold text-brand-primary">{tr('excel.downloadTemplate')}</Text>
            </Pressable>

            <Pressable
              className="flex-row items-center justify-center gap-2 h-12 rounded-xl bg-brand-primary active:opacity-90"
              onPress={() => pickAndPreview.mutate()}
              disabled={pickAndPreview.isPending}
            >
              {pickAndPreview.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Upload size={17} color="#ffffff" strokeWidth={2.2} />
              )}
              <Text className="text-sm font-extrabold text-white">{tr('excel.pickFile')}</Text>
            </Pressable>

            {preview && (
              <ExcelImportPreviewCard
                preview={preview}
                onCancel={() => setPreview(null)}
                onConfirm={() => confirmImport.mutate()}
                isConfirming={confirmImport.isPending}
              />
            )}
          </View>
        )}

        {canExportInventory && (
          <View className="bg-surface rounded-2xl p-4 gap-3 border border-border-subtle shadow-sm">
            <Text className="text-base font-bold text-text-primary">{tr('excel.inventoryTitle')}</Text>
            <Text className="text-xs text-text-secondary leading-5">{tr('excel.inventoryHint')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {STOCK_FILTERS.map((f) => {
                const active = stockStatus === f.key;
                return (
                  <Pressable
                    key={f.labelKey}
                    className={`px-3 py-1.5 rounded-full border ${
                      active ? 'bg-brand-primary border-brand-primary' : 'bg-canvas border-border-default'
                    }`}
                    onPress={() => setStockStatus(f.key)}
                  >
                    <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-text-secondary'}`}>
                      {tr(f.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              className="flex-row items-center justify-center gap-2 h-12 rounded-xl border border-border-default bg-canvas active:opacity-80 mt-1"
              onPress={exportInventory}
              disabled={busy === 'inventory'}
            >
              {busy === 'inventory' ? (
                <ActivityIndicator color={colors.brand.primary} />
              ) : (
                <FileSpreadsheet size={17} color={colors.brand.primary} strokeWidth={2.2} />
              )}
              <Text className="text-sm font-bold text-text-primary">{tr('excel.exportInventory')}</Text>
            </Pressable>
          </View>
        )}

        {canExportOrders && (
          <View className="bg-surface rounded-2xl p-4 gap-3 border border-border-subtle shadow-sm">
            <Text className="text-base font-bold text-text-primary">{tr('excel.ordersTitle')}</Text>
            <Text className="text-xs text-text-secondary leading-5">{tr('excel.ordersHint')}</Text>
            <ExcelDateRangeRow
              range={ordersRange}
              onPickFrom={() => setPickingDate({ forRange: 'orders', field: 'from' })}
              onPickTo={() => setPickingDate({ forRange: 'orders', field: 'to' })}
            />
            <Pressable
              className="flex-row items-center justify-center gap-2 h-12 rounded-xl border border-border-default bg-canvas active:opacity-80 mt-1"
              onPress={exportOrders}
              disabled={busy === 'orders'}
            >
              {busy === 'orders' ? (
                <ActivityIndicator color={colors.brand.primary} />
              ) : (
                <FileSpreadsheet size={17} color={colors.brand.primary} strokeWidth={2.2} />
              )}
              <Text className="text-sm font-bold text-text-primary">{tr('excel.exportOrders')}</Text>
            </Pressable>
          </View>
        )}

        {canExportMovements && (
          <View className="bg-surface rounded-2xl p-4 gap-3 border border-border-subtle shadow-sm">
            <Text className="text-base font-bold text-text-primary">{tr('excel.movementsTitle')}</Text>
            <Text className="text-xs text-text-secondary leading-5">{tr('excel.movementsHint')}</Text>
            <ExcelDateRangeRow
              range={movementsRange}
              onPickFrom={() => setPickingDate({ forRange: 'movements', field: 'from' })}
              onPickTo={() => setPickingDate({ forRange: 'movements', field: 'to' })}
            />
            <Pressable
              className="flex-row items-center justify-center gap-2 h-12 rounded-xl border border-border-default bg-canvas active:opacity-80 mt-1"
              onPress={exportMovements}
              disabled={busy === 'movements'}
            >
              {busy === 'movements' ? (
                <ActivityIndicator color={colors.brand.primary} />
              ) : (
                <FileSpreadsheet size={17} color={colors.brand.primary} strokeWidth={2.2} />
              )}
              <Text className="text-sm font-bold text-text-primary">{tr('excel.exportMovements')}</Text>
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
