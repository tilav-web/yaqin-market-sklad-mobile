import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { LatLng, Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, extractErrorMessage } from '@/lib/api';
import { GeoJsonPolygon, PublicShop } from '@/lib/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';

const QARSHI = { latitude: 38.8446827, longitude: 65.7803532 };
const OUTER_DELTA = 0.012; // ~1.3 km
const INNER_DELTA = 0.004; // ~0.4 km

function makeRect(center: LatLng, delta: number): LatLng[] {
  return [
    { latitude: center.latitude + delta, longitude: center.longitude - delta },
    { latitude: center.latitude + delta, longitude: center.longitude + delta },
    { latitude: center.latitude - delta, longitude: center.longitude + delta },
    { latitude: center.latitude - delta, longitude: center.longitude - delta },
  ];
}

function toGeoJson(verts: LatLng[]): GeoJsonPolygon {
  const ring = verts.map<[number, number]>((v) => [v.longitude, v.latitude]);
  ring.push(ring[0]);
  return { type: 'Polygon', coordinates: [ring] };
}

function fromGeoJson(polygon: GeoJsonPolygon): LatLng[] {
  return polygon.coordinates[0]
    .slice(0, -1)
    .map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

export default function DeliveryZonesScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [deliveryVerts, setDeliveryVerts] = useState<LatLng[]>([]);
  const [freeVerts, setFreeVerts] = useState<LatLng[]>([]);
  const [initialized, setInitialized] = useState(false);

  const shopQuery = useQuery({
    queryKey: ['shop', shopId],
    queryFn: async () => {
      const res = await api.get<PublicShop>(`/seller/shops/${shopId}`);
      return res.data;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!shopQuery.data || initialized) return;
    const s = shopQuery.data as PublicShop & {
      deliveryPolygon?: GeoJsonPolygon | null;
      freeDeliveryPolygon?: GeoJsonPolygon | null;
    };
    const center = { latitude: s.latitude, longitude: s.longitude };
    setDeliveryVerts(s.deliveryPolygon ? fromGeoJson(s.deliveryPolygon) : makeRect(center, OUTER_DELTA));
    setFreeVerts(s.freeDeliveryPolygon ? fromGeoJson(s.freeDeliveryPolygon) : makeRect(center, INNER_DELTA));
    setInitialized(true);
  }, [shopQuery.data, initialized]);

  const shopCoord = shopQuery.data
    ? { latitude: shopQuery.data.latitude, longitude: shopQuery.data.longitude }
    : QARSHI;

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/seller/shops/${shopId}/delivery-zones`, {
        deliveryPolygon: toGeoJson(deliveryVerts),
        freeDeliveryPolygon: toGeoJson(freeVerts),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop', shopId] });
      Alert.alert('Saqlandi', 'Yetkazib berish chegaralari yangilandi.');
      router.back();
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const updateDelivery = (i: number, coord: LatLng) =>
    setDeliveryVerts((prev) => prev.map((v, idx) => (idx === i ? coord : v)));

  const updateFree = (i: number, coord: LatLng) =>
    setFreeVerts((prev) => prev.map((v, idx) => (idx === i ? coord : v)));

  return (
    <View style={styles.root}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{ ...shopCoord, latitudeDelta: OUTER_DELTA * 3, longitudeDelta: OUTER_DELTA * 3 }}
      >
        {/* Shop pin */}
        <Marker coordinate={shopCoord} title={shopQuery.data?.name} pinColor={colors.brand.primary} />

        {/* Delivery zone polygon */}
        {deliveryVerts.length === 4 && (
          <Polygon
            coordinates={deliveryVerts}
            fillColor="rgba(34,197,94,0.12)"
            strokeColor="#22c55e"
            strokeWidth={2}
          />
        )}

        {/* Free delivery zone polygon */}
        {freeVerts.length === 4 && (
          <Polygon
            coordinates={freeVerts}
            fillColor="rgba(59,130,246,0.12)"
            strokeColor="#3b82f6"
            strokeWidth={2}
          />
        )}

        {/* Draggable corners — delivery (green) */}
        {deliveryVerts.map((v, i) => (
          <Marker
            key={`d-${i}`}
            coordinate={v}
            draggable
            anchor={{ x: 0.5, y: 0.5 }}
            onDragEnd={(e) => {
              if (e?.nativeEvent?.coordinate) updateDelivery(i, e.nativeEvent.coordinate);
            }}
          >
            <View style={[styles.corner, styles.cornerGreen]} />
          </Marker>
        ))}

        {/* Draggable corners — free delivery (blue) */}
        {freeVerts.map((v, i) => (
          <Marker
            key={`f-${i}`}
            coordinate={v}
            draggable
            anchor={{ x: 0.5, y: 0.5 }}
            onDragEnd={(e) => {
              if (e?.nativeEvent?.coordinate) updateFree(i, e.nativeEvent.coordinate);
            }}
          >
            <View style={[styles.corner, styles.cornerBlue]} />
          </Marker>
        ))}
      </MapView>

      {/* Header */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          Yetkazib berish hududi
        </Text>
        <Pressable
          style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.6 }]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save size={16} color="#fff" />
          <Text style={styles.saveBtnText}>
            {saveMutation.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
          </Text>
        </Pressable>
      </SafeAreaView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Yetkazib berish — yashil burchaklarni torting</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
          <Text style={styles.legendText}>Tekin yetkazish — ko'k burchaklarni torting</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },

  corner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: '#fff',
  },
  cornerGreen: { backgroundColor: '#22c55e' },
  cornerBlue: { backgroundColor: '#3b82f6' },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.96)',
    ...shadow.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  title: { flex: 1, ...typography.bodyStrong, color: colors.text.primary },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  saveBtnText: { ...typography.bodySmall, color: '#fff', fontWeight: '700' },

  legend: {
    position: 'absolute',
    bottom: 24,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadow.md,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  legendText: { ...typography.caption, color: colors.text.secondary, flex: 1 },
});
