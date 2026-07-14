import { router } from 'expo-router';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { colors, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

/**
 * Strip a leading country-code prefix a user might paste along with the
 * number (e.g. copying "+998 90 123 45 67" or "998901234567" from another
 * app) so pasting a full international-format number doesn't push the digit
 * count past 9 and silently disable Continue. The field itself only ever
 * accepts the 9 local digits after +998.
 */
function stripCountryPrefix(digits: string): string {
  if (digits.startsWith('998') && digits.length > 9) return digits.slice(3);
  // A lone leading "8" is the old domestic trunk prefix (8-90-...); only
  // strip it when there are enough digits left to still be a full number.
  if (digits.startsWith('8') && digits.length === 10) return digits.slice(1);
  return digits;
}

function formatPhone(raw: string): string {
  const d = stripCountryPrefix(raw.replace(/\D/g, '')).slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.join(' ');
}

export default function PhoneScreen() {
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const toast = useToast();
  const { tr, setLang, lang } = useTranslation();

  // Same stripping as the display formatter, so a pasted full international
  // number validates and submits using just the 9 local digits.
  const digits = stripCountryPrefix(raw.replace(/\D/g, '')).slice(0, 9);
  const isValid = digits.length === 9;

  async function handleSubmit() {
    if (!isValid) {
      haptics.warning();
      toast.warning(tr('auth.phoneInvalid'));
      return;
    }
    const phone = `+998${digits}`;
    setLoading(true);
    try {
      const { resendAfterSec } = await requestOtp(phone);
      haptics.success();
      router.push({ pathname: '/(auth)/otp', params: { phone, resendAfterSec: String(resendAfterSec) } });
    } catch (err) {
      haptics.error();
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Scrollable + compact so the keyboard never hides the continue button. */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.langSwitcher}>
            {(['uz', 'uz_cyrl', 'ru'] as const).map((l) => (
              <Pressable
                key={l}
                onPress={() => {
                  haptics.selection();
                  setLang(l);
                }}
                style={[styles.langChip, lang === l && styles.langChipActive]}>
                <Text style={[styles.langText, lang === l && styles.langTextActive]}>
                  {l === 'uz' ? 'UZ' : l === 'uz_cyrl' ? 'ЎЗ' : 'RU'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.header}>
            <Image
              source={require('@/../assets/logo-web.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>{tr('auth.welcome')}</Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.label}>{tr('auth.phoneLabel')}</Text>
            <View style={styles.phoneRow}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefixText}>🇺🇿</Text>
                <Text style={styles.prefixCode}>+998</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={formatPhone(raw)}
                onChangeText={setRaw}
                keyboardType="phone-pad"
                placeholder={tr('auth.phonePlaceholder')}
                placeholderTextColor={colors.text.hint}
                autoFocus
                // Generous enough that pasting a full "+998 90 123 45 67"
                // (or similar with dashes/parens) isn't truncated by the
                // native input before stripCountryPrefix() ever sees it.
                maxLength={20}
              />
            </View>
            <View style={styles.helperRow}>
              <ShieldCheck size={14} color={colors.feedback.success} strokeWidth={2.4} />
              <Text style={styles.helperText}>{tr('auth.phoneHelper')}</Text>
            </View>

            <Button
              label={tr('auth.continue')}
              onPress={handleSubmit}
              loading={loading}
              disabled={!isValid}
              variant="primary"
              size="lg"
              fullWidth
              rightIcon={ArrowRight}
              haptic="medium"
              style={styles.cta}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.surface },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing['2xl'],
  },
  langSwitcher: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    justifyContent: 'flex-end',
  },
  langChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  langChipActive: {
    backgroundColor: colors.brand.primarySurface,
    borderColor: colors.brand.primary,
  },
  langText: { ...typography.caption, color: colors.text.secondary, fontWeight: '700' },
  langTextActive: { color: colors.brand.primary },
  header: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  logo: { width: 240, height: 104 },
  subtitle: { ...typography.body, color: colors.text.secondary, textAlign: 'center' },
  body: { gap: spacing.sm },
  label: { ...typography.bodySmall, color: colors.text.secondary, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  prefixBox: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  prefixText: { fontSize: 18 },
  prefixCode: { ...typography.bodyStrong },
  phoneInput: {
    flex: 1,
    height: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...typography.h3,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  helperRow: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: spacing.xs },
  helperText: { ...typography.caption, color: colors.text.secondary },
  cta: { marginTop: spacing.lg },
});
