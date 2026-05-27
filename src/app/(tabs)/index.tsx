import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.heroSection}>
          <Image
            source={require('@/../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
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
  logo: {
    width: 128,
    height: 128,
    borderRadius: Radius.xl,
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
