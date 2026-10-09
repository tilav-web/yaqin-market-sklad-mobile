import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { colors, radius, shadow, spacing, typography } from '@/theme';

interface DeliveryMarkerProps {
  latitude: number;
  longitude: number;
  label: string;
}

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
      <View style={styles.wrap}>
        <View style={styles.labelPill}>
          <Text style={styles.labelText} allowFontScaling={false}>
            {text}
          </Text>
        </View>
        <View style={styles.tail} />
      </View>
    </Marker>
  );
}

const DELIVERY = colors.feedback.info;
const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  labelPill: {
    backgroundColor: DELIVERY,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.bg.surface,
    ...shadow.md,
  },
  labelText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '800',
    color: colors.text.onPrimary,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: DELIVERY,
    marginTop: -1,
  },
});
