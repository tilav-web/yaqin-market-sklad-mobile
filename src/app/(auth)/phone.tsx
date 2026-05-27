import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/ui/brand-button';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth';

function formatUzPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  const a = digits.slice(0, 2);
  const b = digits.slice(2, 5);
  const c = digits.slice(5, 7);
  const d = digits.slice(7, 9);
  let out = '';
  if (a) out += a;
  if (b) out += ' ' + b;
  if (c) out += ' ' + c;
  if (d) out += ' ' + d;
  return out;
}

export default function PhoneScreen() {
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const requestOtp = useAuthStore((s) => s.requestOtp);

  const digits = raw.replace(/\D/g, '');
  const isValid = digits.length === 9;

  async function handleSubmit() {
    if (!isValid) return;
    const phone = `+998${digits}`;
    setLoading(true);
    try {
      await requestOtp(phone);
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } catch (err) {
      Alert.alert("Xatolik", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Image
            source={require('@/../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Yaqin Market</Text>
          <Text style={styles.subtitle}>
            Telefon raqamingizni kiriting{'\n'}SMS orqali tasdiq kodi yuboramiz
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.phoneRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>🇺🇿 +998</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formatUzPhone(raw)}
              onChangeText={setRaw}
              keyboardType="phone-pad"
              placeholder="90 123 45 67"
              placeholderTextColor={Brand.gray400}
              autoFocus
              maxLength={13}
            />
          </View>
          <Text style={styles.hint}>
            SMS yuborilgach 5 daqiqa amal qiladi
          </Text>
        </View>

        <View style={styles.footer}>
          <BrandButton
            label="Davom etish"
            onPress={handleSubmit}
            loading={loading}
            disabled={!isValid}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.white },
  container: { flex: 1, padding: Spacing.four, justifyContent: 'space-between' },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.seven,
    gap: Spacing.three,
  },
  logo: { width: 96, height: 96, borderRadius: Radius.xl },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Brand.blue,
    marginTop: Spacing.two,
  },
  subtitle: {
    fontSize: 15,
    color: Brand.gray600,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    gap: Spacing.three,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  prefixBox: {
    height: 52,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: Brand.gray50,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: Brand.black,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: Brand.gray50,
    borderWidth: 1,
    borderColor: Brand.gray200,
    fontSize: 18,
    fontWeight: '600',
    color: Brand.black,
    letterSpacing: 1,
  },
  hint: {
    fontSize: 13,
    color: Brand.gray600,
    paddingHorizontal: Spacing.two,
  },
  footer: {
    paddingBottom: Spacing.three,
  },
});
