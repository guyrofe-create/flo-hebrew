import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useUserData } from '../../context/UserDataContext';

function clampInt(n: number, min: number, max: number) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.min(max, Math.max(min, Math.trunc(x)));
}

export default function PeriodLengthScreen() {
  const router = useRouter();
  const { periodLength, setPeriodLength } = useUserData();

  const initial = useMemo(() => String(periodLength || 5), [periodLength]);
  const [value, setValue] = useState(initial);

  const next = async () => {
    const v = clampInt(Number(value), 2, 12);
    setValue(String(v));
    await setPeriodLength(v);
    router.push('/onboarding/last-period' as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>כמה ימים הדימום בדרך כלל?</Text>
      <Text style={styles.sub}>ברירת מחדל: 5</Text>

      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={value}
        onChangeText={setValue}
        placeholder="5"
        textAlign="right"
      />

      <Pressable style={styles.btn} onPress={next}>
        <Text style={styles.btnText}>המשך</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6, textAlign: 'right' },
  sub: { color: '#666', marginBottom: 16, textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    fontSize: 18,
  },
  btn: {
    marginTop: 16,
    backgroundColor: '#6a1b9a',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
