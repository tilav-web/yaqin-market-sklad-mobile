import { useEffect, useRef, useState } from 'react';
import { Alert, PanResponder, View } from 'react-native';
import MapView, { LatLng } from 'react-native-maps';

import { SNAP_PX, ZoneKey } from './types';

export function useDeliveryZonesDrawing() {
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

  /* refs for PanResponder stable closures */
  const zoneRef = useRef<ZoneKey>('delivery');
  const pencilRef = useRef(false);
  const closedRef = useRef<Record<ZoneKey, boolean>>({ delivery: false, free: false });
  const vertsRef = useRef<Record<ZoneKey, LatLng[]>>({ delivery: [], free: [] });

  useEffect(() => { zoneRef.current = zone; }, [zone]);
  useEffect(() => { pencilRef.current = pencilOn; }, [pencilOn]);
  useEffect(() => { closedRef.current = { delivery: dclosed, free: fclosed }; }, [dclosed, fclosed]);
  useEffect(() => { vertsRef.current = { delivery: dverts, free: fverts }; }, [dverts, fverts]);

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

  const selectZone = (z: ZoneKey) => {
    if (pencilOn) return;
    setZone(z);
    lastPx.current = null;
    firstPx.current = null;
  };

  const hint = (() => {
    if (!pencilOn) return isClosed ? 'Tayyor — qayta chizish uchun qalamni bosing' : 'Qalamni bosib chizishni boshlang';
    if (verts.length === 0) return 'Bosing va torting → chiziq chiziladi';
    if (verts.length < 3) return `Davom eting (${verts.length} nuqta)`;
    return 'Boshiga yaqinlashtirsangiz avtomatik yopiladi';
  })();

  return {
    mapRef,
    mapWrapRef,
    mapOffset,
    mapOrigin,
    setMapOrigin,
    zone,
    selectZone,
    dverts,
    setDverts,
    fverts,
    setFverts,
    dclosed,
    setDclosed,
    fclosed,
    setFclosed,
    pencilOn,
    svgLine,
    panRef,
    verts,
    isClosed,
    dColor,
    fColor,
    activeColor,
    handleUndo,
    handleReset,
    handleClosePolygon,
    handlePencilToggle,
    hint,
  };
}
