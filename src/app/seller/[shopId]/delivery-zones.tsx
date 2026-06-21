import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, RotateCcw, Save, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { LatLng, Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, extractErrorMessage } from '@/lib/api';
import { GeoJsonPolygon, PublicShop } from '@/lib/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

type Mode = 'delivery' | 'free';

function toLatLng(coords: [number, number][]): LatLng[] {
  return coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

function toGeoJson(vertices: LatLng[]): GeoJsonPolygon {
  const ring = vertices.map<[number, number]>((v) => [v.longitude, v.latitude]);
  // Close the ring
  if (ring.length > 0) ring.push(ring[0]);
  return { type: 'Polygon', coordinates: [ring] };
}

const QARSHI = { latitude: 38.8446827, longitude: 65.7803532 };

export default function DeliveryZonesScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const mapRef = useRef<MapView>(null);

  const [mode, setMode] = useState<Mode>('delivery');
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

  // Load existing polygons from server on first fetch
  if (shopQuery.data && !initialized) {
    const s = shopQuery.data as PublicShop & {
      deliveryPolygon?: GeoJsonPolygon | null;
      freeDeliveryPolygon?: GeoJsonPolygon | null;
    };
    if (s.deliveryPolygon?.coordinates[0]) {
      const ring = s.deliveryPolygon.coordinates[0];
      setDeliveryVerts(toLatLng(ring.slice(0, -1))); // remove closing duplicate
    }
    if (s.freeDeliveryPolygon?.coordinates[0]) {
      const ring = s.freeDeliveryPolygon.coordinates[0];
      setFreeVerts(toLatLng(ring.slice(0, -1)));
    }
    setInitialized(true);
  }

  const shop = shopQuery.data;
  const shopCoord = shop
    ? { latitude: shop.latitude, longitude: shop.longitude }
    : QARSHI;

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/seller/shops/${shopId}/delivery-zones`, {
        deliveryPolygon: deliveryVerts.length >= 3 ? toGeoJson(deliveryVerts) : null,
        freeDeliveryPolygon: freeVerts.length >= 3 ? toGeoJson(freeVerts) : null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop', shopId] });
      Alert.alert('Saqlandi', 'Yetkazib berish chegaralari yangilandi.');
      router.back();
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const currentVerts = mode === 'delivery' ? deliveryVerts : freeVerts;
  const setCurrentVerts = mode === 'delivery' ? setDeliveryVerts : setFreeVerts;

  const handleMapPress = (e: { nativeEvent: { coordinate: LatLng } }) => {
    haptics.selection();
    setCurrentVerts((prev) => [...prev, e.nativeEvent.coordinate]);
  };

  const handleUndo = () => {
    haptics.selection();
    setCurrentVerts((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    Alert.alert(
      'Tozalash',
      mode === 'delivery'
        ? "Yetkazib berish chegarasini o'chirasizmi?"
        : "Tekin yetkazib berish chegarasini o'chirasizmi?",
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: () => {
            haptics.warning();
            setCurrentVerts([]);
          },
        },
      ],
    );
  };

  const modeTitle = mode === 'delivery' ? 'Yetkazib berish hududi' : 'Tekin yetkazib berish hududi';
  const vertsCount = currentVerts.length;

  return (
    <View style={styles.root}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          ...shopCoord,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={handleMapPress}>

        {/* Shop marker */}
        <Marker coordinate={shopCoord} title={shop?.name ?? 'Do\'kon'} pinColor={colors.brand.primary} />

        {/* Delivery polygon */}
        {deliveryVerts.length >= 3 && (
          <Polygon
            coordinates={deliveryVerts}
            fillColor="rgba(34,197,94,0.15)"
            strokeColor={colors.feedback.success}
            strokeWidth={2}
          />
        )}
        {/* Delivery polygon vertices while drawing */}
        {mode === 'delivery' && deliveryVerts.length > 0 && deliveryVerts.length < 3 && (
          <Polyline
            coordinates={deliveryVerts}
            strokeColor={colors.feedback.success}
            strokeWidth={2}
          />
        )}
        {mode === 'delivery' && deliveryVerts.map((v, i) => (
          <Marker
            key={`d-${i}`}
            coordinate={v}
            anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.dot} />
          </Marker>
        ))}

        {/* Free delivery polygon */}
        {freeVerts.length >= 3 && (
          <Polygon
            coordinates={freeVerts}
            fillColor="rgba(59,130,246,0.15)"
            strokeColor={colors.brand.primary}
            strokeWidth={2}
          />
        )}
        {mode === 'free' && freeVerts.length > 0 && freeVerts.length < 3 && (
          <Polyline
            coordinates={freeVerts}
            strokeColor={colors.brand.primary}
            strokeWidth={2}
          />
        )}
        {mode === 'free' && freeVerts.map((v, i) => (
          <Marker
            key={`f-${i}`}
            coordinate={v}
            anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.dot, styles.dotBlue]} />
          </Marker>
        ))}
      </MapView>

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>Yetkazib berish chegarasi</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      {/* Mode toggle */}
      <View style={styles.toggleCard}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'delivery' && styles.toggleBtnActiveGreen]}
          onPress={() => { haptics.selection(); setMode('delivery'); }}>
          <View style={[styles.colorDot, { backgroundColor: colors.feedback.success }]} />
          <Text style={[styles.toggleText, mode === 'delivery' && styles.toggleTextActive]}>
            Yetkazib berish
          </Text>
          {deliveryVerts.length >= 3 && (
            <Text style={styles.toggleCount}>{deliveryVerts.length} nuqta</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'free' && styles.toggleBtnActiveBlue]}
          onPress={() => { haptics.selection(); setMode('free'); }}>
          <View style={[styles.colorDot, { backgroundColor: colors.brand.primary }]} />
          <Text style={[styles.toggleText, mode === 'free' && styles.toggleTextActive]}>
            Tekin yetkazish
          </Text>
          {freeVerts.length >= 3 && (
            <Text style={styles.toggleCount}>{freeVerts.length} nuqta</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <View style={styles.hintCard}>
        <MapPin size={14} color={colors.text.secondary} strokeWidth={2} />
        <Text style={styles.hintText}>
          {vertsCount === 0
            ? `Xaritada ${modeTitle.toLowerCase()}ni chizing`
            : vertsCount < 3
            ? `Yana ${3 - vertsCount} ta nuqta bosing`
            : `${vertsCount} nuqta — polygon tayyor`}
        </Text>
      </View>

      {/* Bottom toolbar */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <TouchableOpacity
          style={[styles.toolBtn, vertsCount === 0 && styles.toolBtnDisabled]}
          onPress={handleUndo}
          disabled={vertsCount === 0}>
          <RotateCcw size={18} color={vertsCount === 0 ? colors.text.hint : colors.text.primary} />
          <Text style={[styles.toolBtnText, vertsCount === 0 && { color: colors.text.hint }]}>Orqaga</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolBtn, vertsCount === 0 && styles.toolBtnDisabled]}
          onPress={handleClear}
          disabled={vertsCount === 0}>
          <Trash2 size={18} color={vertsCount === 0 ? colors.text.hint : colors.feedback.danger} />
          <Text style={[styles.toolBtnText, vertsCount === 0 && { color: colors.text.hint }, { color: vertsCount > 0 ? colors.feedback.danger : colors.text.hint }]}>
            Tozalash
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.6 }]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}>
          <Save size={18} color={colors.text.onPrimary} />
          <Text style={styles.saveBtnText}>
            {saveMutation.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.feedback.success,
    borderWidth: 2,
    borderColor: '#fff',
  },
  dotBlue: { backgroundColor: colors.brand.primary },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
    ...shadow.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { flex: 1, textAlign: 'center', ...typography.bodyStrong, color: colors.text.primary },

  toggleCard: {
    position: 'absolute',
    top: 100,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  toggleBtnActiveGreen: { borderColor: colors.feedback.success, backgroundColor: 'rgba(240,253,244,0.97)' },
  toggleBtnActiveBlue: { borderColor: colors.brand.primary, backgroundColor: 'rgba(239,246,255,0.97)' },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  toggleText: { ...typography.caption, fontWeight: '600', color: colors.text.secondary, flex: 1 },
  toggleTextActive: { color: colors.text.primary },
  toggleCount: { ...typography.overline, color: colors.text.tertiary },

  hintCard: {
    position: 'absolute',
    top: 162,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadow.xs,
  },
  hintText: { ...typography.caption, color: colors.text.secondary },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.97)',
    ...shadow.lg,
  },
  toolBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    minWidth: 72,
  },
  toolBtnDisabled: { opacity: 0.4 },
  toolBtnText: { ...typography.overline, color: colors.text.primary, fontWeight: '700' },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
  },
  saveBtnText: { ...typography.button, color: colors.text.onPrimary },
});
