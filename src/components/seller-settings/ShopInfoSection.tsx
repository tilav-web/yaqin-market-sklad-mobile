import { Clock, MapPin, Store } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, TextInput } from 'react-native';

import { ImageUploader } from '@/components/seller/ImageUploader';
import { useTranslation } from '@/i18n';
import { colors } from '@/theme';
import { Field, Section } from './SectionAndField';

interface ShopInfoSectionProps {
  photos: string[];
  onChangePhotos: (photos: string[]) => void;
  name: string;
  onChangeName: (name: string) => void;
  phone: string;
  onChangePhone: (phone: string) => void;
  address: string;
  onChangeAddress: (address: string) => void;
  description: string;
  onChangeDescription: (desc: string) => void;
  coords: { latitude: number; longitude: number } | null;
  onOpenLocationPicker: () => void;
  onOpenWorkingHours: () => void;
}

export function ShopInfoSection({
  photos,
  onChangePhotos,
  name,
  onChangeName,
  phone,
  onChangePhone,
  address,
  onChangeAddress,
  description,
  onChangeDescription,
  coords,
  onOpenLocationPicker,
  onOpenWorkingHours,
}: ShopInfoSectionProps) {
  const { tr } = useTranslation();

  return (
    <Section title={tr('shopSet.infoSection')} icon={Store}>
      <ImageUploader
        label={tr('shopSet.photosLabel')}
        hint={tr('shopSet.photosHint')}
        value={photos}
        onChange={onChangePhotos}
        max={5}
      />
      <Field label={tr('shopSet.nameLabel')}>
        <TextInput
          className="bg-bg-canvas rounded-xl border border-border-subtle px-3 py-2 text-base text-text-primary"
          value={name}
          onChangeText={onChangeName}
          placeholderTextColor={colors.text.hint}
        />
      </Field>
      <Field label={tr('shopSet.phoneLabel')}>
        <TextInput
          className="bg-bg-canvas rounded-xl border border-border-subtle px-3 py-2 text-base text-text-primary"
          value={phone}
          onChangeText={onChangePhone}
          placeholder={tr('shopSet.phonePlaceholder')}
          placeholderTextColor={colors.text.hint}
          keyboardType="phone-pad"
        />
        <Text className="text-xs text-text-tertiary mt-0.5">{tr('shopSet.phoneHint')}</Text>
      </Field>
      <Field label={tr('shopSet.addressLabel')}>
        <TextInput
          className="bg-bg-canvas rounded-xl border border-border-subtle px-3 py-2 text-base text-text-primary min-h-[70px]"
          textAlignVertical="top"
          value={address}
          onChangeText={onChangeAddress}
          multiline
          placeholderTextColor={colors.text.hint}
        />
      </Field>
      <Field label={tr('shopSet.descLabel')}>
        <TextInput
          className="bg-bg-canvas rounded-xl border border-border-subtle px-3 py-2 text-base text-text-primary min-h-[70px]"
          textAlignVertical="top"
          value={description}
          onChangeText={onChangeDescription}
          multiline
          placeholder={tr('shopSet.descPlaceholder')}
          placeholderTextColor={colors.text.hint}
        />
        <Text className="text-xs text-text-tertiary mt-0.5">{tr('shopSet.descHint')}</Text>
      </Field>
      <Field label={tr('shopSet.locationLabel')}>
        <Pressable
          className="flex-row items-center gap-1.5 py-2 px-3 rounded-xl border border-border-subtle bg-brand-primary/10 active:opacity-75"
          onPress={onOpenLocationPicker}
        >
          <MapPin size={18} color={colors.brand.primary} strokeWidth={2.4} />
          <Text className="text-sm font-bold text-brand-primary">{tr('shopSet.changeOnMap')}</Text>
        </Pressable>
        {coords ? (
          <Text className="text-xs text-text-secondary mt-1">
            📍 {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
          </Text>
        ) : null}
      </Field>
      <Field label={tr('shopSet.workingHours')}>
        <Pressable
          className="flex-row items-center gap-1.5 py-2 px-3 rounded-xl border border-border-subtle bg-brand-primary/10 active:opacity-75"
          onPress={onOpenWorkingHours}
        >
          <Clock size={18} color={colors.brand.primary} strokeWidth={2.4} />
          <Text className="text-sm font-bold text-brand-primary">{tr('shopSet.workingHoursBtn')}</Text>
        </Pressable>
        <Text className="text-xs text-text-tertiary mt-0.5">{tr('shopSet.workingHoursHint')}</Text>
      </Field>
    </Section>
  );
}
