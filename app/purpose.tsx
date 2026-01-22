// app/purpose.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function PurposeRedirect() {
  const router = useRouter();

  useEffect(() => {
    (router as any).replace('/onboarding/purpose');
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
