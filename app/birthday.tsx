// app/birthday.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function BirthdayRedirect() {
  const router = useRouter();

  useEffect(() => {
    (router as any).replace('/onboarding/birthday');
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
