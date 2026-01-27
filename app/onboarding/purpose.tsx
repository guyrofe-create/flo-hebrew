// app/onboarding/purpose.tsx
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '../../context/UserDataContext';

const OPTIONS = [
  { key: 'conceive', label: 'להיכנס להריון' },
  { key: 'prevent', label: 'למנוע הריון' },
  { key: 'track', label: 'מעקב כללי' },
] as const;

type GoalKey = (typeof OPTIONS)[number]['key'];

export default function PurposeScreen() {
  const router = useRouter();
  const { setGoal } = useUserData();

  const onPick = async (goalKey: GoalKey) => {
    await setGoal(goalKey);
    (router as any).push('/onboarding/cycle-length');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>מה המטרה שלך?</Text>
      <Text style={styles.subtitle}>אפשר לשנות אחר כך בהגדרות</Text>

      <View style={styles.list}>
        {OPTIONS.map(o => (
          <Pressable key={o.key} style={styles.card} onPress={() => onPick(o.key)}>
            <Text style={styles.cardText}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  list: { marginTop: 20, gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: '#faf7ff',
  },
  cardText: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
    color: '#2b2b2b',
  },
});
