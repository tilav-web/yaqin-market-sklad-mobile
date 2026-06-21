import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Pencil, RotateCcw, Save, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { LatLng, Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Line, Svg } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, extractErrorMessage } from '@/lib/api';
import { GeoJsonPolygon, PublicShop } from '@/lib/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';

/* ── constants ── */
const QARSHI = { latitude: 38.8446827, longitude: 65.7803532 };
const SNAP_PX = 44; // pixels — auto-close snap radius

type ZoneKey = 'delivery' | 'free';

/* ── geo helpers ── */
function toGeoJson(verts: LatLng[]): GeoJsonPolygon {
  const ring = verts.map<[number, number]>((v) => [v.longitude, v.latitude]);
  ring.push(ring[0]);
  return { type: 'Polygon', coordinates: [ring] };
}
function fromGeoJson(p: GeoJsonPolygon): LatLng[] {
  return p.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

/* ── component ── */
export default function DeliveryZonesScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const mapRef = useRef<MapView>(null);
  const mapWrapRef = useRef<View>(null);
  // Map view page-absolute offset (for coordinateForPoint conversion)
  const mapOffset = useRef({ x: 0, y: 0 });
  // Screen position of the first vertex of the active zone (for snap-close)
  const firstPx = useRef<{ x: number; y: number } | null>(null);

  /* zone vertices */
  const [zone, setZone] = useState<ZoneKey>('delivery');
  const [dverts, setDverts] = useState<LatLng[]>([]);
  const [fverts, setFverts] = useState<LatLng[]>([]);
  const [dclosed, setDclosed] = useState(false);
  const [fclosed, setFclosed] = useState(false);

  /* drawing */
  const [pencilOn, setPencilOn] = useState(false);
  // Live SVG preview line: screen-space from last vertex → finger
  const [svgLine, setSvgLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  // Last vertex screen position (needed to draw the SVG preview)
  const lastPx = useRef<{ x: number; y: number } | null>(null);

  const [initialized, setInitialized] = useState(false);

  /* refs for PanResponder stable closures */
  const zoneRef = useRef<ZoneKey>('delivery');
  const pencilRef = useRef(false);
  const closedRef = useRef<Record<ZoneKey, boolean>>({ delivery: false, free: false });
  const vertsRef = useRef<Record<ZoneKey, LatLng[]>>({ delivery: [], free: [] });

  useEffect(() => { zoneRef.current = zone; }, [zone]);
  useEffect(() => { pencilRef.current = pencilOn; }, [pencilOn]);
  useEffect(() => { closedRef.current = { delivery: dclosed, free: fclosed }; }, [dclosed, fclosed]);
  useEffect(() => { vertsRef.current = { delivery: dverts, free: fverts }; }, [dverts, fverts]);

  /* ── shop data ── */
  const shopQuery = useQuery({
    queryKey: ['shop', shopId],
    queryFn: async () => (await api.get<PublicShop>(`/seller/shops/${shopId}`)).data,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!shopQuery.data || initialized) return;
    const s = shopQuery.data as PublicShop & {
      deliveryPolygon?: GeoJsonPolygon | null;
      freeDeliveryPolygon?: GeoJsonPolygon | null;
    };
    if (s.deliveryPolygon) { setDverts(fromGeoJson(s.deliveryPolygon)); setDclosed(true); }
    if (s.freeDeliveryPolygon) { setFverts(fromGeoJson(s.freeDeliveryPolygon)); setFclosed(true); }
    setInitialized(true);
  }, [shopQuery.data, initialized]);

  const shopCoord = shopQuery.data
    ? { latitude: shopQuery.data.latitude, longitude: shopQuery.data.longitude }
    : QARSHI;

  /* ── coordinate conversion helper (screen → map lat/lng) ── */
  const toLatLng = async (pageX: number, pageY: number): Promise<LatLng | null> => {
    try {
      const lx = pageX - mapOffset.current.x;
      const ly = pageY - mapOffset.current.y;
      return await mapRef.current?.coordinateForPoint({ x: lx, y: ly }) ?? null;
    } catch {
      return null;
    }
  };

  /* Screen position of a LatLng on the map (for snap indicator) */
  const toScreen = async (coord: LatLng): Promise<{ x: number; y: number } | null> => {
    try {
      const pt = await mapRef.current?.pointForCoordinate(coord);
      if (!pt) return null;
      return { x: pt.x + mapOffset.current.x, y: pt.y + mapOffset.current.y };
    } catch {
      return null;
    }
  };

  /* ── PanResponder (stable ref — reads mutable refs, uses stable setters) ── */
  const panRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        pencilRef.current && !closedRef.current[zoneRef.current],
      onStartShouldSetPanResponderCapture: () =>
        pencilRef.current && !closedRef.current[zoneRef.current],
      onMoveShouldSetPanResponder: () =>
        pencilRef.current && !closedRef.current[zoneRef.current],

      /* ── finger DOWN: place first vertex only if zone is empty ── */
      onPanResponderGrant: async (evt) => {
        if (!pencilRef.current || closedRef.current[zoneRef.current]) return;
        const { pageX, pageY } = evt.nativeEvent;
        const currentVerts = vertsRef.current[zoneRef.current];

        if (currentVerts.length === 0) {
          const coord = await (async () => {
            const lx = pageX - mapOffset.current.x;
            const ly = pageY - mapOffset.current.y;
            return mapRef.current?.coordinateForPoint({ x: lx, y: ly }) ?? null;
          })();
          if (!coord) return;
          firstPx.current = { x: pageX, y: pageY };
          lastPx.current = { x: pageX, y: pageY };
          if (zoneRef.current === 'delivery') setDverts([coord]);
          else setFverts([coord]);
        } else {
          // Subsequent gesture: the line starts from the last confirmed vertex screen position
          // (map is frozen, so screen positions don't drift)
          // lastPx is already set from previous release
        }
        setSvgLine(null);
      },

      /* ── finger MOVING: update SVG preview line in screen space (fast, no async) ── */
      onPanResponderMove: (evt) => {
        if (!pencilRef.current || closedRef.current[zoneRef.current]) return;
        const { pageX, pageY } = evt.nativeEvent;
        const lp = lastPx.current;
        if (!lp) return;
        setSvgLine({ x1: lp.x, y1: lp.y, x2: pageX, y2: pageY });
      },

      /* ── finger UP: add new vertex (or snap-close) ── */
      onPanResponderRelease: async (evt) => {
        if (!pencilRef.current || closedRef.current[zoneRef.current]) return;
        setSvgLine(null);
        const { pageX, pageY } = evt.nativeEvent;

        /* snap-close check */
        const fp = firstPx.current;
        if (fp && vertsRef.current[zoneRef.current].length >= 3) {
          const dist = Math.hypot(pageX - fp.x, pageY - fp.y);
          if (dist < SNAP_PX) {
            if (zoneRef.current === 'delivery') setDclosed(true);
            else setFclosed(true);
            setPencilOn(false);
            lastPx.current = null;
            firstPx.current = null;
            return;
          }
        }

        const lx = pageX - mapOffset.current.x;
        const ly = pageY - mapOffset.current.y;
        const coord = await mapRef.current?.coordinateForPoint({ x: lx, y: ly });
        if (!coord) return;

        lastPx.current = { x: pageX, y: pageY };
        if (zoneRef.current === 'delivery') setDverts((p) => [...p, coord]);
        else setFverts((p) => [...p, coord]);
      },
    })
  ).current;

  /* ── derived values ── */
  const verts = zone === 'delivery' ? dverts : fverts;
  const isClosed = zone === 'delivery' ? dclosed : fclosed;
  const dColor = '#22c55e';
  const fColor = '#3b82f6';
  const activeColor = zone === 'delivery' ? dColor : fColor;

  /* ── handlers ── */
  const handleUndo = () => {
    if (isClosed) {
      if (zone === 'delivery') setDclosed(false);
      else setFclosed(false);
      return;
    }
    if (zone === 'delivery') setDverts((p) => p.slice(0, -1));
    else setFverts((p) => p.slice(0, -1));
    lastPx.current = null;
    firstPx.current = null;
    setSvgLine(null);
  };

  const handleReset = () => {
    Alert.alert("Tozalash", "Bu zonani o'chirasizmi?", [
      { text: "Bekor", style: "cancel" },
      {
        text: "O'chirish", style: "destructive",
        onPress: () => {
          if (zone === 'delivery') { setDverts([]); setDclosed(false); }
          else { setFverts([]); setFclosed(false); }
          setPencilOn(false);
          lastPx.current = null;
          firstPx.current = null;
          setSvgLine(null);
        },
      },
    ]);
  };

  const handleClosePolygon = () => {
    if (zone === 'delivery') setDclosed(true);
    else setFclosed(true);
    setPencilOn(false);
    setSvgLine(null);
  };

  const handlePencilToggle = async () => {
    if (pencilOn) { setPencilOn(false); setSvgLine(null); return; }
    // When turning pencil on: if zone has vertices, update lastPx from last vertex
    if (verts.length > 0) {
      const sp = await toScreen(verts[verts.length - 1]);
      if (sp) lastPx.current = sp;
    } else {
      lastPx.current = null;
    }
    if (verts.length > 0 && firstPx.current === null) {
      const sp = await toScreen(verts[0]);
      if (sp) firstPx.current = sp;
    }
    setPencilOn(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/seller/shops/${shopId}/delivery-zones`, {
        deliveryPolygon: dverts.length >= 3 ? toGeoJson(dverts) : null,
        freeDeliveryPolygon: fverts.length >= 3 ? toGeoJson(fverts) : null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop', shopId] });
      Alert.alert('Saqlandi', 'Yetkazib berish chegaralari yangilandi.');
      router.back();
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  /* ── hint text ── */
  const hint = (() => {
    if (!pencilOn) return isClosed ? 'Tayyor ✓  Qayta chizish uchun qalamni bosing' : 'Qalamni bosib chizishni boshlang';
    if (isClosed) return 'Polygon yopiq';
    if (verts.length === 0) return 'Birinchi nuqtaga barmog\'ingizni qo\'ying, tortib chiziq chizing';
    if (verts.length < 3) return `Davom eting — ${verts.length} nuqta (kamida 3 kerak)`;
    return `${verts.length} nuqta — boshiga yaqinlashtirsangiz avtomatik yopiladi`;
  })();

  return (
    <View style={styles.root}>
      {/* ── MAP ── */}
      <View
        ref={mapWrapRef}
        style={styles.mapWrap}
        onLayout={() => {
          mapWrapRef.current?.measure((_x, _y, _w, _h, px, py) => {
            mapOffset.current = { x: px, y: py };
          });
        }}
      >
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          scrollEnabled={!pencilOn}
          zoomEnabled={!pencilOn}
          rotateEnabled={false}
          pitchEnabled={false}
          initialRegion={{ ...shopCoord, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
        >
          {/* Shop pin */}
          <Marker coordinate={shopCoord} title={shopQuery.data?.name} pinColor={colors.brand.primary} />

          {/* Delivery zone */}
          {dverts.length >= 3 && dclosed && (
            <Polygon coordinates={dverts} strokeColor={dColor} strokeWidth={2.5} fillColor="rgba(34,197,94,0.14)" />
          )}
          {dverts.length >= 2 && !dclosed && (
            <Polyline coordinates={dverts} strokeColor={dColor} strokeWidth={2.5} />
          )}

          {/* Free zone */}
          {fverts.length >= 3 && fclosed && (
            <Polygon coordinates={fverts} strokeColor={fColor} strokeWidth={2.5} fillColor="rgba(59,130,246,0.14)" />
          )}
          {fverts.length >= 2 && !fclosed && (
            <Polyline coordinates={fverts} strokeColor={fColor} strokeWidth={2.5} />
          )}

          {/* Closing guide (last → first dashed) */}
          {pencilOn && !isClosed && verts.length >= 3 && (
            <Polyline
              coordinates={[verts[verts.length - 1], verts[0]]}
              strokeColor={activeColor}
              strokeWidth={1.5}
              lineDashPattern={[5, 7]}
            />
          )}

          {/* First vertex snap target */}
          {pencilOn && !isClosed && verts.length > 0 && (
            <Marker coordinate={verts[0]} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={[styles.snapTarget, { borderColor: activeColor }]} />
            </Marker>
          )}
        </MapView>

        {/* ── SVG overlay: live preview line (screen space, fast, no async) ── */}
        {pencilOn && svgLine && (
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Line
              x1={svgLine.x1 - mapOffset.current.x}
              y1={svgLine.y1 - mapOffset.current.y}
              x2={svgLine.x2 - mapOffset.current.x}
              y2={svgLine.y2 - mapOffset.current.y}
              stroke={activeColor}
              strokeWidth={2.5}
              strokeDasharray="6,5"
            />
          </Svg>
        )}

        {/* ── Touch overlay: captures gestures when pencil is on ── */}
        {pencilOn && !isClosed && (
          <View style={StyleSheet.absoluteFill} {...panRef.panHandlers} />
        )}
      </View>

      {/* ── HEADER ── */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text.primary} />
        </Pressable>

        {/* Zone tabs */}
        <View style={styles.zoneTabs}>
          {(['delivery', 'free'] as ZoneKey[]).map((z) => {
            const col = z === 'delivery' ? dColor : fColor;
            const active = zone === z;
            return (
              <TouchableOpacity
                key={z}
                style={[styles.zoneTab, active && { borderColor: col, backgroundColor: col + '22' }]}
                onPress={() => {
                  if (pencilOn) return; // can't switch zone while drawing
                  setZone(z);
                  lastPx.current = null;
                  firstPx.current = null;
                }}
              >
                <View style={[styles.zoneDot, { backgroundColor: col }]} />
                <Text style={[styles.zoneTabText, active && { color: colors.text.primary }]}>
                  {z === 'delivery' ? 'Yetkazib berish' : 'Tekin'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Pressable
          style={[styles.iconBtn, saveMutation.isPending && { opacity: 0.5 }]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save size={20} color={colors.brand.primary} />
        </Pressable>
      </SafeAreaView>

      {/* ── BOTTOM BAR ── */}
      <SafeAreaView style={styles.bottom} edges={['bottom']}>
        <Text style={styles.hint} numberOfLines={2}>{hint}</Text>

        <View style={styles.toolRow}>
          {/* Undo */}
          <TouchableOpacity
            style={[styles.toolBtn, verts.length === 0 && styles.disabled]}
            disabled={verts.length === 0}
            onPress={handleUndo}
          >
            <RotateCcw size={18} color={verts.length === 0 ? colors.text.hint : colors.text.secondary} />
          </TouchableOpacity>

          {/* Reset */}
          <TouchableOpacity
            style={[styles.toolBtn, verts.length === 0 && styles.disabled]}
            disabled={verts.length === 0}
            onPress={handleReset}
          >
            <X size={18} color={verts.length === 0 ? colors.text.hint : colors.feedback.danger} />
          </TouchableOpacity>

          {/* Close polygon (shows only when enough points) */}
          {pencilOn && verts.length >= 3 && !isClosed && (
            <TouchableOpacity
              style={[styles.closeBtn, { borderColor: activeColor }]}
              onPress={handleClosePolygon}
            >
              <Text style={[styles.closeBtnText, { color: activeColor }]}>Yop</Text>
            </TouchableOpacity>
          )}

          {/* Pencil toggle */}
          <TouchableOpacity
            style={[
              styles.pencilBtn,
              pencilOn && { backgroundColor: activeColor, borderColor: activeColor },
              isClosed && styles.disabled,
            ]}
            disabled={isClosed}
            onPress={handlePencilToggle}
          >
            <Pencil size={18} color={pencilOn ? '#fff' : activeColor} />
            <Text style={[styles.pencilBtnText, pencilOn && { color: '#fff' }]}>
              {pencilOn ? 'Chizmoqda' : 'Qalam'}
            </Text>
          </TouchableOpacity>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.6 }]}
            disabled={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          >
            <Save size={17} color="#fff" />
            <Text style={styles.saveBtnText}>
              {saveMutation.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ── styles ── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  mapWrap: { flex: 1 },
  map: { flex: 1 },

  snapTarget: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },

  /* Header */
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.96)',
    ...shadow.sm,
    gap: spacing.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  zoneTabs: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  zoneTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  zoneDot: { width: 9, height: 9, borderRadius: 5 },
  zoneTabText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },

  /* Bottom */
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    ...shadow.lg,
  },
  hint: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    minHeight: 32,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  disabled: { opacity: 0.35 },

  closeBtn: {
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: colors.bg.surface,
  },
  closeBtnText: { ...typography.bodySmall, fontWeight: '700' },

  pencilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  pencilBtnText: { ...typography.bodySmall, fontWeight: '700', color: colors.text.secondary },

  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
  },
  saveBtnText: { ...typography.bodySmall, color: '#fff', fontWeight: '700' },
});
