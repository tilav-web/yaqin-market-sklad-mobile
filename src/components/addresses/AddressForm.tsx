import { MapPin } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

interface AddressFormProps {
  readonly isEditing: boolean;
  readonly label: string;
  readonly onChangeLabel: (v: string) => void;
  readonly address: string;
  readonly onChangeAddress: (v: string) => void;
  readonly entrance: string;
  readonly onChangeEntrance: (v: string) => void;
  readonly floor: string;
  readonly onChangeFloor: (v: string) => void;
  readonly apartment: string;
  readonly onChangeApartment: (v: string) => void;
  readonly intercom: string;
  readonly onChangeIntercom: (v: string) => void;
  readonly onPickMap: () => void;
  readonly canSave: boolean;
  readonly isPending: boolean;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

export function AddressForm({
  isEditing,
  label,
  onChangeLabel,
  address,
  onChangeAddress,
  entrance,
  onChangeEntrance,
  floor,
  onChangeFloor,
  apartment,
  onChangeApartment,
  intercom,
  onChangeIntercom,
  onPickMap,
  canSave,
  isPending,
  onSave,
  onCancel,
}: AddressFormProps) {
  const { tr } = useTranslation();

  return (
    <View className="bg-surface rounded-2xl p-4 gap-3 shadow-sm border border-border-subtle">
      <Text className="text-lg font-bold text-text-primary">{tr(isEditing ? 'addr.editTitle' : 'addr.new')}</Text>
      <TextInput
        className="bg-surface-muted rounded-xl px-3.5 py-3 text-base text-text-primary border border-border-subtle"
        placeholder={tr('addr.label')}
        value={label}
        onChangeText={onChangeLabel}
        placeholderTextColor={colors.text.hint}
      />
      <TextInput
        className="bg-surface-muted rounded-xl px-3.5 py-3 text-base text-text-primary border border-border-subtle min-h-[76px]"
        placeholder={tr('addr.addressPlaceholder')}
        value={address}
        onChangeText={onChangeAddress}
        multiline
        textAlignVertical="top"
        placeholderTextColor={colors.text.hint}
      />

      <Pressable
        className="flex-row items-center justify-center gap-2 py-3 border border-dashed border-brand-primary rounded-xl bg-brand-primary/10"
        onPress={onPickMap}>
        <MapPin size={18} color={colors.brand.primary} strokeWidth={2.4} />
        <Text className="text-base font-bold text-brand-primary">{tr('addr.pickOnMapAgain')}</Text>
      </Pressable>

      <View className="flex-row flex-wrap gap-2">
        <TextInput
          className="flex-1 min-w-[45%] bg-surface-muted rounded-xl px-3.5 py-3 text-base text-text-primary border border-border-subtle"
          placeholder={tr('addr.entrance')}
          value={entrance}
          onChangeText={onChangeEntrance}
          placeholderTextColor={colors.text.hint}
        />
        <TextInput
          className="flex-1 min-w-[45%] bg-surface-muted rounded-xl px-3.5 py-3 text-base text-text-primary border border-border-subtle"
          placeholder={tr('addr.floor')}
          value={floor}
          onChangeText={onChangeFloor}
          placeholderTextColor={colors.text.hint}
        />
        <TextInput
          className="flex-1 min-w-[45%] bg-surface-muted rounded-xl px-3.5 py-3 text-base text-text-primary border border-border-subtle"
          placeholder={tr('addr.apartment')}
          value={apartment}
          onChangeText={onChangeApartment}
          placeholderTextColor={colors.text.hint}
        />
        <TextInput
          className="flex-1 min-w-[45%] bg-surface-muted rounded-xl px-3.5 py-3 text-base text-text-primary border border-border-subtle"
          placeholder={tr('addr.intercom')}
          value={intercom}
          onChangeText={onChangeIntercom}
          placeholderTextColor={colors.text.hint}
        />
      </View>

      <Pressable
        className={`h-12 rounded-xl items-center justify-center ${
          canSave && !isPending ? 'bg-brand-primary' : 'bg-surface-disabled'
        }`}
        disabled={!canSave || isPending}
        onPress={onSave}>
        <Text className="text-base font-bold text-white">
          {isPending ? tr('addr.saving') : tr('addr.save')}
        </Text>
      </Pressable>
      <Pressable onPress={onCancel} className="items-center py-2">
        <Text className="text-base font-medium text-text-secondary">{tr('common.cancel')}</Text>
      </Pressable>
    </View>
  );
}
