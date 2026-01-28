// app/onboarding/last-period.tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '../../context/UserDataContext';
import { normalizeNoon } from '../../lib/date';

function formatIL(d: Date) {
  return d.toLocaleDateString('he-IL');
}

function toLocalDateOnly(d: Date) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

export default function LastPeriodScreen() {
  const router = useRouter();
  const { periodHistory, periodStart, setPeriodStart, addPeriodDate, removePeriodDate } = useUserData();

  const today = useMemo(() => normalizeNoon(new Date()), []);

  const initial = useMemo(() => {
    const candidate = periodHistory?.[0] || periodStart;
    if (candidate) {
      const d = normalizeNoon(new Date(candidate));
      if (!Number.isNaN(d.getTime())) return d;
    }
    return today;
  }, [periodHistory, periodStart, today]);

  const [pickedDate, setPickedDate] = useState<Date>(initial);

  const onChange = (_: any, date?: Date) => {
    if (!date) return;
    const normalized = toLocalDateOnly(date);
    setPickedDate(normalized);
  };

  const handleAddPast = async () => {
    const chosen = normalizeNoon(pickedDate);

    if (chosen.getTime() > today.getTime()) {
      Alert.alert('שימי לב', 'אי אפשר לבחור תאריך עתידי');
      return;
    }

    await addPeriodDate(chosen.toISOString());
    Alert.alert('נשמר', `נוסף מחזור שמתחיל ב ${formatIL(chosen)}`);
  };

  const handleRemove = async (iso: string) => {
    await removePeriodDate(iso);
  };

  const handleContinue = async () => {
    if (!periodHistory || periodHistory.length === 0) {
      Alert.alert('רגע לפני', 'כדי להמשיך, הוסיפי לפחות תאריך אחד של תחילת מחזור');
      return;
    }

    const newest = periodHistory[0];
    await setPeriodStart(newest);

    router.replace('/(tabs)/dashboard' as any);
  };

  const historyPreview = useMemo(() => {
    const arr = Array.isArray(periodHistory) ? periodHistory : [];
    return arr.slice(0, 10);
  }, [periodHistory]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>מתי התחיל המחזור האחרון</Text>
      <Text style={styles.subtitle}>אפשר לשנות בהמשך מההגדרות</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>בחרי תאריך</Text>

        <View style={styles.pickerWrap}>
          <DateTimePicker value={pickedDate} mode="date" display="spinner" onChange={onChange} maximumDate={today} />
        </View>

        <Text style={styles.pickedText}>נבחר: {formatIL(pickedDate)}</Text>

        <Pressable style={styles.addBtn} onPress={() => void handleAddPast()}>
          <Text style={styles.addBtnText}>הוסף תאריך מחזור</Text>
        </Pressable>

        <Text style={styles.hint}>
          מומלץ להוסיף 3 עד 6 מחזורים קודמים לשיפור הדיוק של החישובים. אם אין, אפשר להתחיל גם עם מחזור אחד.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>מחזורים שהוזנו</Text>

        {historyPreview.length === 0 ? (
          <Text style={styles.empty}>עדיין לא הוספת תאריכים</Text>
        ) : (
          <View style={styles.list}>
            {historyPreview.map((iso) => {
              const d = normalizeNoon(new Date(iso));
              const label = Number.isNaN(d.getTime()) ? iso : formatIL(d);

              return (
                <View key={iso} style={styles.row}>
                  <Text style={styles.rowText}>{label}</Text>
                  <Pressable style={styles.removeBtn} onPress={() => void handleRemove(iso)}>
                    <Text style={styles.removeBtnText}>הסר</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
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
  content: { paddingTop: 18, paddingBottom: 28 },

  title: { fontSize: 22, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', writingDirection: 'rtl', marginBottom: 14, fontWeight: '700' },

  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 18, padding: 14, backgroundColor: '#fafafa', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#111', writingDirection: 'rtl', textAlign: 'right', marginBottom: 10 },

  pickerWrap: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    height: 210,
    justifyContent: 'center',
  },

  pickedText: { marginTop: 10, fontSize: 14, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl', color: '#111' },

  addBtn: {
    marginTop: 12,
    backgroundColor: '#6a1b9a',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: 16, writingDirection: 'rtl' },

  hint: { marginTop: 10, fontSize: 12, color: '#666', fontWeight: '700', writingDirection: 'rtl', textAlign: 'right' },

  empty: { fontSize: 12, color: '#666', fontWeight: '700', writingDirection: 'rtl', textAlign: 'right' },

  list: { gap: 10 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  rowText: { fontWeight: '900', color: '#111', writingDirection: 'rtl', textAlign: 'right' },

  removeBtn: {
    borderWidth: 1,
    borderColor: '#6a1b9a',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  removeBtnText: { color: '#6a1b9a', fontWeight: '900', writingDirection: 'rtl' },

  primary: { marginTop: 6, backgroundColor: '#111', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 16, writingDirection: 'rtl' },

  disclaimer: { marginTop: 10, fontSize: 12, color: '#666', textAlign: 'center', writingDirection: 'rtl', fontWeight: '700' },
});
