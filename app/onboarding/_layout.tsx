// app/onboarding/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="purpose" options={{ title: 'מטרה' }} />
      <Stack.Screen name="cycle-length" options={{ title: 'אורך מחזור' }} />
      <Stack.Screen name="period-length" options={{ title: 'אורך דימום' }} />
      <Stack.Screen name="last-period" options={{ title: 'וסת אחרון' }} />
      <Stack.Screen name="birthday" options={{ title: 'תאריך לידה' }} />
    </Stack>
  );
}
