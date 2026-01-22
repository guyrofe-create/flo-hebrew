// app/(tabs)/settings.tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '../../context/UserDataContext';
import {
    cancelDailyReminder,
    // Predicted period
    cancelPredictedPeriodReminder,
    debugScheduledNotificationsText,
    ensureNotifPermissions,
    getDailyReminderTime,
    getPredictedPeriodReminderEnabled,
    isDailyReminderScheduled,
    isPredictedPeriodReminderScheduled,
    scheduleDailyReminder,
    schedulePredictedPeriodReminder,
    setDailyReminderTime,
    setPredictedPeriodReminderEnabled,
} from '../../lib/notifications';

type DailyTime = { hour: number; minute: number };

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function normalizeNoon(d: Date) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

export default function SettingsScreen() {
  const router = useRouter();

  const { resetUserData, periodHistory, periodStart, cycleLength } = useUserData();

  const [dailyEnabled, setDailyEnabled] = useState<boolean>(false);
  const [dailyTime, setDailyTime] = useState<DailyTime>({ hour: 20, minute: 30 });
  const [showPicker, setShowPicker] = useState(false);

  const [predEnabled, setPredEnabled] = useState<boolean>(false);
  const [predScheduled, setPredScheduled] = useState<boolean>(false);

  const timeLabel = useMemo(
    () => `${pad2(dailyTime.hour)}:${pad2(dailyTime.minute)}`,
    [dailyTime]
  );

  const lastPeriodStartIso = useMemo(() => {
    const newest = periodHistory?.length ? periodHistory[0] : periodStart;
    if (!newest) return null;
    const dt = normalizeNoon(new Date(newest));
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  }, [periodHistory, periodStart]);

  useEffect(() => {
    (async () => {
      const [scheduled, t, pe, ps] = await Promise.all([
        isDailyReminderScheduled(),
        getDailyReminderTime(),
        getPredictedPeriodReminderEnabled(),
        isPredictedPeriodReminderScheduled(),
      ]);

      setDailyEnabled(scheduled);
      setDailyTime(t);

      setPredEnabled(pe);
      setPredScheduled(ps);
    })();
  }, []);

  const toggleDaily = async () => {
    if (!dailyEnabled) {
      const ok = await ensureNotifPermissions();
      if (!ok) {
        Alert.alert('אין הרשאה להתראות', 'כדי לקבל תזכורות צריך לאשר הרשאות התראות בהגדרות המכשיר.');
        return;
      }

      await scheduleDailyReminder(dailyTime.hour, dailyTime.minute);
      setDailyEnabled(true);
      Alert.alert('הופעל', `תזכורת יומית הופעלה ל-${timeLabel}.`);
      return;
    }

    await cancelDailyReminder();
    setDailyEnabled(false);
    Alert.alert('בוטל', 'תזכורת יומית בוטלה.');
  };

  const reschedulePredictedIfNeeded = async () => {
    const enabled = await getPredictedPeriodReminderEnabled();
    if (!enabled) return;
    if (!lastPeriodStartIso) return;

    try {
      await schedulePredictedPeriodReminder(lastPeriodStartIso, cycleLength);
      setPredScheduled(true);
    } catch {
      // ignore
    }
  };

  const onPickTime = async (selectedDate?: Date) => {
    if (!selectedDate) {
      setShowPicker(false);
      return;
    }

    const h = selectedDate.getHours();
    const m = selectedDate.getMinutes();

    setDailyTime({ hour: h, minute: m });
    await setDailyReminderTime(h, m);

    setShowPicker(false);

    if (dailyEnabled) {
      const ok = await ensureNotifPermissions();
      if (!ok) {
        Alert.alert('אין הרשאה להתראות', 'כדי לקבל תזכורות צריך לאשר הרשאות התראות בהגדרות המכשיר.');
        return;
      }

      await scheduleDailyReminder(h, m);
      Alert.alert('עודכן', `שעת התזכורת עודכנה ל-${pad2(h)}:${pad2(m)}.`);
    } else {
      Alert.alert('עודכן', `שעת התזכורת נשמרה ל-${pad2(h)}:${pad2(m)}. הפעל את התזכורת כדי שתרוץ.`);
    }

    // גם תזכורת מחזור צפוי משתמשת באותה שעה, אז אם היא מופעלת נעדכן אותה
    await reschedulePredictedIfNeeded();
  };

  const togglePredicted = async () => {
    const currentlyEnabled = await getPredictedPeriodReminderEnabled();

    if (!currentlyEnabled) {
      if (!lastPeriodStartIso) {
        Alert.alert('אין מספיק נתונים', 'כדי להפעיל תזכורת למחזור צפוי צריך לפחות תאריך תחילת מחזור אחד.');
        return;
      }

      const ok = await ensureNotifPermissions();
      if (!ok) {
        Alert.alert('אין הרשאה להתראות', 'כדי לקבל תזכורות צריך לאשר הרשאות התראות בהגדרות המכשיר.');
        return;
      }

      await setPredictedPeriodReminderEnabled(true);
      setPredEnabled(true);

      await schedulePredictedPeriodReminder(lastPeriodStartIso, cycleLength);
      setPredScheduled(true);

      Alert.alert('הופעל', 'תזכורת למחזור צפוי הופעלה. התראה תישלח יום לפני המחזור המשוער.');
      return;
    }

    await setPredictedPeriodReminderEnabled(false);
    setPredEnabled(false);

    await cancelPredictedPeriodReminder();
    setPredScheduled(false);

    Alert.alert('בוטל', 'תזכורת למחזור צפוי בוטלה.');
  };

  const runDebug = async () => {
    if (!__DEV__) return;
    const txt = await debugScheduledNotificationsText();
    Alert.alert('DEBUG - Scheduled Notifications', txt);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>הגדרות</Text>

      <Pressable style={styles.btn} onPress={() => router.push('/history')}>
        <Text style={styles.btnText}>היסטוריית מחזורים</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>תזכורות</Text>

        <Pressable
          style={[styles.btn, dailyEnabled ? styles.btnOn : styles.btnOff]}
          onPress={toggleDaily}
        >
          <Text style={[styles.btnText, dailyEnabled ? styles.btnTextOn : styles.btnTextOff]}>
            {dailyEnabled ? `כיבוי תזכורת יומית (${timeLabel})` : `הפעלת תזכורת יומית (${timeLabel})`}
          </Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.timeBtn]} onPress={() => setShowPicker(true)}>
          <Text style={[styles.btnText, styles.timeText]}>שינוי שעת תזכורת ({timeLabel})</Text>
        </Pressable>

        {showPicker && (
          <DateTimePicker
            value={new Date(2000, 0, 1, dailyTime.hour, dailyTime.minute, 0)}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_event, selectedDate) => {
              void onPickTime(selectedDate ?? undefined);
            }}
          />
        )}

        <View style={styles.sep} />

        <Pressable
          style={[styles.btn, predEnabled ? styles.btnOn : styles.btnOff]}
          onPress={togglePredicted}
        >
          <Text style={[styles.btnText, predEnabled ? styles.btnTextOn : styles.btnTextOff]}>
            {predEnabled
              ? `כיבוי תזכורת למחזור צפוי (${predScheduled ? 'מתוזמן' : 'לא מתוזמן'})`
              : 'הפעלת תזכורת למחזור צפוי'}
          </Text>
        </Pressable>

        <Text style={styles.cardNote}>
          התזכורת למחזור צפוי נשלחת יום לפני המחזור המשוער, לפי הנתונים שהוזנו באפליקציה.
        </Text>

        {__DEV__ && (
          <Pressable style={[styles.btn, styles.debugBtn]} onPress={runDebug}>
            <Text style={[styles.btnText, styles.debugText]}>DEBUG: הצג התראות מתוזמנות</Text>
          </Pressable>
        )}

        <Text style={styles.cardNote}>
          התזכורת היומית נועדה להזכיר לעדכן סימפטומים והערות כדי שהמעקב יהיה מדויק יותר.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>מסמכים</Text>

        <Pressable style={[styles.btn, styles.docBtn]} onPress={() => router.push('/legal')}>
          <Text style={[styles.btnText, styles.docText]}>מידע משפטי</Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.docBtn]} onPress={() => router.push('/privacy')}>
          <Text style={[styles.btnText, styles.docText]}>מדיניות פרטיות</Text>
        </Pressable>

        <Text style={styles.cardNote}>
          מומלץ לקרוא לפני שימוש. המסמכים זמינים גם מהדיסקליימר במסך הפתיחה.
        </Text>
      </View>

      <Pressable
        style={[styles.btn, styles.danger]}
        onPress={async () => {
          Alert.alert('איפוס', 'לאפס את כל הנתונים ולהתחיל מחדש?', [
            { text: 'ביטול', style: 'cancel' },
            {
              text: 'אפס',
              style: 'destructive',
              onPress: async () => {
                await resetUserData();
                router.replace('/');
              },
            },
          ]);
        }}
      >
        <Text style={[styles.btnText, styles.dangerText]}>איפוס והתחלה מחדש</Text>
      </Pressable>

      <Text style={styles.note}>בהמשך נוסיף כאן: התראת חלון פוריות ועוד.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  content: { paddingBottom: 28 },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    writingDirection: 'rtl',
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: { fontSize: 16, fontWeight: '900', color: '#6a1b9a', writingDirection: 'rtl' },

  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 10,
    writingDirection: 'rtl',
    textAlign: 'right',
    color: '#111',
  },
  cardNote: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    writingDirection: 'rtl',
    textAlign: 'right',
    fontWeight: '700',
  },

  btnOn: { borderColor: '#d9c3ff', backgroundColor: '#efe5ff' },
  btnOff: { borderColor: '#eee', backgroundColor: '#fff' },
  btnTextOn: { color: '#2b0b3f' },
  btnTextOff: { color: '#6a1b9a' },

  timeBtn: { borderColor: '#e8e8e8', backgroundColor: '#fafafa' },
  timeText: { color: '#111' },

  debugBtn: { borderColor: '#e8e8e8', backgroundColor: '#fafafa' },
  debugText: { color: '#111' },

  docBtn: { borderColor: '#eee', backgroundColor: '#fafafa' },
  docText: { color: '#2b0b3f' },

  danger: { borderColor: '#f3c4c4' },
  dangerText: { color: '#e53935' },

  sep: { height: 1, backgroundColor: '#eee', marginVertical: 8 },

  note: { marginTop: 14, fontSize: 12, color: '#666', textAlign: 'center', writingDirection: 'rtl' },
});
