import * as Location from 'expo-location';
import { Check, MapPin, Navigation, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PILOT_CITY_CENTER } from '@/constants/geo';
import { useTranslation } from '@/i18n';
import { captureEvidence, LocationEvidencePayload, toEvidence } from '@/lib/location-evidence';
import { colors, shadow, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  address: string;
  evidence?: LocationEvidencePayload;
}

interface Props {
  readonly visible: boolean;
  readonly initial?: { latitude: number; longitude: number } | null;
  readonly onCancel: () => void;
  readonly onConfirm: (result: PickedLocation) => void;
}

const FALLBACK = PILOT_CITY_CENTER;

function formatGeocode(parts: Location.LocationGeocodedAddress | undefined): string {
  if (!parts) return '';
  const segments = [
    parts.street,
    parts.streetNumber,
    parts.district,
    parts.city ?? parts.subregion,
  ].filter((s): s is string => !!s && s.trim().length > 0);
  const seen = new Set<string>();
  const unique = segments.filter((s) => (seen.has(s) ? false : (seen.add(s), true)));
  return unique.join(', ');
}

/**
 * Full-screen map picker with NativeWind.
 */
export function LocationPickerModal({ visible, initial, onCancel, onConfirm }: Props) {
  const { tr } = useTranslation();
  const start = initial ?? FALLBACK;
  const [center, setCenter] = useState(start);
  const [addressLabel, setAddressLabel] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);
  const [lift] = useState(() => new Animated.Value(0));
  const deviceFixRef = useRef<LocationEvidencePayload | null>(null);

  const [syncedVisible, setSyncedVisible] = useState<boolean | null>(null);
  if (syncedVisible !== visible) {
    setSyncedVisible(visible);
    if (visible) {
      setCenter(start);
      setAddressLabel('');
    }
  }

  useEffect(() => {
    if (!visible) return;
    deviceFixRef.current = null;
    void captureEvidence({ source: 'map_pick' }).then((evidence) => {
      if (evidence) deviceFixRef.current = evidence;
    });
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

  const onRegionChange = () => {
    Animated.spring(lift, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  };

  const onRegionChangeComplete = (r: Region) => {
    Animated.spring(lift, { toValue: 0, friction: 5, tension: 120, useNativeDriver: true }).start();
    setCenter({ latitude: r.latitude, longitude: r.longitude });
    reverseGeocode(r.latitude, r.longitude);
  };

  const recenterToMyLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      deviceFixRef.current = toEvidence(pos, 'foreground');
      haptics.selection();
      mapRef.current?.animateToRegion(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        450,
      );
    } catch {
      // GPS unavailable
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = () => {
    haptics.success();
    onConfirm({
      latitude: center.latitude,
      longitude: center.longitude,
      address: addressLabel,
      evidence: deviceFixRef.current ?? undefined,
    });
  };

  const pinTranslateY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const pinScale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const groundScale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });
  const groundOpacity = lift.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.12] });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View className="flex-1">
        <MapView
          ref={mapRef}
          className="flex-1"
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: start.latitude,
            longitude: start.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onRegionChange={onRegionChange}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
        />

        {/* Fixed center pin */}
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <Animated.View style={{ transform: [{ translateY: pinTranslateY }, { scale: pinScale }] }}>
            <View style={shadow.md}>
              <MapPin size={46} color={colors.brand.primary} strokeWidth={2.3} fill={colors.brand.primarySurface} />
            </View>
          </Animated.View>
          <Animated.View
            className="w-4 h-1.5 rounded-full bg-black -mt-1"
            style={[
              {
                opacity: groundOpacity,
                transform: [{ scaleX: groundScale }],
              },
            ]}
          />
        </View>

        {/* Top bar */}
        <SafeAreaView edges={['top']} className="absolute top-0 inset-x-0 flex-row items-center gap-2 px-4 pt-2" pointerEvents="box-none">
          <Pressable
            className="w-10 h-10 rounded-full items-center justify-center"
            style={[{ backgroundColor: colors.bg.surface }, shadow.md]}
            onPress={onCancel}
            hitSlop={8}
          >
            <X size={22} color={colors.text.primary} strokeWidth={2.4} />
          </Pressable>
          <View
            className="flex-1 rounded-full px-3 py-2"
            style={[{ backgroundColor: colors.bg.surface }, shadow.md]}
          >
            <Text className="text-xs" style={{ color: colors.text.secondary }} numberOfLines={1}>
              {tr('locpicker.dragHint')}
            </Text>
          </View>
        </SafeAreaView>

        {/* Floating "use my current location" button */}
        <Pressable
          className="absolute right-4 bottom-52 w-12 h-12 rounded-full items-center justify-center"
          style={[{ backgroundColor: colors.bg.surface }, shadow.md]}
          onPress={recenterToMyLocation}
          hitSlop={8}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : (
            <Navigation size={20} color={colors.brand.primary} strokeWidth={2.4} />
          )}
        </Pressable>

        {/* Bottom confirmation card */}
        <SafeAreaView edges={['bottom']} className="absolute inset-x-0 bottom-0" pointerEvents="box-none">
          <View
            className="m-4 rounded-3xl p-4 gap-3"
            style={[{ backgroundColor: colors.bg.surface }, shadow.lg]}
          >
            <View className="flex-row items-center gap-2">
              <MapPin size={18} color={colors.brand.primary} strokeWidth={2.4} />
              <View className="flex-1">
                {geocoding ? (
                  <Text style={[typography.body, { color: colors.text.primary }]}>{tr('locpicker.detecting')}</Text>
                ) : (
                  <Text className="font-semibold" style={[typography.body, { color: colors.text.primary }]} numberOfLines={2}>
                    {addressLabel || tr('locpicker.selectedPoint')}
                  </Text>
                )}
              </View>
            </View>
            <Pressable
              className="flex-row items-center justify-center gap-2 h-12 rounded-2xl"
              style={{ backgroundColor: colors.brand.primary }}
              onPress={handleConfirm}
            >
              <Check size={18} color={colors.text.onPrimary} strokeWidth={2.6} />
              <Text className="font-bold" style={[typography.body, { color: colors.text.onPrimary }]}>
                {tr('locpicker.confirm')}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
