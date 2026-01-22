// app/onboarding/index.tsx
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useUserData } from '../../context/UserDataContext';

export default function OnboardingIndex() {
  const router = useRouter();
  const { loading, disclaimerAccepted } = useUserData();

  useEffect(() => {
    if (loading) return;

    if (!disclaimerAccepted) {
      router.replace('/disclaimer' as any);
      return;
    }

    router.replace('/onboarding/purpose' as any);
  }, [loading, disclaimerAccepted, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#6a1b9a" />
      <Text style={{ marginTop: 20 }}>טוען...</Text>
    </View>
  );
}
