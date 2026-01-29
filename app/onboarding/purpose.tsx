// app/onboarding/purpose.tsx
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUserData, type PhysioMode } from '../../context/UserDataContext';

const OPTIONS = [
  { key: 'conceive', label: 'להיכנס להריון' },
  { key: 'prevent', label: 'למנוע הריון' },
  { key: 'track', label: 'מעקב כללי' },
] as const;

type GoalKey = (typeof OPTIONS)[number]['key'];

const PHYSIO: { key: PhysioMode; label: string }[] = [
  { key: 'none', label: 'ללא' },
  { key: 'postpartum', label: 'אחרי לידה' },
  { key: 'breastfeeding', label: 'הנקה' },
  { key: 'perimenopause', label: 'לקראת גיל המעבר' },
  { key: 'stoppingPills', label: 'הפסקת גלולות' },
];

export default function PurposeScreen() {
  const router = useRouter();
  const { setGoal, physioMode, setPhysioMode } = useUserData();

  const physioLabel = useMemo(() => {
    const found = PHYSIO.find(p => p.key === physioMode);
    return found ? found.label : 'ללא';
  }, [physioMode]);

  const onPick = async (goalKey: GoalKey) => {
    await setGoal(goalKey);
    router.push('/onboarding/cycle-length' as any);
  };

  const onPickPhysio = async (mode: PhysioMode) => {
    await setPhysioMode(mode);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>מה המטרה שלך?</Text>
      <Text style={styles.subtitle}>אפשר לשנות אחר כך בהגדרות</Text>

      <View style={styles.list}>
        {OPTIONS.map(o => (
          <Pressable key={o.key} style={styles.card} onPress={() => void onPick(o.key)}>
            <Text style={styles.cardText}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.physioWrap}>
        <Text style={styles.physioTitle}>מצב פיזיולוגי מיוחד</Text>
        <Text style={styles.physioSubtitle}>
          כאן בוחרים מצב אחד בלבד. במצבים האלה ההערכות והמסרים באפליקציה צריכים להתאים.
        </Text>

        <View style={styles.physioGrid}>
          {PHYSIO.map(p => {
            const on = p.key === physioMode;
            return (
              <Pressable
                key={p.key}
                onPress={() => void onPickPhysio(p.key)}
                style={[styles.physioBtn, on && styles.physioBtnOn]}
              >
                <Text style={[styles.physioBtnText, on && styles.physioBtnTextOn]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.physioHint}>נבחר: {physioLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },

  title: { marginTop: 10, fontSize: 24, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl' },
  subtitle: { marginTop: 8, fontSize: 13, color: '#666', textAlign: 'center', writingDirection: 'rtl' },

  list: { marginTop: 20, gap: 12 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: '#faf7ff',
  },
  cardText: { fontSize: 18, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl', color: '#2b2b2b' },

  physioWrap: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#fff',
  },

  physioTitle: {
    fontSize: 16,
    fontWeight: '900',
    writingDirection: 'rtl',
    textAlign: 'right',
    color: '#111',
    marginBottom: 6,
  },

  physioSubtitle: {
    fontSize: 12,
    color: '#555',
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 18,
  },

  physioGrid: {
    marginTop: 12,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },

  physioBtn: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },

  physioBtnOn: {
    borderColor: '#6a1b9a',
    backgroundColor: '#f6f2ff',
  },

  physioBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111',
    writingDirection: 'rtl',
    textAlign: 'center',
  },

  physioBtnTextOn: {
    color: '#6a1b9a',
  },

  physioHint: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '800',
    color: '#666',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
