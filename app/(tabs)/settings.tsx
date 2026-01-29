// app/(tabs)/settings.tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useUserData } from '../../context/UserDataContext';
import { computeCycleForecast } from '../../lib/cycleForecast';
import { normalizeNoon } from '../../lib/date';
import {
    cancelDailyReminder,
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

function diffDays(a: Date, b: Date) {
  const ms = normalizeNoon(b).getTime() - normalizeNoon(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function goalLabel(goal: string | null) {
  if (goal === 'conceive') return 'כניסה להריון';
  if (goal === 'prevent') return 'מניעה';
  return 'מעקב כללי';
}

export default function SettingsScreen() {
  const router = useRouter();

  const {
    resetUserData,
    periodHistory,
    periodStart,
    cycleLength,
    periodLength,
    symptomsByDay,
    advancedTracking,
    setAdvancedTracking,
    goal,
    setGoal,
  } = useUserData();

  const [dailyEnabled, setDailyEnabled] = useState<boolean>(false);
  const [dailyTime, setDailyTime] = useState<DailyTime>({ hour: 20, minute: 30 });
  const [showPicker, setShowPicker] = useState(false);

  const [predEnabled, setPredEnabled] = useState<boolean>(false);
  const [predScheduled, setPredScheduled] = useState<boolean>(false);

  const timeLabel = useMemo(() => `${pad2(dailyTime.hour)}:${pad2(dailyTime.minute)}`, [dailyTime]);

  const lastPeriodStartIso = useMemo(() => {
    const newest = periodHistory?.length ? periodHistory[0] : periodStart;
    if (!newest) return null;
    const dt = normalizeNoon(new Date(newest));
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  }, [periodHistory, periodStart]);

  const effectiveCycleLengthForReminders = useMemo(() => {
    const forecast = computeCycleForecast({
      periodHistory,
      periodStart,
      cycleLength,
      periodLength,
      symptomsByDay,
    });

    if (forecast.lastPeriodStart && forecast.nextPeriodStart) {
      const d = diffDays(forecast.lastPeriodStart, forecast.nextPeriodStart);
      if (Number.isFinite(d) && d >= 18 && d <= 60) return d;
    }

    return cycleLength;
  }, [periodHistory, periodStart, cycleLength, periodLength, symptomsByDay]);

  const forcedAdvanced = useMemo(() => goal === 'conceive' || goal === 'prevent', [goal]);

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

  const reschedulePredictedIfNeeded = async () => {
    const enabled = await getPredictedPeriodReminderEnabled();
    if (!enabled) return;
    if (!lastPeriodStartIso) return;

    try {
      await schedulePredictedPeriodReminder(lastPeriodStartIso, effectiveCycleLengthForReminders);
      setPredScheduled(true);
    } catch {
      // ignore
    }
  };

  const toggleDaily = async () => {
    if (!dailyEnabled) {
      const ok = await ensureNotifPermissions();
      if (!ok) {
        Alert.alert('אין הרשאה להתראות', 'כדי לקבל תזכורות צריך לאשר הרשאות התראות בהגדרות המכשיר.');
        return;
      }

      await scheduleDailyReminder(dailyTime.hour, dailyTime.minute);
      setDailyEnabled(true);
      Alert.alert('הופעל', `תזכורת יומית הופעלה לשעה ${timeLabel}.`);
      await reschedulePredictedIfNeeded();
      return;
    }

    await cancelDailyReminder();
    setDailyEnabled(false);
    Alert.alert('בוטל', 'תזכורת יומית בוטלה.');
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

    if (Platform.OS === 'android') setShowPicker(false);

    if (dailyEnabled) {
      const ok = await ensureNotifPermissions();
      if (!ok) {
        Alert.alert('אין הרשאה להתראות', 'כדי לקבל תזכורות צריך לאשר הרשאות התראות בהגדרות המכשיר.');
        return;
      }

      await scheduleDailyReminder(h, m);
      Alert.alert('עודכן', `שעת התזכורת עודכנה ל ${pad2(h)}:${pad2(m)}.`);
    } else {
      Alert.alert('עודכן', `שעת התזכורת נשמרה ל ${pad2(h)}:${pad2(m)}. צריך להפעיל תזכורת כדי שתרוץ.`);
    }

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

      await schedulePredictedPeriodReminder(lastPeriodStartIso, effectiveCycleLengthForReminders);
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

  const onChangeGoal = () => {
    Alert.alert('שינוי מטרה', 'בחרי מטרה חדשה. אפשר לשנות בכל רגע לפי החיים האמיתיים.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מעקב כללי',
        onPress: () => void setGoal('track'),
      },
      {
        text: 'מניעה',
        onPress: () => void setGoal('prevent'),
      },
      {
        text: 'כניסה להריון',
        onPress: () => void setGoal('conceive'),
      },
    ]);
  };

  const handleResetConfirmed = async () => {
    try {
      setShowPicker(false);

      await Promise.all([
        cancelDailyReminder(),
        cancelPredictedPeriodReminder(),
        setPredictedPeriodReminderEnabled(false),
      ]);

      await resetUserData();

      setDailyEnabled(false);
      setPredEnabled(false);
      setPredScheduled(false);

      router.replace('/disclaimer');
    } catch {
      Alert.alert('שגיאה', 'לא הצלחתי לאפס את הנתונים. נסה שוב.');
    }
  };

  const onReset = () => {
    Alert.alert('איפוס נתונים', 'למחוק את כל הנתונים מהאפליקציה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק הכל',
        style: 'destructive',
        onPress: () => void handleResetConfirmed(),
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>הגדרות</Text>

      <Pressable style={styles.btn} onPress={() => router.push('/history')}>
        <Text style={styles.btnText}>היסטוריית מחזורים</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>מטרה</Text>

        <View style={styles.row}>
          <View style={styles.rowTextWrap}>
            <Text style={styles.rowTitle}>מטרה נוכחית</Text>
            <Text style={styles.rowSub}>
              {goalLabel(goal)}. אפשר לשנות בכל רגע - למשל מעבר ממעקב למניעה או לכניסה להריון.
            </Text>
          </View>

          <Pressable style={styles.smallBtn} onPress={onChangeGoal}>
            <Text style={styles.smallBtnText}>שינוי</Text>
          </Pressable>
        </View>

        <Text style={styles.cardNote}>
          במטרות מניעה וכניסה להריון מעקב מתקדם מופעל אוטומטית. במעקב כללי אפשר לבחור להפעיל או לכבות.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>מעקב</Text>

        <View style={styles.row}>
          <View style={styles.rowTextWrap}>
            <Text style={styles.rowTitle}>מעקב מתקדם</Text>
            <Text style={styles.rowSub}>מציג שדות נוספים ביומן: הפרשות, יחסים, בדיקות ביוץ, חום בסיסי (BBT).</Text>
            {forcedAdvanced && (
              <Text style={styles.lockHint}>
                במטרה {goalLabel(goal)} מעקב מתקדם חייב להיות פעיל.
              </Text>
            )}
          </View>

          <Switch
            value={advancedTracking}
            onValueChange={(v) => void setAdvancedTracking(v)}
            disabled={forcedAdvanced}
          />
        </View>

        <Text style={styles.cardNote}>
          אפשר לכבות בכל רגע (רק במעקב כללי). הנתונים שנשמרו נשארים, והחישובים עדיין מתחשבים בנתונים מתקדמים שכבר הוזנו.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>התראות</Text>

        <View style={styles.row}>
          <View style={styles.rowTextWrap}>
            <Text style={styles.rowTitle}>תזכורת יומית</Text>
            <Text style={styles.rowSub}>תזכורת קצרה לעדכון סימפטומים והערות.</Text>
          </View>

          <Switch value={dailyEnabled} onValueChange={() => void toggleDaily()} />
        </View>

        <Pressable style={[styles.btn, { marginBottom: 0 }]} onPress={() => setShowPicker(true)}>
          <Text style={styles.btnText}>שעה: {timeLabel}</Text>
        </Pressable>

        {showPicker && (
          <View style={{ marginTop: 10 }}>
            <DateTimePicker
              value={new Date(2000, 0, 1, dailyTime.hour, dailyTime.minute, 0, 0)}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour
              onChange={(_, d) => void onPickTime(d ?? undefined)}
            />

            {Platform.OS === 'ios' && (
              <Pressable style={[styles.btn, { marginTop: 10 }]} onPress={() => setShowPicker(false)}>
                <Text style={styles.btnText}>סגור</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={styles.rowTextWrap}>
            <Text style={styles.rowTitle}>התראה למחזור צפוי</Text>
            <Text style={styles.rowSub}>
              התראה יום לפני מחזור משוער. אם הוזנה בדיקת ביוץ חיובית במחזור הנוכחי, החישוב יתבסס עליה.
            </Text>
          </View>

          <Switch value={predEnabled} onValueChange={() => void togglePredicted()} />
        </View>

        <Text style={styles.cardNote}>מצב מתוזמן: {predEnabled ? (predScheduled ? 'כן' : 'מופעל אבל לא מתוזמן') : 'כבוי'}</Text>

        {__DEV__ && (
          <Pressable style={[styles.btn, { marginTop: 10 }]} onPress={() => void runDebug()}>
            <Text style={styles.btnText}>דיבוג התראות (DEV)</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>נתונים</Text>

        <Pressable style={[styles.btn, styles.dangerBtn]} onPress={onReset}>
          <Text style={[styles.btnText, styles.dangerText]}>איפוס נתונים</Text>
        </Pressable>

        <Text style={styles.cardNote}>מוחק מחזורים, סימפטומים, הגדרות והתראות.</Text>
      </View>

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
    backgroundColor: '#fff',
  },

  btnText: { fontSize: 16, fontWeight: '900', color: '#6a1b9a', writingDirection: 'rtl' },

  smallBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ddff',
    backgroundColor: '#fff',
  },

  smallBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#6a1b9a',
    writingDirection: 'rtl',
  },

  dangerBtn: {
    borderColor: '#ffd0d9',
    backgroundColor: '#ffe3e8',
  },

  dangerText: { color: '#b00020' },

  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 18, padding: 14, marginBottom: 12 },

  cardTitle: {
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 10,
    writingDirection: 'rtl',
    textAlign: 'right',
    color: '#111',
  },

  cardNote: { marginTop: 8, fontSize: 12, color: '#666', writingDirection: 'rtl', textAlign: 'right', fontWeight: '700' },

  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    backgroundColor: '#fafafa',
  },

  rowTextWrap: { flex: 1 },
  rowTitle: { fontWeight: '900', fontSize: 15, color: '#111', writingDirection: 'rtl', textAlign: 'right' },
  rowSub: { marginTop: 4, fontSize: 12, color: '#666', fontWeight: '700', writingDirection: 'rtl', textAlign: 'right', lineHeight: 16 },

  lockHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '800',
    color: '#6a1b9a',
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  note: { marginTop: 14, fontSize: 12, color: '#666', textAlign: 'center', writingDirection: 'rtl' },
});
