import * as Location from 'expo-location';
import { Check, MapPin, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  address: string;
}

interface Props {
  readonly visible: boolean;
  readonly initial?: { latitude: number; longitude: number } | null;
  readonly onCancel: () => void;
  readonly onConfirm: (result: PickedLocation) => void;
}

// Qarshi markazi — boshlang'ich koordinatasi bo'lmaganda fallback.
const FALLBACK = { latitude: 38.8446827, longitude: 65.7803532 };

function formatGeocode(parts: Location.LocationGeocodedAddress | undefined): string {
  if (!parts) return '';
  const segments = [
    parts.street,
    parts.streetNumber,
    parts.district,
    parts.city ?? parts.subregion,
  ].filter((s): s is string => !!s && s.trim().length > 0);
  // De-dupe adjacent repeats (geocoder sometimes returns city == subregion).
  const seen = new Set<string>();
  const unique = segments.filter((s) => (seen.has(s) ? false : (seen.add(s), true)));
  return unique.join(', ');
}

/**
 * Full-screen map picker. A pin stays fixed at the screen center while the map
 * pans beneath it; whatever sits under the pin is the chosen point. The address
 * label is reverse-geocoded (debounced) after each pan settles.
 */
export function LocationPickerModal({ visible, initial, onCancel, onConfirm }: Props) {
  const { tr } = useTranslation();
  const start = initial ?? FALLBACK;
  const [center, setCenter] = useState(start);
  const [addressLabel, setAddressLabel] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to the starting point whenever the modal (re)opens.
  useEffect(() => {
    if (visible) {
      setCenter(start);
      setAddressLabel('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const reverseGeocode = (lat: number, lng: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setGeocoding(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        setAddressLabel(formatGeocode(results[0]));
      } catch {
        setAddressLabel('');
      } finally {
        setGeocoding(false);
      }
    }, 450);
  };

  const onRegionChangeComplete = (r: Region) => {
    setCenter({ latitude: r.latitude, longitude: r.longitude });
    reverseGeocode(r.latitude, r.longitude);
  };

  const handleConfirm = () => {
    haptics.success();
    onConfirm({
      latitude: center.latitude,
      longitude: center.longitude,
      address: addressLabel,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.fill}>
        <MapView
          style={styles.fill}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: start.latitude,
            longitude: start.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
        />

        {/* Fixed center pin (sits visually above the map's center point). */}
        <View pointerEvents="none" style={styles.pinWrap}>
          <MapPin size={40} color={colors.brand.primary} strokeWidth={2.5} fill={colors.brand.primarySurface} />
          <View style={styles.pinDot} />
        </View>

        {/* Top bar */}
        <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
          <Pressable style={styles.closeBtn} onPress={onCancel} hitSlop={8}>
            <X size={22} color={colors.text.primary} strokeWidth={2.4} />
          </Pressable>
          <View style={styles.topHint}>
            <Text style={styles.topHintText} numberOfLines={1}>
              {tr('locpicker.dragHint')}
            </Text>
          </View>
        </SafeAreaView>

        {/* Bottom confirmation card */}
        <SafeAreaView edges={['bottom']} style={styles.bottom} pointerEvents="box-none">
          <View style={styles.card}>
            <View style={styles.addrRow}>
              <MapPin size={18} color={colors.brand.primary} strokeWidth={2.4} />
              <View style={{ flex: 1 }}>
                {geocoding ? (
                  <Text style={styles.addrText}>{tr('locpicker.detecting')}</Text>
                ) : (
                  <Text style={styles.addrText} numberOfLines={2}>
                    {addressLabel || tr('locpicker.selectedPoint')}
                  </Text>
                )}
                <Text style={styles.coordText}>
                  {center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}
                </Text>
              </View>
            </View>
            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Check size={18} color={colors.text.onPrimary} strokeWidth={2.6} />
              <Text style={styles.confirmText}>{tr('locpicker.confirm')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pinWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Lift the pin so its tip (not its center) marks the point, and add a ground dot.
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.primary,
    marginTop: -6,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  topHint: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadow.md,
  },
  topHintText: { ...typography.caption, color: colors.text.secondary },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    margin: layout.screenPadding,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.lg,
  },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addrText: { ...typography.body, fontWeight: '600', color: colors.text.primary },
  coordText: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
  },
  confirmText: { ...typography.body, fontWeight: '700', color: colors.text.onPrimary },
});
