import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/ui/brand-button';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth';

const CODE_LENGTH = 6;

export default function OtpScreen() {
  const params = useLocalSearchParams<{ phone: string }>();
  const phone = params.phone ?? '';
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
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  async function handleVerify() {
    if (code.length !== CODE_LENGTH) return;
    setLoading(true);
    try {
      await verifyOtp(phone, code);
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert("Xatolik", (err as Error).message);
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
      Alert.alert('Yuborildi', 'Yangi kod yuborildi');
    } catch (err) {
      Alert.alert('Xatolik', (err as Error).message);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>Tasdiq kodi</Text>
          <Text style={styles.subtitle}>
            {phone} raqamiga 6 xonali kod yuborildi
          </Text>
        </View>

        <View style={styles.codeContainer}>
          <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const ch = code[i];
              const isActive = i === code.length;
              return (
                <View
                  key={i}
                  style={[
                    styles.box,
                    isActive && styles.boxActive,
                    ch ? styles.boxFilled : null,
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
                // auto-submit when 6 digits entered
                setTimeout(() => {
                  void handleVerifyWithCode(digits);
                }, 100);
              }
            }}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            caretHidden
          />

          <Pressable onPress={handleResend} disabled={resendIn > 0} style={styles.resend}>
            <Text style={[styles.resendText, resendIn > 0 && styles.resendDisabled]}>
              {resendIn > 0 ? `Yangi kod ${resendIn}s dan keyin` : 'Yangi kod yuborish'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <BrandButton
            label="Tasdiqlash"
            onPress={handleVerify}
            loading={loading}
            disabled={code.length !== CODE_LENGTH}
          />
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backText}>Telefon raqamni o&apos;zgartirish</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  async function handleVerifyWithCode(c: string) {
    setLoading(true);
    try {
      await verifyOtp(phone, c);
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert("Xatolik", (err as Error).message);
      setCode('');
    } finally {
      setLoading(false);
    }
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.white },
  container: { flex: 1, padding: Spacing.four, justifyContent: 'space-between' },
  header: {
    paddingTop: Spacing.seven,
    gap: Spacing.three,
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', color: Brand.blue },
  subtitle: {
    fontSize: 15,
    color: Brand.gray600,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.three,
  },
  codeContainer: {
    gap: Spacing.four,
    alignItems: 'center',
  },
  boxes: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Brand.gray200,
    backgroundColor: Brand.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: Brand.blue,
    borderWidth: 2,
  },
  boxFilled: {
    backgroundColor: Brand.white,
    borderColor: Brand.blue,
  },
  boxChar: {
    fontSize: 24,
    fontWeight: '700',
    color: Brand.black,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  resend: {
    paddingVertical: Spacing.three,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.blue,
  },
  resendDisabled: {
    color: Brand.gray400,
  },
  footer: {
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  backText: {
    fontSize: 14,
    color: Brand.gray600,
  },
});
