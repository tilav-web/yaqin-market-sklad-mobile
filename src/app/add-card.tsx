import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddCardForm } from '@/components/AddCardForm';
import { colors, layout, spacing } from '@/theme';

/**
 * Full-screen "add a saved card" route. Checkout used to host `AddCardForm` in
 * a bottom sheet, but the card mockup plus the SMS-verify step never fit it —
 * a pushed screen gives the flow (and the keyboard) the room it needs.
 */
export default function AddCardScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <AddCardForm onDone={() => router.back()} onCancel={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, paddingBottom: spacing['3xl'] },
});
