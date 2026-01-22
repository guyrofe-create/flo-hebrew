import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#6a1b9a',
      }}
    >
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'לוח שנה',
          tabBarLabel: 'לוח שנה',
          tabBarIcon: ({ color }) => <FontAwesome name="calendar" size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'הגדרות',
          tabBarLabel: 'הגדרות',
          tabBarIcon: ({ color }) => <FontAwesome name="cog" size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'מעקב',
          tabBarLabel: 'מעקב',
          tabBarIcon: ({ color }) => <FontAwesome name="heart" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
