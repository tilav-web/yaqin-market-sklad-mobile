import { Plus, Users } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, Spacing } from '@/constants/theme';

interface StaffHeroCardProps {
  onAdd: () => void;
}

export function StaffHeroCard({ onAdd }: StaffHeroCardProps) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroHeader}>
        <View style={styles.heroIconWrap}>
          <Users size={22} color={Brand.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Do'kon xodimlari</Text>
          <Text style={styles.heroSubtitle}>
            Kassir, Omborchi, Kuryer yoki bir vaqtning o'zida bir nechta vazifani bajara oladigan xodimlarni biriktiring
          </Text>
        </View>
      </View>
      <Pressable style={styles.addBtn} onPress={onAdd}>
        <Plus size={18} color={Brand.white} strokeWidth={2.5} />
        <Text style={styles.addBtnText}>Yangi xodim qo'shish (QR Kod)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.black,
  },
  heroSubtitle: {
    fontSize: 12,
    color: Brand.gray600,
    marginTop: 2,
    lineHeight: 17,
  },
  addBtn: {
    backgroundColor: Brand.red,
    borderRadius: Radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: {
    color: Brand.white,
    fontWeight: '800',
    fontSize: 14,
  },
});
