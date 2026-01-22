// app/onboarding/last-period.tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '../../context/UserDataContext';

function normalizeNoon(d: Date) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

export default function LastPeriodScreen() {
  const router = useRouter();
  const { addPeriodDate } = useUserData();

  const initial = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    return normalizeNoon(d);
  }, []);

  const [picked, setPicked] = useState<Date>(initial);

  const next = async () => {
    await addPeriodDate(picked.toISOString());
    router.push('/onboarding/birthday' as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>מתי התחיל הווסת האחרון?</Text>
      <Text style={styles.sub}>אפשר לשנות אחר כך בהיסטוריה.</Text>

      <View style={styles.pickerWrap}>
        <DateTimePicker
          value={picked}
          mode="date"
          display="spinner"
          onChange={(_, date) => {
            if (!date) return;
            setPicked(normalizeNoon(date));
          }}
        />
      </View>

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
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    overflow: 'hidden',
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
