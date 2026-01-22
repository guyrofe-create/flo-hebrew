// app/index.tsx
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useUserData } from '../context/UserDataContext';

export default function Index() {
  const router = useRouter();
  const { loading, disclaimerAccepted, isSetupComplete } = useUserData();

  useEffect(() => {
    if (loading) return;

    const t = setTimeout(() => {
      if (!disclaimerAccepted) {
        router.replace('/disclaimer');
        return;
      }

      if (isSetupComplete) {
        router.replace('/(tabs)/dashboard');
      } else {
        router.replace('/onboarding' as any);
      }
    }, 100);

    return () => clearTimeout(t);
  }, [loading, disclaimerAccepted, isSetupComplete, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#6a1b9a" />
      <Text style={{ marginTop: 20 }}>טוען...</Text>
    </View>
  );
}
