import { X } from 'lucide-react-native';
import React from 'react';
import {
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
import { useTranslation } from '@/i18n';
import { Category, PublicProductVariant } from '@/lib/types';
import { colors } from '@/theme';

import { PRODUCT_UNITS, type ProductPrefill, useProductForm } from './useProductForm';

export type { ProductPrefill };

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  readonly editing: PublicProductVariant | null;
  readonly categories: Category[];
  readonly onClose: () => void;
  readonly initialBarcode?: string;
  readonly prefill?: ProductPrefill | null;
}

export function ProductFormModal({
  visible,
  shopId,
  editing,
  categories,
  onClose,
  initialBarcode,
  prefill,
}: Props) {
  const { catName, tr } = useTranslation();
  const form = useProductForm({
    visible,
    shopId,
    editing,
    initialBarcode,
    prefill,
    onClose,
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-bg-canvas" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <Text className="text-xl font-bold text-text-primary">
            {form.isEdit ? tr('prodForm.editTitle') : tr('prodForm.newTitle')}
          </Text>
          <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-bg-surface-muted items-center justify-center">
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
            {!form.isEdit && prefill ? (
              <View className="bg-feedback-success/15 rounded-xl px-3 py-2">
                <Text className="text-sm font-semibold text-feedback-success">{tr('prodForm.prefillBanner')}</Text>
              </View>
            ) : null}

            <Field label={tr('prodForm.name')}>
              <TextInput
                className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                value={form.name}
                onChangeText={form.setName}
                placeholder={tr('prodForm.namePlaceholder')}
                placeholderTextColor={colors.text.hint}
              />
            </Field>

            <ImageUploader
              label={tr('prodForm.photos')}
              hint={tr('prodForm.photosHint')}
              value={form.photos}
              onChange={form.setPhotos}
              max={5}
            />

            {!form.isEdit ? (
              <>
                <Field label={tr('prodForm.category')}>
                  <View className="flex-row flex-wrap gap-2">
                    {categories.map((c) => (
                      <Chip
                        key={c.id}
                        label={catName(c)}
                        active={form.categoryId === c.id}
                        onPress={() => form.setCategoryId(form.categoryId === c.id ? null : c.id)}
                      />
                    ))}
                  </View>
                </Field>

                <Field label={tr('prodForm.unit')}>
                  <View className="flex-row flex-wrap gap-2">
                    {PRODUCT_UNITS.map((u) => (
                      <Chip
                        key={u.key}
                        label={tr(u.labelKey)}
                        active={form.unitType === u.key}
                        onPress={() => form.setUnitType(u.key)}
                      />
                    ))}
                  </View>
                </Field>

                <Row>
                  <Field label={tr('prodForm.unitSize')} flex>
                    <TextInput
                      className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                      value={form.unitSize}
                      onChangeText={form.setUnitSize}
                      keyboardType="decimal-pad"
                      placeholder="1"
                      placeholderTextColor={colors.text.hint}
                    />
                  </Field>
                  <Field label={tr('prodForm.brand')} flex>
                    <TextInput
                      className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                      value={form.brand}
                      onChangeText={form.setBrand}
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
                  value={form.price}
                  onChangeText={form.setPrice}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.text.hint}
                />
              </Field>
              <Field label={tr('prodForm.discountPrice')} flex>
                <TextInput
                  className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                  value={form.discountPrice}
                  onChangeText={form.setDiscountPrice}
                  keyboardType="number-pad"
                  placeholder={tr('prodForm.optional')}
                  placeholderTextColor={colors.text.hint}
                />
              </Field>
            </Row>

            {!form.isEdit ? (
              <Row>
                <Field label={tr('prodForm.initialStock')} flex>
                  <TextInput
                    className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                    value={form.stock}
                    onChangeText={form.setStock}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.text.hint}
                  />
                </Field>
                <Field label={tr('prodForm.costPrice')} flex>
                  <TextInput
                    className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                    value={form.costPrice}
                    onChangeText={form.setCostPrice}
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
                  value={form.lowStock}
                  onChangeText={form.setLowStock}
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor={colors.text.hint}
                />
              </Field>
            </Row>

            {!form.isEdit ? (
              <Field label={tr('prodForm.barcode')}>
                <TextInput
                  className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                  value={form.barcode}
                  onChangeText={form.setBarcode}
                  placeholder={tr('prodForm.optional')}
                  placeholderTextColor={colors.text.hint}
                />
              </Field>
            ) : null}

            <Field label={tr('prodForm.description')}>
              <TextInput
                className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default min-h-[64px]"
                textAlignVertical="top"
                value={form.description}
                onChangeText={form.setDescription}
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
              !form.canSave
                ? 'bg-border-strong'
                : form.save.isPending
                  ? 'bg-brand-primary opacity-60'
                  : 'bg-brand-primary active:opacity-85'
            }`}
            disabled={!form.canSave || form.save.isPending}
            onPress={() => form.save.mutate()}>
            <Text className="text-base font-bold text-text-on-primary">
              {form.save.isPending
                ? tr('prodForm.saving')
                : form.isEdit
                  ? tr('common.save')
                  : tr('prodForm.add')}
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
