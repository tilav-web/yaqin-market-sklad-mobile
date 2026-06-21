import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, extractErrorMessage, resolveMedia } from '@/lib/api';
import { GlobalProduct } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';

const UNIT_LABEL: Record<string, string> = {
  piece: 'dona',
  kg: 'kg',
  liter: 'litr',
  gram: 'g',
  pack: 'paket',
};

interface Props {
  visible: boolean;
  shopId: string;
  globalProduct: GlobalProduct | null;
  onClose: () => void;
}

export function QuickAddModal({ visible, shopId, globalProduct, onClose }: Props) {
  const qc = useQueryClient();
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [costPrice, setCostPrice] = useState('');

  const reset = () => {
    setPrice('');
    setStock('');
    setCostPrice('');
  };

  const add = useMutation({
    mutationFn: async () => {
      const p = parseFloat(price.replace(/\s/g, ''));
      const s = parseInt(stock, 10);
      if (!globalProduct || isNaN(p) || p <= 0) throw new Error("Narxni to'g'ri kiriting");
      await api.post(`/seller/shops/${shopId}/catalog/clone`, {
        globalProductId: globalProduct.id,
        price: p,
        stock: isNaN(s) ? 0 : s,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      reset();
      onClose();
      Alert.alert("Qo'shildi", "Mahsulot do'koningizga qo'shildi.");
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!globalProduct) return null;

  const unitStr = `${globalProduct.unitSize} ${UNIT_LABEL[globalProduct.unitType] ?? globalProduct.unitType}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Product header (read-only) */}
          <View style={styles.productRow}>
            {globalProduct.photos[0] ? (
              <Image
                source={{ uri: resolveMedia(globalProduct.photos[0]) }}
                style={styles.photo}
              />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]} />
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={styles.productName} numberOfLines={1}>{globalProduct.name}</Text>
                {globalProduct.isVerified ? (
                  <BadgeCheck size={15} color={colors.feedback.success} strokeWidth={2} />
                ) : null}
              </View>
              {globalProduct.brand ? (
                <Text style={styles.productBrand}>{globalProduct.brand}</Text>
              ) : null}
              <Text style={styles.productUnit}>{unitStr}</Text>
            </View>
          </View>

          <Text style={styles.label}>Narx (so'm) *</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="Masalan: 15 000"
            placeholderTextColor={colors.text.hint}
            autoFocus
          />

          <Text style={styles.label}>Boshlang'ich qoldiq (dona)</Text>
          <TextInput
            style={styles.input}
            value={stock}
            onChangeText={setStock}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.text.hint}
          />

          <Text style={styles.label}>Tannarx (so'm, ixtiyoriy)</Text>
          <TextInput
            style={styles.input}
            value={costPrice}
            onChangeText={setCostPrice}
            keyboardType="numeric"
            placeholder="Kirim narxi"
            placeholderTextColor={colors.text.hint}
          />

          <Pressable
            style={[styles.confirmBtn, add.isPending && { opacity: 0.6 }]}
            onPress={() => add.mutate()}
            disabled={add.isPending || !price}>
            {add.isPending ? (
              <ActivityIndicator color={colors.text.onPrimary} />
            ) : (
              <Text style={styles.confirmBtnText}>Do'konga qo'shish</Text>
            )}
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnText}>Bekor qilish</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primarySurface,
  },
  photoPlaceholder: { backgroundColor: colors.bg.surfaceMuted },
  productName: { ...typography.bodyStrong, color: colors.text.primary, flex: 1 },
  productBrand: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  productUnit: { ...typography.caption, color: colors.text.tertiary, marginTop: 1 },
  label: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  input: {
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.bg.surfaceMuted,
  },
  confirmBtn: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  confirmBtnText: { ...typography.button, color: colors.text.onPrimary },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelBtnText: { ...typography.body, color: colors.text.secondary },
});
