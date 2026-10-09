import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from 'react-native';

import { TranslationKey, useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { parseAmount } from '@/lib/parseAmount';
import { PublicProductVariant } from '@/lib/types';

export const PRODUCT_UNITS: {
  key: 'piece' | 'kg' | 'liter' | 'gram' | 'pack';
  labelKey: TranslationKey;
}[] = [
  { key: 'piece', labelKey: 'prodForm.unitPiece' },
  { key: 'kg', labelKey: 'prodForm.unitKg' },
  { key: 'liter', labelKey: 'prodForm.unitLiter' },
  { key: 'gram', labelKey: 'prodForm.unitGram' },
  { key: 'pack', labelKey: 'prodForm.unitPack' },
];

export interface ProductPrefill {
  barcode: string;
  name: string;
  brand: string | null;
  unitType: PublicProductVariant['unitType'];
  unitSize: number;
  categoryId: string | null;
  photos: string[];
}

interface UseProductFormParams {
  visible: boolean;
  shopId: string;
  editing: PublicProductVariant | null;
  initialBarcode?: string;
  prefill?: ProductPrefill | null;
  onClose: () => void;
}

export function useProductForm({
  visible,
  shopId,
  editing,
  initialBarcode,
  prefill,
  onClose,
}: UseProductFormParams) {
  const qc = useQueryClient();
  const { tr } = useTranslation();
  const isEdit = !!editing;

  const [name, setName] = useState(editing?.name ?? '');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unitType, setUnitType] = useState<(typeof PRODUCT_UNITS)[number]['key']>(
    editing?.unitType ?? 'piece',
  );
  const [unitSize, setUnitSize] = useState(editing ? String(editing.unitSize) : '1');
  const [price, setPrice] = useState(editing ? String(editing.price) : '');
  const [discountPrice, setDiscountPrice] = useState(
    editing?.discountPrice != null ? String(editing.discountPrice) : '',
  );
  const [stock, setStock] = useState(editing ? String(editing.stock) : '');
  const [costPrice, setCostPrice] = useState('');
  const [lowStock, setLowStock] = useState(
    editing ? String(editing.lowStockThreshold) : '5',
  );
  const [barcode, setBarcode] = useState(editing?.barcode ?? initialBarcode ?? '');
  const [photos, setPhotos] = useState<string[]>(editing?.photos ?? []);

  const [syncedFor, setSyncedFor] = useState<{
    visible: boolean;
    editing: typeof editing;
    initialBarcode: typeof initialBarcode;
    prefill: typeof prefill;
  } | null>(null);

  if (
    !syncedFor ||
    syncedFor.visible !== visible ||
    syncedFor.editing !== editing ||
    syncedFor.initialBarcode !== initialBarcode ||
    syncedFor.prefill !== prefill
  ) {
    setSyncedFor({ visible, editing, initialBarcode, prefill });
    if (visible) {
      const pf = editing ? null : prefill;
      setName(editing?.name ?? pf?.name ?? '');
      setBrand(pf?.brand ?? '');
      setDescription(editing?.description ?? '');
      setCategoryId(pf?.categoryId ?? null);
      setUnitType(editing?.unitType ?? pf?.unitType ?? 'piece');
      setUnitSize(editing ? String(editing.unitSize) : pf ? String(pf.unitSize) : '1');
      setPrice(editing ? String(editing.price) : '');
      setDiscountPrice(editing?.discountPrice != null ? String(editing.discountPrice) : '');
      setStock(editing ? String(editing.stock) : '');
      setCostPrice('');
      setLowStock(editing ? String(editing.lowStockThreshold) : '5');
      setBarcode(editing?.barcode ?? pf?.barcode ?? initialBarcode ?? '');
      setPhotos(editing?.photos ?? pf?.photos ?? []);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (isEdit && editing) {
        await api.patch(`/seller/shops/${shopId}/products/variants/${editing.id}`, {
          name: name.trim(),
          photos,
          description: description.trim() || undefined,
          price: parseAmount(price),
          discountPrice: discountPrice ? parseAmount(discountPrice) : null,
          lowStockThreshold: lowStock ? parseAmount(lowStock) : undefined,
        });
        return;
      }
      await api.post(`/seller/shops/${shopId}/products/variants`, {
        name: name.trim(),
        brand: brand.trim() || undefined,
        categoryId: categoryId ?? undefined,
        description: description.trim() || undefined,
        unitType,
        unitSize: Number(unitSize) || 1,
        photos,
        price: parseAmount(price),
        discountPrice: discountPrice ? parseAmount(discountPrice) : undefined,
        stock: parseAmount(stock),
        costPrice: costPrice ? parseAmount(costPrice) : undefined,
        lowStockThreshold: lowStock ? parseAmount(lowStock) : undefined,
        barcode: barcode.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      onClose();
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const canSave = !!name.trim() && !!price && (isEdit || !!stock);

  return {
    isEdit,
    name,
    setName,
    brand,
    setBrand,
    description,
    setDescription,
    categoryId,
    setCategoryId,
    unitType,
    setUnitType,
    unitSize,
    setUnitSize,
    price,
    setPrice,
    discountPrice,
    setDiscountPrice,
    stock,
    setStock,
    costPrice,
    setCostPrice,
    lowStock,
    setLowStock,
    barcode,
    setBarcode,
    photos,
    setPhotos,
    save,
    canSave,
  };
}
