import { Plus, Users } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme';

interface StaffHeroCardProps {
  onAdd: () => void;
}

export function StaffHeroCard({ onAdd }: StaffHeroCardProps) {
  return (
    <View className="bg-bg-surface rounded-2xl p-4 gap-3 border border-border-default">
      <View className="flex-row items-center gap-3">
        <View className="w-11 h-11 rounded-full bg-brand-primary items-center justify-center">
          <Users size={22} color={colors.text.onPrimary} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-extrabold text-text-primary">Do'kon xodimlari</Text>
          <Text className="text-xs text-text-secondary mt-0.5 leading-4">
            Kassir, Omborchi, Kuryer yoki bir vaqtning o'zida bir nechta vazifani bajara oladigan xodimlarni biriktiring
          </Text>
        </View>
      </View>
      <Pressable
        className="bg-brand-primary rounded-xl py-3 px-4 flex-row items-center justify-center gap-2 active:opacity-85"
        onPress={onAdd}
      >
        <Plus size={18} color={colors.text.onPrimary} strokeWidth={2.5} />
        <Text className="text-text-on-primary font-bold text-sm">Yangi xodim qo'shish (QR Kod)</Text>
      </Pressable>
    </View>
  );
}
