import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { MeUser, MyShop } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';

export default function ProfileTab() {
  const signOut = useAuthStore((s) => s.signOut);
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<MeUser>('/users/me');
      return res.data;
    },
  });

  const myShopsQuery = useQuery({
    queryKey: ['shops', 'mine'],
    queryFn: async () => {
      const res = await api.get<MyShop[]>('/seller/shops/mine');
      return res.data;
    },
    enabled: !!meQuery.data?.isSellerApproved,
  });

  const me = meQuery.data;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(me?.name?.[0] ?? me?.phone?.slice(-2) ?? 'Y').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{me?.name ?? 'Foydalanuvchi'}</Text>
                <Text style={styles.phone}>{me?.phone}</Text>
              </View>
            </View>

            <Section title="Mening do'konlarim">
              {me?.isSellerApproved ? (
                myShopsQuery.data && myShopsQuery.data.length > 0 ? (
                  myShopsQuery.data.map((shop) => (
                    <Pressable
                      key={shop.id}
                      style={styles.row}
                      onPress={() => router.push(`/seller/${shop.id}`)}>
                      <Text style={styles.rowIcon}>🏪</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowText}>{shop.name}</Text>
                        <Text style={styles.rowSub}>
                          {shop.isOpenManual ? 'Ochiq' : 'Yopiq'} · {shop.address}
                        </Text>
                      </View>
                      <Text style={styles.rowArrow}>›</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.dim}>Hozircha do&apos;konlaringiz yo&apos;q</Text>
                )
              ) : (
                <Pressable
                  style={[styles.row, styles.applyRow]}
                  onPress={() => router.push('/seller-application')}>
                  <Text style={styles.rowIcon}>🪪</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowText, { color: Brand.red }]}>
                      Sotuvchi bo&apos;lish
                    </Text>
                    <Text style={styles.rowSub}>O&apos;z do&apos;koningizni boshqaring</Text>
                  </View>
                  <Text style={[styles.rowArrow, { color: Brand.red }]}>›</Text>
                </Pressable>
              )}
            </Section>

            <Section title="Hisob">
              <Pressable style={styles.row} onPress={() => router.push('/addresses')}>
                <Text style={styles.rowIcon}>📍</Text>
                <Text style={styles.rowText}>Manzillarim</Text>
                <Text style={styles.rowArrow}>›</Text>
              </Pressable>
              <Pressable style={styles.row} onPress={() => router.push('/orders')}>
                <Text style={styles.rowIcon}>📦</Text>
                <Text style={styles.rowText}>Buyurtmalarim</Text>
                <Text style={styles.rowArrow}>›</Text>
              </Pressable>
            </Section>

            <Section title="Boshqa">
              <Pressable
                style={styles.row}
                onPress={() =>
                  Alert.alert('Chiqish', 'Akkauntdan chiqishni xohlaysizmi?', [
                    { text: 'Bekor', style: 'cancel' },
                    {
                      text: 'Chiqish',
                      style: 'destructive',
                      onPress: () => signOut(),
                    },
                  ])
                }>
                <Text style={styles.rowIcon}>🚪</Text>
                <Text style={[styles.rowText, { color: Brand.red }]}>Chiqish</Text>
              </Pressable>
            </Section>
          </View>
        }
        data={[]}
        renderItem={null}
      />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.gray50 },
  header: {
    padding: Spacing.four,
    backgroundColor: Brand.white,
    flexDirection: 'row',
    gap: Spacing.four,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Brand.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Brand.red,
  },
  avatarText: { color: Brand.white, fontSize: 24, fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '700', color: Brand.black },
  phone: { fontSize: 14, color: Brand.gray600, marginTop: 2 },
  section: { marginTop: Spacing.four },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  sectionBody: { backgroundColor: Brand.white, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Brand.gray100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    gap: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray50,
  },
  applyRow: { backgroundColor: '#FFF5F5' },
  rowIcon: { fontSize: 22 },
  rowText: { flex: 1, fontSize: 15, fontWeight: '600', color: Brand.black },
  rowSub: { fontSize: 12, color: Brand.gray600, marginTop: 2 },
  rowArrow: { fontSize: 22, color: Brand.gray400 },
  dim: { fontSize: 14, color: Brand.gray600, padding: Spacing.four },
});
