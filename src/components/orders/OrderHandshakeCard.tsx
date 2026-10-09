import React from 'react';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useTranslation } from '@/i18n';

interface OrderHandshakeCardProps {
  readonly token: string;
}

export function OrderHandshakeCard({ token }: OrderHandshakeCardProps) {
  const { tr } = useTranslation();

  return (
    <View className="bg-surface rounded-2xl p-4 items-center gap-2 border border-border-subtle shadow-xs">
      <Text className="text-base font-bold text-text-primary text-center">
        {tr('orderDet.handshakeTitle')}
      </Text>
      <Text className="text-xs text-text-secondary text-center leading-4 px-2">
        {tr('orderDet.handshakeBody')}
      </Text>
      <View className="p-3 bg-white rounded-xl shadow-xs border border-border-subtle mt-2">
        <QRCode value={`yaqinmarket://order/receive?token=${token}`} size={180} />
      </View>
    </View>
  );
}
