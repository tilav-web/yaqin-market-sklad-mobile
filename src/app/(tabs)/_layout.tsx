import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';
import type { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { withLayoutContext } from 'expo-router';

import { CustomTabBar } from '@/components/CustomTabBar';
import { colors } from '@/theme';

// Material top-tabs is the only React Navigation tab navigator that swipes
// (it's built on react-native-tab-view/pager-view) — repositioned to the
// bottom and skinned with our own CustomTabBar so it reads as an ordinary
// bottom tab bar, not a top one. withLayoutContext keeps it wired into
// expo-router's file-based routes (router.push('/map') etc. keep working).
const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>(Navigator);

export default function TabsLayout() {
  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabBar={(props: any) => <CustomTabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        sceneStyle: { backgroundColor: colors.bg.canvas },
      }}>
      <MaterialTopTabs.Screen name="index" />
      <MaterialTopTabs.Screen name="map" />
      <MaterialTopTabs.Screen name="search" />
      <MaterialTopTabs.Screen name="carts" />
      <MaterialTopTabs.Screen name="profile" />
    </MaterialTopTabs>
  );
}
