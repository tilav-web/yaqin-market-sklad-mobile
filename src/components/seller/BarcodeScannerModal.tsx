import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { useRef } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/theme';

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onScanned: (barcode: string) => void;
  readonly title?: string;
  /** Optional "barkodsiz" escape hatch (e.g. add a product with no barcode). */
  readonly onSkip?: () => void;
  readonly skipLabel?: string;
}

/** Reusable product-barcode scanner (reuses expo-camera, already in the build). */
export function BarcodeScannerModal({ visible, onClose, onScanned, title, onSkip, skipLabel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  const handle = (data: string) => {
    if (handled.current) return;
    handled.current = true;
    onScanned(data.trim());
    // Allow the next open to scan again.
    setTimeout(() => {
      handled.current = false;
    }, 800);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.fill}>
        {!permission ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand.primary} />
          </View>
        ) : !permission.granted ? (
          <SafeAreaView style={styles.center}>
            <Text style={styles.permTitle}>Kameraga ruxsat kerak</Text>
            <Text style={styles.permDesc}>Barkodni skanlash uchun kameradan foydalanamiz.</Text>
            <Pressable style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Ruxsat berish</Text>
            </Pressable>
            <Pressable onPress={onClose} style={{ padding: spacing.md }}>
              <Text style={styles.cancel}>Bekor qilish</Text>
            </Pressable>
          </SafeAreaView>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
              }}
              onBarcodeScanned={({ data }) => handle(data)}
            />
            <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
              <Text style={styles.title}>{title ?? 'Mahsulot barkodini skanlang'}</Text>
              <View style={styles.frame} />
              <View style={styles.actions}>
                {onSkip ? (
                  <Pressable
                    style={styles.skipBtn}
                    onPress={() => {
                      onClose();
                      onSkip();
                    }}>
                    <Text style={styles.skipText}>{skipLabel ?? 'Barkodsiz qo‘shish'}</Text>
                  </Pressable>
                ) : null}
                <Pressable style={styles.closeBtn} onPress={onClose}>
                  <X size={18} color={colors.text.onPrimary} strokeWidth={2.4} />
                  <Text style={styles.closeText}>Yopish</Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.canvas, padding: spacing.xl, gap: spacing.sm },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing['3xl'] },
  title: { ...typography.bodyStrong, color: colors.text.onPrimary, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, overflow: 'hidden' },
  frame: {
    width: 260,
    height: 160,
    borderWidth: 3,
    borderColor: colors.text.onPrimary,
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
  },
  actions: { alignItems: 'center', gap: spacing.sm },
  skipBtn: {
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  skipText: { ...typography.body, fontWeight: '700', color: colors.brand.primary },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  closeText: { ...typography.body, fontWeight: '700', color: colors.text.onPrimary },
  permTitle: { ...typography.h4, color: colors.text.primary },
  permDesc: { ...typography.bodySmall, color: colors.text.secondary, textAlign: 'center' },
  permBtn: { backgroundColor: colors.brand.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.lg },
  permBtnText: { ...typography.body, fontWeight: '700', color: colors.text.onPrimary },
  cancel: { ...typography.bodySmall, color: colors.text.secondary },
});
