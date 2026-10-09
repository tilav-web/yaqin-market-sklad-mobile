import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Line, Svg } from 'react-native-svg';

import {
  DeliveryZonesBottomBar,
  DeliveryZonesTopNav,
  fromGeoJson,
  toGeoJson,
  useDeliveryZonesDrawing,
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
  const [initialized, setInitialized] = useState(false);

  const {
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
  } = useDeliveryZonesDrawing();

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

  return (
    <View className="flex-1">
      {/* Map View */}
      <View
        ref={mapWrapRef}
        className="flex-1"
        onLayout={() => {
          mapWrapRef.current?.measure((_x, _y, _w, _h, px, py) => {
            mapOffset.current = { x: px, y: py };
            setMapOrigin({ x: px, y: py });
          });
        }}
      >
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
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
              <View
                className="w-6.5 h-6.5 rounded-full border-[3px] bg-white/75"
                style={{ borderColor: activeColor }}
              />
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
        onSelectZone={selectZone}
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
