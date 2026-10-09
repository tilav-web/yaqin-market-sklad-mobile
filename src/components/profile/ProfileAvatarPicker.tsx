import { Check } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, View } from 'react-native';

import { AVATAR_OPTIONS } from '@/constants/avatars';
import { colors } from '@/theme';

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
  const visibleAvatars = gender ? AVATAR_OPTIONS.filter((a) => a.gender === gender) : AVATAR_OPTIONS;

  return (
    <View className="flex-row flex-wrap gap-2.5">
      {visibleAvatars.map((opt) => {
        const isSelected = selectedId === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            className={`w-[60px] h-[60px] rounded-full border-2 items-center justify-center relative overflow-hidden ${
              isSelected ? 'border-brand-primary' : 'border-border-subtle bg-surface-muted'
            }`}>
            <Image source={opt.source} className="w-[56px] h-[56px] rounded-full" resizeMode="cover" />
            {isSelected && (
              <View className="absolute right-0 bottom-0 w-5 h-5 rounded-full bg-brand-primary items-center justify-center border-2 border-white">
                <Check size={11} color={colors.text.onPrimary} strokeWidth={3} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
