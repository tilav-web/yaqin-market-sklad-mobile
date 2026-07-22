import { TopTabs } from 'expo-router/js-top-tabs';

import { CustomTabBar } from '@/components/CustomTabBar';
import { colors } from '@/theme';

// As of Expo Router 56, `Tabs` (bottom-tabs) has no swipe support and
// `@react-navigation/*` can no longer be imported directly (build-time
// error). `TopTabs` is expo-router's own vendored material-top-tabs —
// still swipeable, still wired into file-based routing — repositioned to
// the bottom and skinned with our own CustomTabBar so it reads as an
// ordinary bottom tab bar rather than a top one.
const renderTabBar = (props: any) => <CustomTabBar {...props} />; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function TabsLayout() {
  return (
    <TopTabs
      tabBarPosition="bottom"
      tabBar={renderTabBar}
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        sceneStyle: { backgroundColor: colors.bg.canvas },
      }}>
      <TopTabs.Screen name="index" />
      <TopTabs.Screen name="map" />
      <TopTabs.Screen name="search" />
      <TopTabs.Screen name="carts" />
      <TopTabs.Screen name="profile" />
    </TopTabs>
  );
}
