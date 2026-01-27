// app/onboarding/index.tsx
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '../../context/UserDataContext';

export default function OnboardingIndex() {
  const router = useRouter();
  const { loading, isSetupComplete } = useUserData();

  useEffect(() => {
    if (loading) return;

    // אם כבר הושלמה ההגדרה, חוזרים לדשבורד
    if (isSetupComplete) {
      router.replace('/(tabs)/dashboard');
      return;
    }

    // אחרת מתחילים מאונבורדינג: בחירת מטרה
    router.replace('/onboarding/purpose');
  }, [loading, isSetupComplete, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator />
      <Text style={styles.text}>טוען...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  text: {
    marginTop: 10,
    fontSize: 14,
    color: '#444',
    writingDirection: 'rtl',
    textAlign: 'center',
    fontWeight: '700',
  },
});
