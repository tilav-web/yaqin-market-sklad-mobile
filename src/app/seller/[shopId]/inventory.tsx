import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/ui/brand-button';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { api, extractErrorMessage } from '@/lib/api';
import { PublicProductVariant } from '@/lib/types';

interface ProductFamilyView {
  id: string;
  name: string;
  brand: string | null;
}

export default function SellerInventoryScreen() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  const familiesQuery = useQuery({
    queryKey: ['families', shopId],
    queryFn: async () => {
      const res = await api.get<ProductFamilyView[]>(
        `/seller/shops/${shopId}/products/families`,
      );
      return res.data;
    },
  });

  const variantsQuery = useQuery({
    queryKey: ['variants', shopId],
    queryFn: async () => {
      const res = await api.get<PublicProductVariant[]>(
        `/seller/shops/${shopId}/products/variants`,
      );
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1) Create family
      const famRes = await api.post<ProductFamilyView>(
        `/seller/shops/${shopId}/products/families`,
        { name },
      );
      // 2) Create variant
      await api.post(`/seller/shops/${shopId}/products/variants`, {
        productFamilyId: famRes.data.id,
        name,
        unitType: 'piece',
        unitSize: 1,
        price: Number(price),
        stock: Number(stock),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      qc.invalidateQueries({ queryKey: ['families', shopId] });
      setName('');
      setPrice('');
      setStock('');
      setCreating(false);
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ variantId, delta }: { variantId: string; delta: number }) => {
      await api.post(`/seller/shops/${shopId}/products/variants/${variantId}/stock`, {
        delta,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['variants', shopId] }),
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={variantsQuery.data ?? []}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          variantsQuery.isLoading ? (
            <ActivityIndicator color={Brand.red} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>Mahsulot yo&apos;q</Text>
              <Text style={styles.dim}>+ tugmasi orqali yangi mahsulot qo&apos;shing</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.imageWrap}>
              {item.photos[0] ? (
                <Image source={{ uri: item.photos[0] }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.placeholder]}>
                  <Text style={styles.placeholderEmoji}>📦</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.price}>
                {(item.discountPrice ?? item.price).toLocaleString()} so&apos;m
              </Text>
              <Text style={[styles.stock, item.stock <= 5 && styles.stockLow]}>
                Qoldiq: {item.stock} ta
              </Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => adjustMutation.mutate({ variantId: item.id, delta: -1 })}>
                <Text style={styles.actionText}>−</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={() => adjustMutation.mutate({ variantId: item.id, delta: 1 })}>
                <Text style={styles.actionText}>+</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      <Pressable style={styles.fab} onPress={() => setCreating(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Modal visible={creating} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <Text style={styles.modalTitle}>Yangi mahsulot</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Mahsulot nomi"
            placeholderTextColor={Brand.gray400}
          />
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="Narxi (so'm)"
            keyboardType="number-pad"
            placeholderTextColor={Brand.gray400}
          />
          <TextInput
            style={styles.input}
            value={stock}
            onChangeText={setStock}
            placeholder="Boshlang'ich qoldiq"
            keyboardType="number-pad"
            placeholderTextColor={Brand.gray400}
          />
          <BrandButton
            label="Qo'shish"
            onPress={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!name || !price || !stock}
          />
          <Pressable onPress={() => setCreating(false)} style={{ alignItems: 'center', padding: 12 }}>
            <Text style={{ color: Brand.gray600 }}>Bekor qilish</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.gray50 },
  list: { padding: Spacing.four, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  imageWrap: { width: 60, height: 60, borderRadius: Radius.md, overflow: 'hidden' },
  image: { width: 60, height: 60, backgroundColor: Brand.gray100 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 24 },
  name: { fontSize: 15, fontWeight: '600', color: Brand.black },
  price: { fontSize: 14, fontWeight: '800', color: Brand.blue, marginTop: 2 },
  stock: { fontSize: 12, color: Brand.gray600, marginTop: 2 },
  stockLow: { color: Brand.red, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Brand.blue,
  },
  actionText: { fontSize: 18, fontWeight: '700', color: Brand.blue },
  fab: {
    position: 'absolute',
    bottom: Spacing.four,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  fabText: { color: Brand.white, fontSize: 32, fontWeight: '700', lineHeight: 36 },
  emptyState: { padding: Spacing.seven, alignItems: 'center', gap: Spacing.three },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Brand.black },
  dim: { fontSize: 13, color: Brand.gray600 },
  modal: { flex: 1, padding: Spacing.four, gap: Spacing.three, backgroundColor: Brand.white },
  modalTitle: { fontSize: 22, fontWeight: '800', color: Brand.blue, marginBottom: Spacing.two },
  input: {
    backgroundColor: Brand.gray50,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
});
