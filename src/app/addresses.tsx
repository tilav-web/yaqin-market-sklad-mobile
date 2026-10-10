import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddressCard } from '@/components/addresses/AddressCard';
import { AddressForm } from '@/components/addresses/AddressForm';
import { LocationPickerModal, PickedLocation } from '@/components/LocationPickerModal';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { UserAddress } from '@/lib/types';
import { useLocationStore, useEffectiveCoords } from '@/stores/location';
import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';

function capitalizeLabel(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  return trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase();
}

export default function AddressesScreen() {
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const coords = useEffectiveCoords();

  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const setSelectedAddress = useLocationStore((s) => s.setSelectedAddress);
  const switchToCurrentLocation = useLocationStore((s) => s.switchToCurrentLocation);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [intercom, setIntercom] = useState('');
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
    setEntrance('');
    setFloor('');
    setApartment('');
    setIntercom('');
    setPicked(null);
    setAdding(false);
    setEditingId(null);
  };

  const startEdit = (item: UserAddress) => {
    haptics.selection();
    setEditingId(item.id);
    setLabel(item.label);
    setAddress(item.address);
    setEntrance(item.entrance ?? '');
    setFloor(item.floor ?? '');
    setApartment(item.apartment ?? '');
    setIntercom(item.intercom ?? '');
    setPicked({ latitude: item.latitude, longitude: item.longitude, address: item.address });
    setAdding(true);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const point = picked ?? coords;
      if (!point) throw new Error(tr('addr.noLocation'));
      const res = await api.post<UserAddress>('/users/me/addresses', {
        label: capitalizeLabel(label),
        address,
        latitude: point.latitude,
        longitude: point.longitude,
        entrance: entrance.trim() || undefined,
        floor: floor.trim() || undefined,
        apartment: apartment.trim() || undefined,
        intercom: intercom.trim() || undefined,
        isDefault: (addressesQuery.data?.length ?? 0) === 0,
        evidence: picked?.evidence,
      });
      return res.data;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      setSelectedAddress(created);
      resetForm();
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const res = await api.patch<UserAddress>(`/users/me/addresses/${editingId}`, {
        label: capitalizeLabel(label),
        address,
        ...(picked ? { latitude: picked.latitude, longitude: picked.longitude, evidence: picked.evidence } : {}),
        entrance: entrance.trim(),
        floor: floor.trim(),
        apartment: apartment.trim(),
        intercom: intercom.trim(),
      });
      return res.data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      if (updated && selectedAddress?.id === updated.id) setSelectedAddress(updated);
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
      if (selectedAddress?.id === id) switchToCurrentLocation();
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const onPickConfirm = (result: PickedLocation) => {
    setPicked(result);
    if (result.address) setAddress(result.address);
    setPickerVisible(false);
    setAdding(true);
  };

  const confirmDelete = (item: UserAddress) =>
    Alert.alert(tr('addr.delete'), tr('addr.deleteConfirm'), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('addr.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
    ]);

  const canSave = !!label.trim() && !!address.trim() && (!!editingId || !!(picked ?? coords));
  const isPending = createMutation.isPending || updateMutation.isPending;
  const { colors: activeColors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: activeColors.bg.canvas }} edges={['bottom']}>
      <FlatList
        data={addressesQuery.data ?? []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={<Text style={{ fontSize: 12, color: activeColors.text.secondary, marginBottom: 4 }}>{tr('addr.hint')}</Text>}
        renderItem={({ item }) => (
          <AddressCard
            item={item}
            active={selectedAddress?.id === item.id}
            onSelect={() => {
              haptics.selection();
              setSelectedAddress(item);
            }}
            onSetDefault={() => setDefaultMutation.mutate(item.id)}
            onEdit={() => startEdit(item)}
            onDelete={() => confirmDelete(item)}
          />
        )}
        ListFooterComponent={
          adding ? (
            <AddressForm
              isEditing={Boolean(editingId)}
              label={label}
              onChangeLabel={setLabel}
              address={address}
              onChangeAddress={setAddress}
              entrance={entrance}
              onChangeEntrance={setEntrance}
              floor={floor}
              onChangeFloor={setFloor}
              apartment={apartment}
              onChangeApartment={setApartment}
              intercom={intercom}
              onChangeIntercom={setIntercom}
              onPickMap={() => setPickerVisible(true)}
              canSave={canSave}
              isPending={isPending}
              onSave={() => (editingId ? updateMutation.mutate() : createMutation.mutate())}
              onCancel={resetForm}
            />
          ) : (
            <Pressable
              className="bg-surface rounded-2xl p-4 items-center border-[1.5px] border-dashed border-brand-primary"
              onPress={() => setPickerVisible(true)}>
              <Text className="text-base font-bold text-brand-primary">{tr('addr.add')}</Text>
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
