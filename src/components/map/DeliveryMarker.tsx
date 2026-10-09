import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { colors, shadow } from '@/theme';

interface DeliveryMarkerProps {
  latitude: number;
  longitude: number;
  label: string;
}

const DELIVERY = colors.feedback.info;

export function DeliveryMarker({ latitude, longitude, label }: DeliveryMarkerProps) {
  const text = label.length > 10 ? label.slice(0, 10) : label;
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 1200);
    return () => clearTimeout(id);
  }, [text]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={999}
    >
      <View className="items-center">
        <View
          className="px-3 py-1 rounded-full border-2"
          style={[
            {
              backgroundColor: DELIVERY,
              borderColor: colors.bg.surface,
            },
            shadow.md,
          ]}
        >
          <Text
            className="text-[13px] font-extrabold text-white"
            allowFontScaling={false}
          >
            {text}
          </Text>
        </View>
        <View
          className="-mt-0.25 w-0 h-0"
          style={{
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderTopWidth: 8,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: DELIVERY,
          }}
        />
      </View>
    </Marker>
  );
}
