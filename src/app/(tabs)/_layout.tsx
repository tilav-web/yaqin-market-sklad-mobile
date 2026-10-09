import { TopTabs } from 'expo-router/js-top-tabs';

import { CustomTabBar } from '@/components/CustomTabBar';
import { TelegramSearchModal } from '@/components/telegram/TelegramSearchModal';

import { useTheme } from '@/stores/theme';

// Material TopTabs positioned at bottom and skinned as Telegram bottom bar
const renderTabBar = (props: any) => <CustomTabBar {...props} />;

export default function TabsLayout() {
  const { colors: activeColors } = useTheme();

  return (
    <>
      <TopTabs
        initialRouteName="index"
        tabBarPosition="bottom"
        tabBar={renderTabBar}
        screenOptions={{
          swipeEnabled: false,
          animationEnabled: false,
          sceneStyle: { backgroundColor: activeColors.bg.canvas },
        }}>
        {/* 1: Contacts (Xarita / Map) */}
        <TopTabs.Screen name="map" />
        {/* 2: Calls (Chatlar / Chats with shops) */}
        <TopTabs.Screen name="chats" />
        {/* 3: Chats (Mahsulotlar / Products marketplace - default initial tab) */}
        <TopTabs.Screen name="index" />
        {/* 4: Settings (Sozlamalar / Profile) */}
        <TopTabs.Screen name="profile" />

        {/* Hidden auxiliary tabs */}
        <TopTabs.Screen name="carts" options={{ tabBarItemStyle: { display: 'none' } }} />
        <TopTabs.Screen name="search" options={{ tabBarItemStyle: { display: 'none' } }} />
      </TopTabs>
      <TelegramSearchModal />
    </>
  );
}
