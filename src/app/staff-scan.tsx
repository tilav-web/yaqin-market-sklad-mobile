import { useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { colors, layout, radius, spacing, typography } from '@/theme';

function extractToken(data: string): string {
  // QR encodes `yaqinmarket://staff/join?token=XXX`, but accept a raw token too.
  const m = data.match(/token=([^&\s]+)/);
  return m ? m[1] : data.trim();
}

export default function StaffScanScreen() {
  const qc = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const handled = useRef(false);

  const onScanned = async (data: string) => {
    if (handled.current || busy) return;
    handled.current = true;
    setBusy(true);
    try {
      const token = extractToken(data);
      const res = await api.post<{ shopId: string; shopName: string }>('/staff/accept', { token });
      await qc.invalidateQueries({ queryKey: ['shops', 'mine'] });
      await qc.invalidateQueries({ queryKey: ['working-for-me'] });
      await qc.invalidateQueries({ queryKey: ['me'] });
      Alert.alert('Tabriklaymiz!', `Siz "${res.data.shopName}" do‘koniga xodim sifatida qo‘shildingiz.`, [
        // Pop back to the (already-mounted) profile tab instead of replacing the
        // whole tab tree — `replace` re-mounts home/map and causes a freeze.
        { text: 'OK', onPress: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')) },
      ]);
    } catch (e) {
      Alert.alert(tr('common.error'), extractErrorMessage(e), [
        {
          text: 'Qayta urinish',
          onPress: () => {
            handled.current = false;
          },
        },
        { text: 'Yopish', style: 'cancel', onPress: () => router.back() },
      ]);
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.permTitle}>Kameraga ruxsat kerak</Text>
        <Text style={styles.permDesc}>QR kodni skanlash uchun kameradan foydalanamiz.</Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Ruxsat berish</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.md }}>
          <Text style={styles.cancel}>Bekor qilish</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => void onScanned(data)}
      />

      {/* Scan frame overlay */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <Text style={styles.title}>Do‘kon QR kodini skanlang</Text>
        <View style={styles.frame}>
          {busy && (
            <View style={styles.busyBox}>
              <ActivityIndicator color={colors.text.onPrimary} />
              <Text style={styles.busyText}>Qo‘shilmoqda…</Text>
            </View>
          )}
        </View>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>Bekor qilish</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: layout.screenPadding,
    backgroundColor: colors.bg.canvas,
  },
  permTitle: { ...typography.h4, color: colors.text.primary },
  permDesc: { ...typography.bodySmall, color: colors.text.secondary, textAlign: 'center' },
  permBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing['2xl'],
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permBtnText: { ...typography.body, color: colors.text.onPrimary, fontWeight: '700' },
  cancel: { ...typography.body, color: colors.text.secondary },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing['3xl'] },
  title: { ...typography.h4, color: colors.text.onPrimary, textAlign: 'center', paddingHorizontal: spacing.lg },
  frame: {
    width: 250,
    height: 250,
    borderRadius: radius.xl,
    borderWidth: 3,
    borderColor: colors.text.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyBox: { alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(0,0,0,0.4)', padding: spacing.lg, borderRadius: radius.lg },
  busyText: { ...typography.body, color: colors.text.onPrimary, fontWeight: '700' },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  closeText: { ...typography.body, color: colors.text.onPrimary, fontWeight: '700' },
});
