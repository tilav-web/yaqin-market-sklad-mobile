import React from 'react';

import { BarcodeScannerModal } from '@/components/seller/BarcodeScannerModal';
import { BrakStockModal } from '@/components/seller/BrakStockModal';
import { InventoryCountModal } from '@/components/seller/InventoryCountModal';
import { KirimModal } from '@/components/seller/KirimModal';
import { ProductFormModal, ProductPrefill } from '@/components/seller/ProductFormModal';
import { QuickAddModal } from '@/components/seller/QuickAddModal';
import { StockHistoryModal } from '@/components/seller/StockHistoryModal';
import { tr } from '@/i18n';
import { Category, GlobalProduct, PublicProductVariant, SellerVariant } from '@/lib/types';

import { InventoryBulkPriceModal } from './InventoryBulkPriceModal';

interface InventoryModalsProps {
  shopId: string;
  leafCategories: Category[];
  formOpen: boolean;
  onCloseForm: () => void;
  editing: PublicProductVariant | null;
  scannedBarcode: string;
  prefill: ProductPrefill | null;
  quickAddGp: GlobalProduct | null;
  onCloseQuickAdd: () => void;
  scanOpen: boolean;
  onCloseScan: () => void;
  onScanned: (code: string) => void;
  onSkipScan: () => void;
  countOpen: boolean;
  onCloseCount: () => void;
  kirimFor: PublicProductVariant | null;
  onCloseKirim: () => void;
  brakFor: PublicProductVariant | null;
  onCloseBrak: () => void;
  historyFor: SellerVariant | null;
  onCloseHistory: () => void;
  bulkPriceOpen: boolean;
  onCloseBulkPrice: () => void;
  onBulkPriceDone: () => void;
}

export function InventoryModals({
  shopId,
  leafCategories,
  formOpen,
  onCloseForm,
  editing,
  scannedBarcode,
  prefill,
  quickAddGp,
  onCloseQuickAdd,
  scanOpen,
  onCloseScan,
  onScanned,
  onSkipScan,
  countOpen,
  onCloseCount,
  kirimFor,
  onCloseKirim,
  brakFor,
  onCloseBrak,
  historyFor,
  onCloseHistory,
  bulkPriceOpen,
  onCloseBulkPrice,
  onBulkPriceDone,
}: InventoryModalsProps) {
  return (
    <>
      <ProductFormModal
        visible={formOpen}
        shopId={shopId}
        editing={editing}
        categories={leafCategories}
        initialBarcode={scannedBarcode}
        prefill={prefill}
        onClose={onCloseForm}
      />

      <QuickAddModal
        visible={!!quickAddGp}
        shopId={shopId}
        globalProduct={quickAddGp}
        onClose={onCloseQuickAdd}
      />

      <BarcodeScannerModal
        visible={scanOpen}
        onClose={onCloseScan}
        onScanned={onScanned}
        onSkip={onSkipScan}
        title={tr('inv.scanTitle')}
      />

      <InventoryCountModal
        visible={countOpen}
        shopId={shopId}
        onClose={onCloseCount}
      />

      <KirimModal
        visible={!!kirimFor}
        shopId={shopId}
        variant={kirimFor}
        onClose={onCloseKirim}
      />

      <BrakStockModal
        visible={!!brakFor}
        shopId={shopId}
        variant={brakFor}
        onClose={onCloseBrak}
      />

      <StockHistoryModal
        visible={!!historyFor}
        shopId={shopId}
        variant={historyFor}
        onClose={onCloseHistory}
      />

      <InventoryBulkPriceModal
        visible={bulkPriceOpen}
        shopId={shopId}
        categories={leafCategories}
        onClose={onCloseBulkPrice}
        onDone={onBulkPriceDone}
      />
    </>
  );
}
