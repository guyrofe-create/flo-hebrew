// app/onboarding/birthday.tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '../../context/UserDataContext';
import { normalizeNoon } from '../../lib/date';

export default function BirthdayScreen() {
  const router = useRouter();
  const { setBirthday } = useUserData();

  const initial = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 25);
    return normalizeNoon(d);
  }, []);

  const [picked, setPicked] = useState<Date>(initial);

  const done = async () => {
    const yyyy = picked.getFullYear();
    const mm = String(picked.getMonth() + 1).padStart(2, '0');
    const dd = String(picked.getDate()).padStart(2, '0');
    await setBirthday(`${yyyy}-${mm}-${dd}`);
    router.replace('/(tabs)/dashboard' as any);
  };

  const skip = async () => {
    await setBirthday(null as any);
    router.replace('/(tabs)/dashboard' as any);
  };

  const label = useMemo(() => picked.toLocaleDateString('he-IL'), [picked]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>תאריך לידה</Text>
      <Text style={styles.sub}>זה מאפשר דיוק עתידי והתאמות לפי גיל.</Text>

      <Text style={styles.value}>{label}</Text>

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

      <Pressable style={styles.btn} onPress={done}>
        <Text style={styles.btnText}>סיום</Text>
      </Pressable>

      <Pressable style={styles.btnGhost} onPress={skip}>
        <Text style={styles.btnGhostText}>דלג</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6, textAlign: 'right' },
  sub: { color: '#666', marginBottom: 12, textAlign: 'right' },
  value: { textAlign: 'right', fontSize: 16, marginBottom: 10 },
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
  btnGhost: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnGhostText: { color: '#333', fontSize: 16, fontWeight: '700' },
});
