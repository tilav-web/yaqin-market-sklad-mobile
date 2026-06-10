import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { BookOpen, Package, Search, ScanLine } from 'lucide-react-native';
import { useEffect, useState } from 'react';
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

import { BarcodeScannerModal } from '@/components/seller/BarcodeScannerModal';
import { api, extractErrorMessage, resolveMedia } from '@/lib/api';
import { GlobalCatalogProduct } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

const UNIT_LABEL: Record<string, string> = {
  piece: 'dona',
  kg: 'kg',
  liter: 'litr',
  gram: 'g',
  pack: 'paket',
};

export default function SellerCatalogScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [cloneTarget, setCloneTarget] = useState<GlobalCatalogProduct | null>(null);
  const [price, setPrice] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const catalogQuery = useQuery({
    queryKey: ['global-catalog', search],
    queryFn: async () => {
      const res = await api.get<GlobalCatalogProduct[]>('/seller/catalog', {
        params: { q: search || undefined, limit: 40 },
      });
      return res.data;
    },
    enabled: search.length > 0,
    staleTime: 60_000,
  });

  const cloneMutation = useMutation({
    mutationFn: async ({ globalProductId, price }: { globalProductId: string; price: number }) => {
      await api.post(`/seller/shops/${shopId}/catalog/${globalProductId}/clone`, { price });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      setCloneTarget(null);
      setPrice('');
      Alert.alert("Qo'shildi", "Mahsulot do'koningizga qo'shildi.");
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const handleClone = () => {
    const p = parseFloat(price.replace(/\s/g, ''));
    if (!cloneTarget || isNaN(p) || p <= 0) {
      Alert.alert('Xatolik', 'Narxni to'g'ri kiriting');
      return;
    }
    cloneMutation.mutate({ globalProductId: cloneTarget.id, price: p });
  };

  const onScanned = async (code: string) => {
    setScanOpen(false);
    setSearchInput(code);
    setSearch(code);
  };

  const items = catalogQuery.data ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={17} color={colors.text.tertiary} strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Mahsulot nomi yoki barkod"
            placeholderTextColor={colors.text.hint}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <Pressable onPress={() => { setSearchInput(''); setSearch(''); }} hitSlop={8}>
              <Text style={styles.clearBtn}>✕</Text>
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => setScanOpen(true)} style={styles.scanBtn}>
          <ScanLine size={18} color={colors.brand.primary} strokeWidth={2.2} />
        </Pressable>
      </View>

      {search.length === 0 ? (
        <View style={styles.hint}>
          <View style={styles.hintIcon}>
            <BookOpen size={28} color={colors.brand.primary} strokeWidth={1.8} />
          </View>
          <Text style={styles.hintTitle}>Global katalog</Text>
          <Text style={styles.hintSub}>
            Yuqoridagi qidiruvga mahsulot nomini yoki barkodni kiriting.{'\n'}
            Topilgan mahsulotni do'koningizga narx qo'yib nusxalang.
          </Text>
        </View>
      ) : catalogQuery.isLoading ? (
        <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.hint}>
          <Text style={styles.hintTitle}>Topilmadi</Text>
          <Text style={styles.hintSub}>Bu mahsulot global katalogda yo'q</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.imageWrap}>
                {item.photos[0] ? (
                  <Image source={{ uri: resolveMedia(item.photos[0]) }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.placeholder]}>
                    <Package size={20} color={colors.brand.primary} strokeWidth={1.6} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
                <Text style={styles.unit}>
                  {item.defaultUnitSize} {UNIT_LABEL[item.defaultUnitType] ?? item.defaultUnitType}
                  {item.barcode ? ` · ${item.barcode}` : ''}
                </Text>
                <Text style={styles.usage}>{item.usageCount} do'konda ishlatilmoqda</Text>
              </View>
              <Pressable style={styles.cloneBtn} onPress={() => { setCloneTarget(item); setPrice(''); }}>
                <Text style={styles.cloneBtnText}>Qo'sh</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <BarcodeScannerModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScanned={onScanned}
        onSkip={() => setScanOpen(false)}
        title="Barkodni skanlang"
      />

      <Modal visible={!!cloneTarget} transparent animationType="slide" onRequestClose={() => setCloneTarget(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{cloneTarget?.name}</Text>
            <Text style={styles.sheetSub}>Narxni kiriting (so'm)</Text>
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="Masalan: 15000"
              placeholderTextColor={colors.text.hint}
              autoFocus
            />
            <Pressable
              style={[styles.confirmBtn, cloneMutation.isPending && { opacity: 0.6 }]}
              onPress={handleClone}
              disabled={cloneMutation.isPending}>
              {cloneMutation.isPending ? (
                <ActivityIndicator color={colors.text.onPrimary} />
              ) : (
                <Text style={styles.confirmBtnText}>Do'konga qo'shish</Text>
              )}
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setCloneTarget(null)}>
              <Text style={styles.cancelBtnText}>Bekor qilish</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchInput: { flex: 1, paddingVertical: 10, ...typography.body, color: colors.text.primary },
  clearBtn: { ...typography.body, color: colors.text.tertiary, paddingHorizontal: spacing.xs },
  scanBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['4xl'], gap: spacing.md },
  hintIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintTitle: { ...typography.h4, color: colors.text.primary },
  hintSub: { ...typography.bodySmall, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 },
  list: { padding: layout.screenPadding, paddingBottom: 32, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  imageWrap: { width: 52, height: 52, borderRadius: radius.md, overflow: 'hidden' },
  image: { width: 52, height: 52, backgroundColor: colors.brand.primarySurface },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  name: { ...typography.bodyStrong, color: colors.text.primary },
  brand: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  unit: { ...typography.caption, color: colors.text.tertiary, marginTop: 1 },
  usage: { ...typography.caption, color: colors.brand.primary, marginTop: 2, fontWeight: '600' },
  cloneBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary,
  },
  cloneBtnText: { ...typography.caption, color: colors.text.onPrimary, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  sheetTitle: { ...typography.h3, color: colors.text.primary },
  sheetSub: { ...typography.bodySmall, color: colors.text.secondary },
  priceInput: {
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.surfaceMuted,
  },
  confirmBtn: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { ...typography.buttonMd, color: colors.text.onPrimary },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelBtnText: { ...typography.body, color: colors.text.secondary },
});
