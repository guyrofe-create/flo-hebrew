// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { UserDataProvider } from '../context/UserDataContext';

Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  return (
    <UserDataProvider>
      <Stack
        screenOptions={{
          headerTitleAlign: 'center',
          headerBackTitle: '',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="disclaimer" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'חזרה' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ title: "אודות שולה" }} />
  <Stack.Screen name="legal" options={{ title: "מידע משפטי והבהרות" }} />
  <Stack.Screen name="privacy" options={{ title: "מדיניות פרטיות" }} />
</Stack>
    </UserDataProvider>
  );
}
