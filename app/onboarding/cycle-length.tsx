// app/onboarding/cycle-length.tsx
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '../../context/UserDataContext';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function CycleLengthScreen() {
  const router = useRouter();
  const { cycleLengthManual, setCycleLengthManual } = useUserData();

  const initialCycle = useMemo(() => {
    const v = Number(cycleLengthManual);
    return Number.isFinite(v) && v > 0 ? v : 28;
  }, [cycleLengthManual]);

  const [localCycle, setLocalCycle] = useState<number>(initialCycle);

  const decCycle = () => setLocalCycle((v) => clamp(v - 1, 18, 60));
  const incCycle = () => setLocalCycle((v) => clamp(v + 1, 18, 60));

  const handleContinue = async () => {
    const c = clamp(localCycle, 18, 60);
    await setCycleLengthManual(c);
    router.push('/onboarding/period-length' as any);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>מרווח בין מחזורים</Text>
      <Text style={styles.subtitle}>אפשר לשנות בהמשך מההגדרות</Text>

      <Text style={styles.explain}>
        נבחר יחד הערכה לאורך המחזור שלך. זה ישפיע על חישוב ביוץ, חלון פוריות ומועד מחזור צפוי.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>אורך מחזור ממוצע</Text>

        <View style={styles.counterRow}>
          <Pressable style={styles.btn} onPress={decCycle}>
            <Text style={styles.btnText}>-</Text>
          </Pressable>

          <View style={styles.valueBox}>
            <Text style={styles.value}>{localCycle}</Text>
            <Text style={styles.valueHint}>ימים</Text>
          </View>

          <Pressable style={styles.btn} onPress={incCycle}>
            <Text style={styles.btnText}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.helper}>טווח שכיח: 21 עד 35 (כאן מאפשרים 18 עד 60)</Text>
      </View>

      <Pressable style={styles.primary} onPress={() => void handleContinue()}>
        <Text style={styles.primaryText}>המשך</Text>
      </Pressable>

      <Text style={styles.disclaimer}>כל החישובים הם הערכה בלבד ואינם תחליף לייעוץ רפואי</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 18 },
  content: { paddingTop: 16, paddingBottom: 28 },

  title: { fontSize: 22, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', writingDirection: 'rtl', marginBottom: 10, fontWeight: '700' },

  explain: { fontSize: 13, color: '#444', fontWeight: '700', textAlign: 'center', writingDirection: 'rtl', marginBottom: 16 },

  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 18, padding: 14, marginBottom: 12, backgroundColor: '#fafafa' },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#111', writingDirection: 'rtl', textAlign: 'right', marginBottom: 10 },

  counterRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 10 },

  btn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 22, fontWeight: '900', color: '#6a1b9a' },

  valueBox: { flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff' },
  value: { fontSize: 26, fontWeight: '900', color: '#111' },
  valueHint: { marginTop: 2, fontSize: 12, fontWeight: '800', color: '#666', writingDirection: 'rtl' },

  helper: { marginTop: 10, fontSize: 12, color: '#666', fontWeight: '700', writingDirection: 'rtl', textAlign: 'right' },

  primary: { marginTop: 8, backgroundColor: '#6a1b9a', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 16, writingDirection: 'rtl' },

  disclaimer: { marginTop: 10, fontSize: 12, color: '#666', textAlign: 'center', writingDirection: 'rtl', fontWeight: '700' },
});
