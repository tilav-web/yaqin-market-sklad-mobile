import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MapPin, Star, Trash2 } from 'lucide-react-native';
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

import { LocationPickerModal, PickedLocation } from '@/components/LocationPickerModal';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { UserAddress } from '@/lib/types';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

export default function AddressesScreen() {
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const coords = useEffectiveCoords();

  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const setSelectedAddress = useLocationStore((s) => s.setSelectedAddress);
  const useCurrentLocation = useLocationStore((s) => s.useCurrentLocation);

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const addressesQuery = useQuery({
    queryKey: ['my-addresses'],
    queryFn: async () => {
      const res = await api.get<UserAddress[]>('/users/me/addresses');
      return res.data;
    },
  });

  const resetForm = () => {
    setLabel('');
    setAddress('');
    setPicked(null);
    setAdding(false);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const point = picked ?? coords;
      if (!point) throw new Error(tr('addr.noLocation'));
      const res = await api.post<UserAddress>('/users/me/addresses', {
        label,
        address,
        latitude: point.latitude,
        longitude: point.longitude,
        isDefault: (addressesQuery.data?.length ?? 0) === 0,
      });
      return res.data;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      // Newly added address becomes the active location right away.
      setSelectedAddress(created);
      resetForm();
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/users/me/addresses/${id}`, { isDefault: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-addresses'] }),
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/me/addresses/${id}`);
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      // If the deleted address was the active one, fall back to GPS.
      if (selectedAddress?.id === id) useCurrentLocation();
    },
  });

  const onPickConfirm = (result: PickedLocation) => {
    setPicked(result);
    if (result.address) setAddress(result.address);
    setPickerVisible(false);
  };

  const selectAsActive = (item: UserAddress) => {
    haptics.selection();
    setSelectedAddress(item);
  };

  const confirmDelete = (item: UserAddress) =>
    Alert.alert(tr('addr.delete'), tr('addr.deleteConfirm'), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('addr.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
    ]);

  const canSave = !!label.trim() && !!address.trim() && !!(picked ?? coords);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={addressesQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.hint}>{tr('addr.hint')}</Text>}
        renderItem={({ item }) => {
          const active = selectedAddress?.id === item.id;
          return (
            <Pressable
              onPress={() => selectAsActive(item)}
              style={[styles.card, active && styles.cardActive]}>
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <MapPin
                  size={20}
                  color={active ? colors.text.onPrimary : colors.brand.primary}
                  strokeWidth={2.4}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{item.label}</Text>
                  {item.isDefault && (
                    <View style={styles.defaultTag}>
                      <Star size={10} color={colors.brand.primary} fill={colors.brand.primary} />
                      <Text style={styles.defaultTagText}>{tr('picker.main')}</Text>
                    </View>
                  )}
                  {active && (
                    <View style={styles.activeTag}>
                      <Check size={11} color={colors.text.onPrimary} strokeWidth={3} />
                      <Text style={styles.activeTagText}>{tr('addr.active')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.address} numberOfLines={2}>
                  {item.address}
                </Text>
                <View style={styles.actions}>
                  {!item.isDefault && (
                    <Pressable
                      hitSlop={6}
                      onPress={() => setDefaultMutation.mutate(item.id)}
                      style={styles.actionBtn}>
                      <Star size={14} color={colors.text.tertiary} strokeWidth={2.2} />
                      <Text style={styles.actionText}>{tr('addr.makeDefault')}</Text>
                    </Pressable>
                  )}
                  <Pressable
                    hitSlop={6}
                    onPress={() => confirmDelete(item)}
                    style={styles.actionBtn}>
                    <Trash2 size={14} color={colors.text.danger} strokeWidth={2.2} />
                    <Text style={[styles.actionText, { color: colors.text.danger }]}>{tr('addr.delete')}</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          adding ? (
            <View style={styles.form}>
              <Text style={styles.formTitle}>{tr('addr.new')}</Text>
              <TextInput
                style={styles.input}
                placeholder={tr('addr.label')}
                value={label}
                onChangeText={setLabel}
                placeholderTextColor={colors.text.hint}
              />
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder={tr('addr.addressPlaceholder')}
                value={address}
                onChangeText={setAddress}
                multiline
                placeholderTextColor={colors.text.hint}
              />

              <Pressable style={styles.mapBtn} onPress={() => setPickerVisible(true)}>
                <MapPin size={18} color={colors.brand.primary} strokeWidth={2.4} />
                <Text style={styles.mapBtnText}>
                  {picked ? tr('addr.pickOnMapAgain') : tr('addr.pickOnMap')}
                </Text>
              </Pressable>

              <Text style={styles.gpsHint}>
                {picked
                  ? `📍 ${picked.latitude.toFixed(5)}, ${picked.longitude.toFixed(5)}`
                  : coords
                    ? `📍 ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
                    : tr('home.locationLoading')}
              </Text>

              <Pressable
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                disabled={!canSave || createMutation.isPending}
                onPress={() => createMutation.mutate()}>
                <Text style={styles.saveBtnText}>
                  {createMutation.isPending ? tr('addr.saving') : tr('addr.save')}
                </Text>
              </Pressable>
              <Pressable onPress={resetForm} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>{tr('common.cancel')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.addBtn} onPress={() => setAdding(true)}>
              <Text style={styles.addBtnText}>{tr('addr.add')}</Text>
            </Pressable>
          )
        }
      />

      <LocationPickerModal
        visible={pickerVisible}
        initial={picked ?? coords}
        onCancel={() => setPickerVisible(false)}
        onConfirm={onPickConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  list: { padding: layout.screenPadding, gap: spacing.md },
  hint: { ...typography.bodySmall, color: colors.text.secondary, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  cardActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primarySurface },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.brand.primary },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  label: { ...typography.bodyStrong, color: colors.text.primary },
  defaultTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.brand.primarySurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  defaultTagText: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  activeTagText: { ...typography.caption, color: colors.text.onPrimary, fontWeight: '700' },
  address: { ...typography.bodySmall, color: colors.text.secondary, marginTop: 3 },
  actions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { ...typography.caption, color: colors.text.tertiary, fontWeight: '600' },

  addBtn: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    borderStyle: 'dashed',
  },
  addBtnText: { ...typography.body, color: colors.brand.primary, fontWeight: '700' },

  form: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.sm,
  },
  formTitle: { ...typography.h4, color: colors.text.primary },
  input: {
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  inputMultiline: { height: 76, textAlignVertical: 'top' },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primarySurface,
  },
  mapBtnText: { ...typography.body, color: colors.brand.primary, fontWeight: '700' },
  gpsHint: { ...typography.caption, color: colors.text.tertiary },
  saveBtn: {
    backgroundColor: colors.brand.primary,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.border.strong },
  saveBtnText: { ...typography.body, color: colors.text.onPrimary, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { ...typography.body, color: colors.text.secondary },
});
