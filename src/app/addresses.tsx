import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Alert,
  FlatList,
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
import { UserAddress } from '@/lib/types';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';

export default function AddressesScreen() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const coords = useEffectiveCoords();
  const refresh = useLocationStore((s) => s.refresh);

  const addressesQuery = useQuery({
    queryKey: ['my-addresses'],
    queryFn: async () => {
      const res = await api.get<UserAddress[]>('/users/me/addresses');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!coords) throw new Error('Lokatsiya yo\'q');
      const res = await api.post<UserAddress>('/users/me/addresses', {
        label,
        address,
        latitude: coords.latitude,
        longitude: coords.longitude,
        isDefault: addressesQuery.data?.length === 0,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      setLabel('');
      setAddress('');
      setAdding(false);
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/me/addresses/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-addresses'] }),
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={addressesQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>
                {item.label} {item.isDefault && '⭐'}
              </Text>
              <Text style={styles.address}>{item.address}</Text>
            </View>
            <Pressable
              onPress={() =>
                Alert.alert('O\'chirish', 'Manzilni o\'chirasizmi?', [
                  { text: 'Bekor', style: 'cancel' },
                  { text: 'O\'chirish', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                ])
              }>
              <Text style={styles.deleteText}>🗑</Text>
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          adding ? (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Yangi manzil</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom (Uy, Ish, va h.k.)"
                value={label}
                onChangeText={setLabel}
                placeholderTextColor={Brand.gray400}
              />
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="To'liq manzil"
                value={address}
                onChangeText={setAddress}
                multiline
                placeholderTextColor={Brand.gray400}
              />
              <Text style={styles.gpsHint}>
                {coords
                  ? `📍 Joriy lokatsiya: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
                  : 'Lokatsiya yuklanmoqda...'}
              </Text>
              <Pressable style={styles.gpsBtn} onPress={() => refresh()}>
                <Text style={styles.gpsBtnText}>📍 Lokatsiyani yangilash</Text>
              </Pressable>
              <BrandButton
                label="Saqlash"
                onPress={() => createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={!label || !address || !coords}
              />
              <Pressable onPress={() => setAdding(false)} style={{ alignItems: 'center', padding: 8 }}>
                <Text style={{ color: Brand.gray600 }}>Bekor qilish</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.addBtn}
              onPress={() => {
                if (!coords) void refresh();
                setAdding(true);
              }}>
              <Text style={styles.addBtnText}>+ Yangi manzil qo&apos;shish</Text>
            </Pressable>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.gray50 },
  list: { padding: Spacing.four },
  card: {
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  label: { fontSize: 16, fontWeight: '700', color: Brand.black },
  address: { fontSize: 13, color: Brand.gray600, marginTop: 4 },
  deleteText: { fontSize: 22 },
  addBtn: {
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Brand.blue,
    borderStyle: 'dashed',
  },
  addBtnText: { color: Brand.blue, fontWeight: '700' },
  form: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  formTitle: { fontSize: 16, fontWeight: '700', color: Brand.blue, marginBottom: Spacing.two },
  input: {
    backgroundColor: Brand.gray50,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  gpsHint: { fontSize: 12, color: Brand.gray600 },
  gpsBtn: { padding: 10, alignItems: 'center', borderWidth: 1, borderColor: Brand.blue, borderRadius: Radius.md },
  gpsBtnText: { color: Brand.blue, fontWeight: '700' },
});
