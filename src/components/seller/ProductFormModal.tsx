import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImageUploader } from '@/components/seller/ImageUploader';
import { TranslationKey, useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { parseAmount } from '@/lib/parseAmount';
import { Category, PublicProductVariant } from '@/lib/types';
import { colors } from '@/theme';

const UNITS: { key: 'piece' | 'kg' | 'liter' | 'gram' | 'pack'; labelKey: TranslationKey }[] = [
  { key: 'piece', labelKey: 'prodForm.unitPiece' },
  { key: 'kg', labelKey: 'prodForm.unitKg' },
  { key: 'liter', labelKey: 'prodForm.unitLiter' },
  { key: 'gram', labelKey: 'prodForm.unitGram' },
  { key: 'pack', labelKey: 'prodForm.unitPack' },
];

/** Catalogue data used to pre-fill a NEW product (from a scanned barcode). */
export interface ProductPrefill {
  barcode: string;
  name: string;
  brand: string | null;
  unitType: PublicProductVariant['unitType'];
  unitSize: number;
  categoryId: string | null;
  photos: string[];
}

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  readonly editing: PublicProductVariant | null;
  readonly categories: Category[];
  readonly onClose: () => void;
  readonly initialBarcode?: string;
  readonly prefill?: ProductPrefill | null;
}

export function ProductFormModal({ visible, shopId, editing, categories, onClose, initialBarcode, prefill }: Props) {
  const qc = useQueryClient();
  const { catName, tr } = useTranslation();
  const isEdit = !!editing;

  const [name, setName] = useState(editing?.name ?? '');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unitType, setUnitType] = useState<(typeof UNITS)[number]['key']>(editing?.unitType ?? 'piece');
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-bg-canvas" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <Text className="text-xl font-bold text-text-primary">{isEdit ? tr('prodForm.editTitle') : tr('prodForm.newTitle')}</Text>
          <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-bg-surface-muted items-center justify-center">
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
            {!isEdit && prefill ? (
              <View className="bg-feedback-success/15 rounded-xl px-3 py-2">
                <Text className="text-sm font-semibold text-feedback-success">{tr('prodForm.prefillBanner')}</Text>
              </View>
            ) : null}

            <Field label={tr('prodForm.name')}>
              <TextInput
                className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                value={name}
                onChangeText={setName}
                placeholder={tr('prodForm.namePlaceholder')}
                placeholderTextColor={colors.text.hint}
              />
            </Field>

            <ImageUploader
              label={tr('prodForm.photos')}
              hint={tr('prodForm.photosHint')}
              value={photos}
              onChange={setPhotos}
              max={5}
            />

            {!isEdit ? (
              <>
                <Field label={tr('prodForm.category')}>
                  <View className="flex-row flex-wrap gap-2">
                    {categories.map((c) => (
                      <Chip
                        key={c.id}
                        label={catName(c)}
                        active={categoryId === c.id}
                        onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
                      />
                    ))}
                  </View>
                </Field>

                <Field label={tr('prodForm.unit')}>
                  <View className="flex-row flex-wrap gap-2">
                    {UNITS.map((u) => (
                      <Chip key={u.key} label={tr(u.labelKey)} active={unitType === u.key} onPress={() => setUnitType(u.key)} />
                    ))}
                  </View>
                </Field>

                <Row>
                  <Field label={tr('prodForm.unitSize')} flex>
                    <TextInput
                      className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                      value={unitSize}
                      onChangeText={setUnitSize}
                      keyboardType="decimal-pad"
                      placeholder="1"
                      placeholderTextColor={colors.text.hint}
                    />
                  </Field>
                  <Field label={tr('prodForm.brand')} flex>
                    <TextInput
                      className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                      value={brand}
                      onChangeText={setBrand}
                      placeholder={tr('prodForm.optional')}
                      placeholderTextColor={colors.text.hint}
                    />
                  </Field>
                </Row>
              </>
            ) : null}

            <Row>
              <Field label={tr('prodForm.price')} flex>
                <TextInput
                  className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.text.hint}
                />
              </Field>
              <Field label={tr('prodForm.discountPrice')} flex>
                <TextInput
                  className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                  value={discountPrice}
                  onChangeText={setDiscountPrice}
                  keyboardType="number-pad"
                  placeholder={tr('prodForm.optional')}
                  placeholderTextColor={colors.text.hint}
                />
              </Field>
            </Row>

            {!isEdit ? (
              <Row>
                <Field label={tr('prodForm.initialStock')} flex>
                  <TextInput
                    className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                    value={stock}
                    onChangeText={setStock}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.text.hint}
                  />
                </Field>
                <Field label={tr('prodForm.costPrice')} flex>
                  <TextInput
                    className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                    value={costPrice}
                    onChangeText={setCostPrice}
                    keyboardType="number-pad"
                    placeholder={tr('prodForm.costPlaceholder')}
                    placeholderTextColor={colors.text.hint}
                  />
                </Field>
              </Row>
            ) : null}

            <Row>
              <Field label={tr('prodForm.lowStock')} flex>
                <TextInput
                  className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                  value={lowStock}
                  onChangeText={setLowStock}
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor={colors.text.hint}
                />
              </Field>
            </Row>

            {!isEdit ? (
              <Field label={tr('prodForm.barcode')}>
                <TextInput
                  className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                  value={barcode}
                  onChangeText={setBarcode}
                  placeholder={tr('prodForm.optional')}
                  placeholderTextColor={colors.text.hint}
                />
              </Field>
            ) : null}

            <Field label={tr('prodForm.description')}>
              <TextInput
                className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default min-h-[64px]"
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
                placeholder={tr('prodForm.descPlaceholder')}
                placeholderTextColor={colors.text.hint}
                multiline
              />
            </Field>
          </ScrollView>
        </KeyboardAvoidingView>

        <View className="px-4 pt-3 pb-2 border-t border-border-subtle bg-bg-surface">
          <Pressable
            className={`h-12 rounded-2xl items-center justify-center ${
              !canSave ? 'bg-border-strong' : save.isPending ? 'bg-brand-primary opacity-60' : 'bg-brand-primary active:opacity-85'
            }`}
            disabled={!canSave || save.isPending}
            onPress={() => save.mutate()}>
            <Text className="text-base font-bold text-text-on-primary">
              {save.isPending ? tr('prodForm.saving') : isEdit ? tr('common.save') : tr('prodForm.add')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <View className={`gap-1 ${flex ? 'flex-1' : ''}`}>
      <Text className="text-sm font-bold text-text-primary">{label}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View className="flex-row gap-3">{children}</View>;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-2 rounded-full border ${
        active
          ? 'bg-brand-primary border-brand-primary'
          : 'border-border-default bg-bg-surface'
      }`}
    >
      <Text className={`text-xs font-bold ${active ? 'text-text-on-primary' : 'text-text-secondary'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
