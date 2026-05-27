import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.heroSection}>
          <View style={styles.logoCircle}>
            <ThemedText style={styles.logoLetter}>Y</ThemedText>
          </View>
          <ThemedText type="title" style={styles.title}>
            Yaqin Market
          </ThemedText>
          <ThemedText type="default" style={styles.subtitle}>
            Mahalla do'konlaridan tezkor yetkazib berish
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={styles.devCard}>
          <ThemedText type="defaultSemiBold">Dev Client ishlamoqda</ThemedText>
          <ThemedText type="small" style={styles.devCardHint}>
            Loyiha v0.1.0 — Sklad va marketpleys MVP
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.six,
    paddingTop: Spacing.six,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: Spacing.four,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Brand.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Brand.red,
  },
  logoLetter: {
    color: Brand.white,
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 64,
  },
  title: {
    textAlign: 'center',
    color: Brand.blue,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    opacity: 0.7,
  },
  devCard: {
    alignSelf: 'stretch',
    padding: Spacing.four,
    borderRadius: Radius.lg,
    gap: Spacing.two,
    alignItems: 'center',
  },
  devCardHint: {
    opacity: 0.6,
  },
});
