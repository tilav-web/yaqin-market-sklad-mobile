import { Check } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, View } from 'react-native';

import { AVATAR_OPTIONS } from '@/constants/avatars';
import { useTheme } from '@/stores/theme';

interface ProfileAvatarPickerProps {
  readonly gender: 'male' | 'female' | null;
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
}

export function ProfileAvatarPicker({
  gender,
  selectedId,
  onSelect,
}: ProfileAvatarPickerProps) {
  const { colors: activeColors } = useTheme();
  const visibleAvatars = gender ? AVATAR_OPTIONS.filter((a) => a.gender === gender) : AVATAR_OPTIONS;

  return (
    <View className="flex-row flex-wrap gap-2.5">
      {visibleAvatars.map((opt) => {
        const isSelected = selectedId === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              borderWidth: isSelected ? 2.5 : 1.5,
              borderColor: isSelected ? activeColors.brand.primary : activeColors.border.subtle,
              backgroundColor: activeColors.bg.surfaceMuted,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}>
            <Image source={opt.source} style={{ width: 56, height: 56, borderRadius: 28 }} resizeMode="cover" />
            {isSelected && (
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: activeColors.brand.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                }}>
                <Check size={11} color="#FFFFFF" strokeWidth={3} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
