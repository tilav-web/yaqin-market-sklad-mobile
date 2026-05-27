import { CircleAlert, CircleCheck, CircleX, Info } from 'lucide-react-native';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing, typography } from '@/theme';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  show: (msg: string, opts?: { variant?: ToastVariant; duration?: number }) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('ToastProvider missing');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [translateY, opacity]);

  const show = useCallback<ToastContextValue['show']>(
    (message, { variant = 'info', duration = 2500 } = {}) => {
      if (timer.current) clearTimeout(timer.current);
      const id = `${Date.now()}`;
      setToast({ id, message, variant, duration });
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, friction: 7, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
      timer.current = setTimeout(dismiss, duration);
    },
    [dismiss, translateY, opacity],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const ctx: ToastContextValue = {
    show,
    success: (m) => show(m, { variant: 'success' }),
    error: (m) => show(m, { variant: 'error' }),
    warning: (m) => show(m, { variant: 'warning' }),
    info: (m) => show(m, { variant: 'info' }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.host,
            { top: insets.top + spacing.sm },
            { opacity, transform: [{ translateY }] },
          ]}>
          <Pressable onPress={dismiss} style={styles.cardWrap}>
            <View
              style={[
                styles.card,
                {
                  borderLeftColor: VARIANT_COLOR[toast.variant],
                },
              ]}>
              <View style={[styles.iconWrap, { backgroundColor: VARIANT_BG[toast.variant] }]}>
                {iconFor(toast.variant)}
              </View>
              <Text style={styles.message}>{toast.message}</Text>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const VARIANT_COLOR: Record<ToastVariant, string> = {
  success: colors.feedback.success,
  error: colors.feedback.danger,
  warning: colors.feedback.warning,
  info: colors.feedback.info,
};
const VARIANT_BG: Record<ToastVariant, string> = {
  success: colors.feedback.successSurface,
  error: colors.feedback.dangerSurface,
  warning: colors.feedback.warningSurface,
  info: colors.feedback.infoSurface,
};

function iconFor(variant: ToastVariant) {
  const color = VARIANT_COLOR[variant];
  switch (variant) {
    case 'success':
      return <CircleCheck size={20} color={color} strokeWidth={2.4} />;
    case 'error':
      return <CircleX size={20} color={color} strokeWidth={2.4} />;
    case 'warning':
      return <CircleAlert size={20} color={color} strokeWidth={2.4} />;
    default:
      return <Info size={20} color={color} strokeWidth={2.4} />;
  }
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
  },
  cardWrap: {},
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    ...shadow.lg,
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { ...typography.bodyStrong, flex: 1 },
});
