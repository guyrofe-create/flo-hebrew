// app/onboarding/period-length.tsx
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '../../context/UserDataContext';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function PeriodLengthScreen() {
  const router = useRouter();
  const { periodLength, setPeriodLength, cycleLengthManual } = useUserData();

  const initial = useMemo(() => {
    const v = Number(periodLength);
    return Number.isFinite(v) && v > 0 ? v : 5;
  }, [periodLength]);

  const [local, setLocal] = useState<number>(initial);

  const dec = () => setLocal((v) => clamp(v - 1, 2, 12));
  const inc = () => setLocal((v) => clamp(v + 1, 2, 12));

  const handleContinue = async () => {
    const p = clamp(local, 2, 12);
    const c = clamp(Number(cycleLengthManual) || 28, 18, 60);

    if (p >= c) {
      Alert.alert('שימי לב', 'אורך דימום חייב להיות קצר מאורך המחזור');
      return;
    }

    await setPeriodLength(p);
    router.push('/onboarding/last-period' as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>אורך דימום</Text>
      <Text style={styles.subtitle}>אפשר לשנות בהמשך מההגדרות</Text>

      <View style={styles.card}>
        <Text style={styles.value}>{local}</Text>
        <Text style={styles.hint}>ימים</Text>

        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={dec}>
            <Text style={styles.btnText}>-</Text>
          </Pressable>

          <Pressable style={styles.btn} onPress={inc}>
            <Text style={styles.btnText}>+</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.primary} onPress={() => void handleContinue()}>
        <Text style={styles.primaryText}>המשך</Text>
      </Pressable>

      <Text style={styles.disclaimer}>כל החישובים הם הערכה בלבד ואינם תחליף לייעוץ רפואי</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 18, paddingTop: 18 },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', writingDirection: 'rtl', marginBottom: 14, fontWeight: '700' },

  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 18, padding: 16, backgroundColor: '#fafafa', alignItems: 'center' },
  value: { fontSize: 32, fontWeight: '900', color: '#111' },
  hint: { marginTop: 6, fontSize: 12, color: '#666', fontWeight: '700', writingDirection: 'rtl' },

  row: { marginTop: 12, flexDirection: 'row-reverse', gap: 10 },
  btn: {
    width: 64,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 22, fontWeight: '900', color: '#6a1b9a' },

  primary: { marginTop: 14, backgroundColor: '#6a1b9a', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 16, writingDirection: 'rtl' },

  disclaimer: { marginTop: 10, fontSize: 12, color: '#666', textAlign: 'center', writingDirection: 'rtl', fontWeight: '700' },
});
