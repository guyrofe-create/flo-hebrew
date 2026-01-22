// app/period.tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Button, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '../context/UserDataContext';

function normalizeNoon(d: Date) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

function isoDay(iso: string) {
  return iso.slice(0, 10);
}

export default function PeriodScreen() {
  const router = useRouter();
  const { setPeriodStart, addPeriodDate, periodHistory } = useUserData();

  const [lastDate, setLastDate] = useState<Date | null>(null);
  const [showLastPicker, setShowLastPicker] = useState(false);

  const [showPastMode, setShowPastMode] = useState(false);
  const [pastDate, setPastDate] = useState<Date | null>(null);
  const [showPastPicker, setShowPastPicker] = useState(false);

  const lastIso = useMemo(() => {
    if (!lastDate) return null;
    return normalizeNoon(lastDate).toISOString();
  }, [lastDate]);

  const pastIso = useMemo(() => {
    if (!pastDate) return null;
    return normalizeNoon(pastDate).toISOString();
  }, [pastDate]);

  const pastAlreadyAdded = useMemo(() => {
    if (!pastIso) return false;
    return periodHistory.some(d => isoDay(d) === isoDay(pastIso));
  }, [periodHistory, pastIso]);

  const onPickLast = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowLastPicker(false);
    if (!selectedDate) return;
    setLastDate(selectedDate);
    if (Platform.OS === 'ios') setShowLastPicker(true);
  };

  const onPickPast = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPastPicker(false);
    if (!selectedDate) return;
    setPastDate(selectedDate);
    if (Platform.OS === 'ios') setShowPastPicker(true);
  };

  const handleContinue = async () => {
    if (!lastIso) {
      Alert.alert('חסרה בחירה', 'בחרי תאריך למחזור האחרון כדי להמשיך.');
      return;
    }

    // אל תשתמשי ב-setPeriodStart כאן כדי לא לייצר כתיבה כפולה/מרדף מצבים.
    // addPeriodDate כבר מעדכן periodStart למחזור האחרון (updated[0]).
    const exists = periodHistory.some(d => isoDay(d) === isoDay(lastIso));
    if (!exists) {
      await addPeriodDate(lastIso);
    } else {
      await setPeriodStart(lastIso);
    }

    // חשוב: ב-onboarding אין (tabs), הולכים לדשבורד הטאבס
    router.replace('/(tabs)/dashboard');
  };

  const handleAddPast = async () => {
    if (!pastIso) return;

    if (pastAlreadyAdded) {
      Alert.alert('כבר קיים', 'התאריך הזה כבר נמצא בהיסטוריית המחזורים.');
      return;
    }

    await addPeriodDate(pastIso);

    // ניקוי בחירה
    setPastDate(null);
    setShowPastPicker(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>מתי התחיל המחזור האחרון שלך?</Text>

      <Button
        title={lastDate ? lastDate.toLocaleDateString('he-IL') : 'בחרי תאריך'}
        onPress={() => setShowLastPicker(true)}
        color="#6a1b9a"
      />

      {showLastPicker && (
        <DateTimePicker
          value={lastDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={onPickLast}
        />
      )}

      <View style={{ height: 18 }} />

      <Pressable onPress={() => setShowPastMode(v => !v)} style={styles.secondaryBtn}>
        <Text style={styles.secondaryText}>
          {showPastMode ? 'סגירת הוספת תאריכים נוספים' : 'יש לי גם תאריכי מחזורי עבר - הוספה'}
        </Text>
      </Pressable>

      {showPastMode && (
        <View style={styles.pastBox}>
          <Text style={styles.pastTitle}>הוספת תאריכי מחזורי עבר (אופציונלי)</Text>

          <Button
            title={pastDate ? pastDate.toLocaleDateString('he-IL') : 'בחרי תאריך להוספה'}
            onPress={() => setShowPastPicker(true)}
            color="#6a1b9a"
          />

          {showPastPicker && (
            <DateTimePicker
              value={pastDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={onPickPast}
            />
          )}

          <View style={{ marginTop: 10 }}>
            <Button
              title="הוסיפי תאריך"
              onPress={handleAddPast}
              disabled={!pastDate || pastAlreadyAdded}
              color="#6a1b9a"
            />
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.previewTitle}>מה יש כרגע בהיסטוריה:</Text>
            {periodHistory.length === 0 ? (
              <Text style={styles.previewEmpty}>עדיין אין.</Text>
            ) : (
              periodHistory.map((iso, idx) => (
                <Text key={`${iso}-${idx}`} style={styles.previewItem}>
                  • {new Date(iso).toLocaleDateString('he-IL')}
                </Text>
              ))
            )}
          </View>
        </View>
      )}

      <View style={styles.nextButton}>
        <Button title="המשך" onPress={handleContinue} disabled={!lastDate} color="#6a1b9a" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 22, marginBottom: 18, writingDirection: 'rtl', textAlign: 'center', fontWeight: '900' },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#e7dcff',
    backgroundColor: '#f5efff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    width: '100%',
  },
  secondaryText: { textAlign: 'center', fontWeight: '900', color: '#2b0b3f', writingDirection: 'rtl' },

  pastBox: {
    width: '100%',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#fafafa',
  },
  pastTitle: { fontWeight: '900', marginBottom: 10, writingDirection: 'rtl', textAlign: 'right' },

  previewTitle: { fontWeight: '900', marginBottom: 6, writingDirection: 'rtl', textAlign: 'right' },
  previewEmpty: { writingDirection: 'rtl', textAlign: 'right', color: '#666' },
  previewItem: { writingDirection: 'rtl', textAlign: 'right', marginBottom: 4 },

  nextButton: { marginTop: 20, width: '100%' },
});
