import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.iconText, focused && { color: Brand.red }]}>{label}</Text>
    </View>
  );
}

export default function SellerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Brand.red,
        tabBarInactiveTintColor: Brand.gray600,
        tabBarStyle: { borderTopColor: Brand.gray100, paddingTop: 4 },
        headerStyle: { backgroundColor: Brand.red },
        headerTintColor: Brand.white,
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Buyurtmalar',
          tabBarIcon: ({ focused }) => <TabIcon label="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Sklad',
          tabBarIcon: ({ focused }) => <TabIcon label="📦" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Sozlamalar',
          tabBarIcon: ({ focused }) => <TabIcon label="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 22, color: Brand.gray600 },
});
