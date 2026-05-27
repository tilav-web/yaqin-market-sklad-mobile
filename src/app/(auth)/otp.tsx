import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { colors, hitSlop, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

const CODE_LENGTH = 6;

export default function OtpScreen() {
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const { tr } = useTranslation();
  const toast = useToast();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(60);
  const inputRef = useRef<TextInput>(null);

  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const requestOtp = useAuthStore((s) => s.requestOtp);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  async function handleVerify(c: string = code) {
    if (c.length !== CODE_LENGTH) return;
    setLoading(true);
    try {
      await verifyOtp(phone, c);
      haptics.success();
      router.replace('/(tabs)');
    } catch (err) {
      haptics.error();
      toast.error((err as Error).message);
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0) return;
    try {
      await requestOtp(phone);
      setResendIn(60);
      haptics.success();
      toast.success(tr('auth.otpResent'));
    } catch (err) {
      haptics.error();
      toast.error((err as Error).message);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={hitSlop}
          style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>{tr('auth.otpTitle')}</Text>
          <Text style={styles.subtitle}>
            {tr('auth.otpHelper', { phone })}
          </Text>
        </View>

        <View style={styles.codeBlock}>
          <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const ch = code[i];
              const isActive = i === code.length;
              return (
                <View
                  key={i}
                  style={[
                    styles.box,
                    ch ? styles.boxFilled : null,
                    isActive && styles.boxActive,
                  ]}>
                  <Text style={styles.boxChar}>{ch ?? ''}</Text>
                </View>
              );
            })}
          </Pressable>

          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '').slice(0, CODE_LENGTH);
              setCode(digits);
              if (digits.length === CODE_LENGTH) {
                haptics.light();
                setTimeout(() => void handleVerify(digits), 80);
              } else if (digits.length > code.length) {
                haptics.selection();
              }
            }}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            caretHidden
          />

          <Pressable
            onPress={handleResend}
            disabled={resendIn > 0}
            style={styles.resend}>
            <Text style={[styles.resendText, resendIn > 0 && styles.resendDisabled]}>
              {resendIn > 0
                ? tr('auth.otpResendIn', { sec: resendIn })
                : tr('auth.otpResend')}
            </Text>
          </Pressable>

          <View style={styles.securityRow}>
            <ShieldCheck size={14} color={colors.feedback.success} strokeWidth={2.4} />
            <Text style={styles.securityText}>
              {phone}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label={tr('common.confirm')}
            onPress={() => handleVerify()}
            loading={loading}
            disabled={code.length !== CODE_LENGTH}
            variant="primary"
            size="lg"
            fullWidth
            haptic="medium"
          />
          <Button
            label={tr('auth.changeNumber')}
            onPress={() => router.back()}
            variant="ghost"
            haptic="none"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.surface },
  container: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  backBtn: { padding: spacing.xs, alignSelf: 'flex-start' },
  header: { gap: spacing.sm, marginTop: spacing.lg },
  title: { ...typography.h1 },
  subtitle: { ...typography.body, color: colors.text.secondary },
  codeBlock: { gap: spacing.xl, alignItems: 'center', marginTop: spacing.xl },
  boxes: { flexDirection: 'row', gap: spacing.sm },
  box: {
    width: 48,
    height: 60,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: colors.brand.primary,
    borderWidth: 2,
    backgroundColor: colors.brand.primarySurface,
  },
  boxFilled: {
    backgroundColor: colors.bg.surface,
    borderColor: colors.brand.primary,
  },
  boxChar: { ...typography.h2, color: colors.text.primary },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  resend: { paddingVertical: spacing.xs },
  resendText: { ...typography.bodySmall, color: colors.brand.primary, fontWeight: '700' },
  resendDisabled: { color: colors.text.hint },
  securityRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  securityText: { ...typography.caption, color: colors.text.secondary },
  footer: { gap: spacing.sm, paddingBottom: spacing.md },
});
