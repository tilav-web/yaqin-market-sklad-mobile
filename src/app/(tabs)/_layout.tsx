import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';

import { CustomTabBar } from '@/components/CustomTabBar';
import { colors } from '@/theme';

const renderTabBar = (props: BottomTabBarProps) => <CustomTabBar {...props} />;

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg.canvas },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="carts" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
