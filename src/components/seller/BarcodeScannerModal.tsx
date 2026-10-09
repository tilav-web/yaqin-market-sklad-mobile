import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { useRef } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

import type { BarcodeType } from 'expo-camera';

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onScanned: (barcode: string) => void;
  readonly title?: string;
  readonly onSkip?: () => void;
  readonly skipLabel?: string;
  readonly barcodeTypes?: BarcodeType[];
  readonly closeOnScan?: boolean;
}

export function BarcodeScannerModal({
  visible,
  onClose,
  onScanned,
  title,
  onSkip,
  skipLabel,
  barcodeTypes,
  closeOnScan = true,
}: Props) {
  const { tr } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  const handle = (data: string) => {
    if (handled.current) return;
    handled.current = true;
    onScanned(data.trim());
    setTimeout(() => {
      handled.current = false;
    }, 1200);
    if (closeOnScan) onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        {!permission ? (
          <View className="flex-1 items-center justify-center bg-bg-canvas p-6 gap-2">
            <ActivityIndicator color={colors.brand.primary} />
          </View>
        ) : !permission.granted ? (
          <SafeAreaView className="flex-1 items-center justify-center bg-bg-canvas p-6 gap-2">
            <Text className="text-xl font-bold text-text-primary">{tr('scanner.permTitle')}</Text>
            {permission.canAskAgain ? (
              <>
                <Text className="text-xs text-text-secondary text-center">{tr('scanner.permBody')}</Text>
                <Pressable className="bg-brand-primary px-6 py-3 rounded-2xl active:opacity-85" onPress={requestPermission}>
                  <Text className="text-base font-bold text-text-on-primary">{tr('scanner.grant')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-xs text-text-secondary text-center">
                  {tr('scanner.permBlocked')}
                </Text>
                <Pressable className="bg-brand-primary px-6 py-3 rounded-2xl active:opacity-85" onPress={() => void Linking.openSettings()}>
                  <Text className="text-base font-bold text-text-on-primary">{tr('scanner.openSettings')}</Text>
                </Pressable>
              </>
            )}
            <Pressable onPress={onClose} className="p-3">
              <Text className="text-xs text-text-secondary">{tr('common.cancel')}</Text>
            </Pressable>
          </SafeAreaView>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: barcodeTypes ?? ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
              }}
              onBarcodeScanned={({ data }) => handle(data)}
            />
            <SafeAreaView className="flex-1 items-center justify-between py-12" edges={['top', 'bottom']} pointerEvents="box-none">
              <Text className="text-sm font-bold text-text-on-primary bg-black/45 px-5 py-2 rounded-full overflow-hidden">
                {title ?? 'Mahsulot barkodini skanlang'}
              </Text>
              <View className="w-[260px] h-[160px] border-4 border-white rounded-2xl bg-transparent" />
              <View className="items-center gap-2">
                {onSkip ? (
                  <Pressable
                    className="bg-bg-surface px-6 py-3 rounded-full active:opacity-85"
                    onPress={() => {
                      onClose();
                      onSkip();
                    }}
                  >
                    <Text className="text-base font-bold text-brand-primary">{skipLabel ?? 'Barkodsiz qo‘shish'}</Text>
                  </Pressable>
                ) : null}
                <Pressable className="flex-row items-center gap-1.5 bg-black/55 px-6 py-3 rounded-full active:opacity-85" onPress={onClose}>
                  <X size={18} color={colors.text.onPrimary} strokeWidth={2.4} />
                  <Text className="text-base font-bold text-text-on-primary">{tr('common.close')}</Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </>
        )}
      </View>
    </Modal>
  );
}
