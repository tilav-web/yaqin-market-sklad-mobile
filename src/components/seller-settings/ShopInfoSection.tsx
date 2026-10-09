import { Clock, MapPin, Store } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { ImageUploader } from '@/components/seller/ImageUploader';
import { useTranslation } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';
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
          style={styles.input}
          value={name}
          onChangeText={onChangeName}
          placeholderTextColor={colors.text.hint}
        />
      </Field>
      <Field label={tr('shopSet.phoneLabel')}>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={onChangePhone}
          placeholder={tr('shopSet.phonePlaceholder')}
          placeholderTextColor={colors.text.hint}
          keyboardType="phone-pad"
        />
        <Text style={styles.hint}>{tr('shopSet.phoneHint')}</Text>
      </Field>
      <Field label={tr('shopSet.addressLabel')}>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={address}
          onChangeText={onChangeAddress}
          multiline
          placeholderTextColor={colors.text.hint}
        />
      </Field>
      <Field label={tr('shopSet.descLabel')}>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={onChangeDescription}
          multiline
          placeholder={tr('shopSet.descPlaceholder')}
          placeholderTextColor={colors.text.hint}
        />
        <Text style={styles.hint}>{tr('shopSet.descHint')}</Text>
      </Field>
      <Field label={tr('shopSet.locationLabel')}>
        <Pressable style={styles.mapBtn} onPress={onOpenLocationPicker}>
          <MapPin size={18} color={colors.brand.primary} strokeWidth={2.4} />
          <Text style={styles.mapBtnText}>{tr('shopSet.changeOnMap')}</Text>
        </Pressable>
        {coords ? (
          <Text style={styles.coordHint}>
            📍 {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
          </Text>
        ) : null}
      </Field>
      <Field label={tr('shopSet.workingHours')}>
        <Pressable style={styles.mapBtn} onPress={onOpenWorkingHours}>
          <Clock size={18} color={colors.brand.primary} strokeWidth={2.4} />
          <Text style={styles.mapBtnText}>{tr('shopSet.workingHoursBtn')}</Text>
        </Pressable>
        <Text style={styles.hint}>{tr('shopSet.workingHoursHint')}</Text>
      </Field>
    </Section>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.bg.canvas,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text.primary,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  hint: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.brand.primarySurface,
  },
  mapBtnText: { ...typography.bodySmall, fontWeight: '700', color: colors.brand.primary },
  coordHint: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.xs },
});
