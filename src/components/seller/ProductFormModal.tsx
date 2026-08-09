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
  StyleSheet,
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
import { colors, layout, radius, spacing, typography } from '@/theme';

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
  /** Pre-fill the barcode field (e.g. from a scanned, not-yet-existing product). */
  readonly initialBarcode?: string;
  /** Pre-fill the whole form from the shared catalogue (scanned known barcode). */
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

  // The modal stays mounted, so refresh every field each time it opens —
  // otherwise edit prefill and scanned-barcode prefill would be stale.
  // Applied during render rather than in an effect, so the form is already
  // filled on the frame the modal appears instead of flashing the last
  // product's values. Keyed on the same inputs the effect watched.
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
      // Catalogue prefill applies only to NEW products (scanned known barcode).
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
        // Name/photo/description stay editable in the form in edit mode too —
        // previously only price/discountPrice/lowStockThreshold were sent, so
        // those edits were silently discarded on save. The server itself
        // rejects name/photo/description edits when this shop doesn't own the
        // shared catalogue product (surfaced via the existing error toast).
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
        // unitSize is a genuine decimal (e.g. 0.5 kg) — parseAmount would
        // strip the "." as if it were a thousands separator, so keep Number().
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
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>{isEdit ? tr('prodForm.editTitle') : tr('prodForm.newTitle')}</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {!isEdit && prefill ? (
              <View style={styles.prefillBanner}>
                <Text style={styles.prefillText}>{tr('prodForm.prefillBanner')}</Text>
              </View>
            ) : null}

            <Field label={tr('prodForm.name')}>
              <TextInput
                style={styles.input}
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
                  <View style={styles.wrap}>
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
                  <View style={styles.wrap}>
                    {UNITS.map((u) => (
                      <Chip key={u.key} label={tr(u.labelKey)} active={unitType === u.key} onPress={() => setUnitType(u.key)} />
                    ))}
                  </View>
                </Field>

                <Row>
                  <Field label={tr('prodForm.unitSize')} flex>
                    <TextInput
                      style={styles.input}
                      value={unitSize}
                      onChangeText={setUnitSize}
                      keyboardType="decimal-pad"
                      placeholder="1"
                      placeholderTextColor={colors.text.hint}
                    />
                  </Field>
                  <Field label={tr('prodForm.brand')} flex>
                    <TextInput
                      style={styles.input}
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
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.text.hint}
                />
              </Field>
              <Field label={tr('prodForm.discountPrice')} flex>
                <TextInput
                  style={styles.input}
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
                    style={styles.input}
                    value={stock}
                    onChangeText={setStock}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.text.hint}
                  />
                </Field>
                <Field label={tr('prodForm.costPrice')} flex>
                  <TextInput
                    style={styles.input}
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
                  style={styles.input}
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
                  style={styles.input}
                  value={barcode}
                  onChangeText={setBarcode}
                  placeholder={tr('prodForm.optional')}
                  placeholderTextColor={colors.text.hint}
                />
              </Field>
            ) : null}

            <Field label={tr('prodForm.description')}>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={description}
                onChangeText={setDescription}
                placeholder={tr('prodForm.descPlaceholder')}
                placeholderTextColor={colors.text.hint}
                multiline
              />
            </Field>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            disabled={!canSave || save.isPending}
            onPress={() => save.mutate()}>
            <Text style={styles.saveText}>
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
    <View style={[styles.field, flex && { flex: 1 }]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  title: { ...typography.h4, color: colors.text.primary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['3xl'] },
  field: { gap: spacing.xs },
  label: { ...typography.bodySmall, fontWeight: '700', color: colors.text.primary },
  row: { flexDirection: 'row', gap: spacing.md },
  input: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  prefillBanner: {
    backgroundColor: colors.feedback.successSurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  prefillText: { ...typography.bodySmall, fontWeight: '600', color: colors.feedback.success },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  chipTextActive: { color: colors.text.onPrimary },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  saveBtn: {
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.border.strong },
  saveText: { ...typography.body, fontWeight: '700', color: colors.text.onPrimary },
});
