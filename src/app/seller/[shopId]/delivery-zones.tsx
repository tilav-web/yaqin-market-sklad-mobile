import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { LatLng, Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Line, Svg } from 'react-native-svg';

import {
  DeliveryZonesBottomBar,
  DeliveryZonesTopNav,
  fromGeoJson,
  SNAP_PX,
  toGeoJson,
  ZoneKey,
} from '@/components/delivery-zones';
import { PILOT_CITY_CENTER } from '@/constants/geo';
import { tr } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { GeoJsonPolygon, PublicShop } from '@/lib/types';
import { colors } from '@/theme';

const QARSHI = PILOT_CITY_CENTER;

export default function DeliveryZonesScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const mapRef = useRef<MapView>(null);
  const mapWrapRef = useRef<View>(null);

  const mapOffset = useRef({ x: 0, y: 0 });
  const [mapOrigin, setMapOrigin] = useState({ x: 0, y: 0 });
  const firstPx = useRef<{ x: number; y: number } | null>(null);

  /* zone vertices */
  const [zone, setZone] = useState<ZoneKey>('delivery');
  const [dverts, setDverts] = useState<LatLng[]>([]);
  const [fverts, setFverts] = useState<LatLng[]>([]);
  const [dclosed, setDclosed] = useState(false);
  const [fclosed, setFclosed] = useState(false);

  /* drawing */
  const [pencilOn, setPencilOn] = useState(false);
  const [svgLine, setSvgLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
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

  /* shop data */
  const shopQuery = useQuery({
    queryKey: ['shop', shopId],
    queryFn: async () => (await api.get<PublicShop>(`/seller/shops/${shopId}`)).data,
    staleTime: 60_000,
  });

  if (shopQuery.data && !initialized) {
    const s = shopQuery.data as PublicShop & {
      deliveryPolygon?: GeoJsonPolygon | null;
      freeDeliveryPolygon?: GeoJsonPolygon | null;
    };
    if (s.deliveryPolygon) { setDverts(fromGeoJson(s.deliveryPolygon)); setDclosed(true); }
    if (s.freeDeliveryPolygon) { setFverts(fromGeoJson(s.freeDeliveryPolygon)); setFclosed(true); }
    setInitialized(true);
  }

  const shopCoord = shopQuery.data
    ? { latitude: shopQuery.data.latitude, longitude: shopQuery.data.longitude }
    : QARSHI;

  const toScreen = async (coord: LatLng): Promise<{ x: number; y: number } | null> => {
    try {
      const pt = await mapRef.current?.pointForCoordinate(coord);
      if (!pt) return null;
      return { x: pt.x + mapOffset.current.x, y: pt.y + mapOffset.current.y };
    } catch {
      return null;
    }
  };

  /* PanResponder */
  // eslint-disable-next-line react-hooks/refs
  const [panRef] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        pencilRef.current && !closedRef.current[zoneRef.current],
      onStartShouldSetPanResponderCapture: () =>
        pencilRef.current && !closedRef.current[zoneRef.current],
      onMoveShouldSetPanResponder: () =>
        pencilRef.current && !closedRef.current[zoneRef.current],

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
        }
        setSvgLine(null);
      },

      onPanResponderMove: (evt) => {
        if (!pencilRef.current || closedRef.current[zoneRef.current]) return;
        const { pageX, pageY } = evt.nativeEvent;
        const lp = lastPx.current;
        if (!lp) return;
        setSvgLine({ x1: lp.x, y1: lp.y, x2: pageX, y2: pageY });
      },

      onPanResponderRelease: async (evt) => {
        if (!pencilRef.current || closedRef.current[zoneRef.current]) return;
        setSvgLine(null);
        const { pageX, pageY } = evt.nativeEvent;

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
    }),
  );

  const verts = zone === 'delivery' ? dverts : fverts;
  const isClosed = zone === 'delivery' ? dclosed : fclosed;
  const dColor = '#22c55e';
  const fColor = '#3b82f6';
  const activeColor = zone === 'delivery' ? dColor : fColor;

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
    Alert.alert('Tozalash', "Bu zonani o'chirasizmi?", [
      { text: 'Bekor', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
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
      Alert.alert(tr('common.saved'), 'Yetkazib berish chegaralari yangilandi.');
      router.back();
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const hint = (() => {
    if (!pencilOn) return isClosed ? 'Tayyor — qayta chizish uchun qalamni bosing' : 'Qalamni bosib chizishni boshlang';
    if (verts.length === 0) return 'Bosing va torting → chiziq chiziladi';
    if (verts.length < 3) return `Davom eting (${verts.length} nuqta)`;
    return 'Boshiga yaqinlashtirsangiz avtomatik yopiladi';
  })();

  return (
    <View style={styles.root}>
      {/* Map View */}
      <View
        ref={mapWrapRef}
        style={styles.mapWrap}
        onLayout={() => {
          mapWrapRef.current?.measure((_x, _y, _w, _h, px, py) => {
            mapOffset.current = { x: px, y: py };
            setMapOrigin({ x: px, y: py });
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
          <Marker coordinate={shopCoord} title={shopQuery.data?.name} pinColor={colors.brand.primary} />

          {dverts.length >= 3 && dclosed && (
            <Polygon coordinates={dverts} strokeColor={dColor} strokeWidth={2.5} fillColor="rgba(34,197,94,0.14)" />
          )}
          {dverts.length >= 2 && !dclosed && (
            <Polyline coordinates={dverts} strokeColor={dColor} strokeWidth={2.5} />
          )}

          {fverts.length >= 3 && fclosed && (
            <Polygon coordinates={fverts} strokeColor={fColor} strokeWidth={2.5} fillColor="rgba(59,130,246,0.14)" />
          )}
          {fverts.length >= 2 && !fclosed && (
            <Polyline coordinates={fverts} strokeColor={fColor} strokeWidth={2.5} />
          )}

          {pencilOn && !isClosed && verts.length >= 3 && (
            <Polyline
              coordinates={[verts[verts.length - 1], verts[0]]}
              strokeColor={activeColor}
              strokeWidth={1.5}
              lineDashPattern={[5, 7]}
            />
          )}

          {pencilOn && !isClosed && verts.length > 0 && (
            <Marker coordinate={verts[0]} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={[styles.snapTarget, { borderColor: activeColor }]} />
            </Marker>
          )}
        </MapView>

        {pencilOn && svgLine && (
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Line
              x1={svgLine.x1 - mapOrigin.x}
              y1={svgLine.y1 - mapOrigin.y}
              x2={svgLine.x2 - mapOrigin.x}
              y2={svgLine.y2 - mapOrigin.y}
              stroke={activeColor}
              strokeWidth={2.5}
              strokeDasharray="6,5"
            />
          </Svg>
        )}

        {pencilOn && !isClosed && (
          <View style={StyleSheet.absoluteFill} {...panRef.panHandlers} />
        )}
      </View>

      {/* Floating Top Controls */}
      <DeliveryZonesTopNav
        onBack={() => router.back()}
        onSave={() => saveMutation.mutate()}
        isSaving={saveMutation.isPending}
      />

      {/* Bottom Control Bar */}
      <DeliveryZonesBottomBar
        zone={zone}
        onSelectZone={(z) => {
          if (pencilOn) return;
          setZone(z);
          lastPx.current = null;
          firstPx.current = null;
        }}
        hint={hint}
        pencilOn={pencilOn}
        onTogglePencil={handlePencilToggle}
        isClosed={isClosed}
        vertsCount={verts.length}
        onUndo={handleUndo}
        onReset={handleReset}
        onClosePolygon={handleClosePolygon}
        onSave={() => saveMutation.mutate()}
        isSaving={saveMutation.isPending}
        dColor={dColor}
        fColor={fColor}
        activeColor={activeColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  snapTarget: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
});
