import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { addDays, normalizeNoon } from './date';

const STORAGE_KEY_DAILY_REMINDER_ID = 'shula_daily_reminder_id';
const STORAGE_KEY_DAILY_REMINDER_TIME = 'shula_daily_reminder_time';

const STORAGE_KEY_PREDICTED_PERIOD_ENABLED = 'shula_predicted_period_enabled';
const STORAGE_KEY_PREDICTED_PERIOD_ID = 'shula_predicted_period_id';

export type DailyTime = { hour: number; minute: number };

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function clampInt(n: number, min: number, max: number) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.min(max, Math.max(min, Math.trunc(x)));
}

function normalizeTime(hour: number, minute: number): DailyTime {
  return {
    hour: clampInt(hour, 0, 23),
    minute: clampInt(minute, 0, 59),
  };
}

function buildTriggerDate(baseDay: Date, hour: number, minute: number) {
  const t = new Date(baseDay);
  t.setHours(hour, minute, 0, 0);
  return t;
}

async function getStoredReminderId(): Promise<string | null> {
  try {
    const id = await AsyncStorage.getItem(STORAGE_KEY_DAILY_REMINDER_ID);
    return id || null;
  } catch {
    return null;
  }
}

async function setStoredReminderId(id: string | null): Promise<void> {
  try {
    if (!id) {
      await AsyncStorage.removeItem(STORAGE_KEY_DAILY_REMINDER_ID);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY_DAILY_REMINDER_ID, id);
  } catch {
    // ignore
  }
}

async function getStoredPredictedPeriodId(): Promise<string | null> {
  try {
    const id = await AsyncStorage.getItem(STORAGE_KEY_PREDICTED_PERIOD_ID);
    return id || null;
  } catch {
    return null;
  }
}

async function setStoredPredictedPeriodId(id: string | null): Promise<void> {
  try {
    if (!id) {
      await AsyncStorage.removeItem(STORAGE_KEY_PREDICTED_PERIOD_ID);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY_PREDICTED_PERIOD_ID, id);
  } catch {
    // ignore
  }
}

export async function ensureNotifPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return !!requested.granted;
}

export async function setDailyReminderTime(hour: number, minute: number): Promise<void> {
  const t = normalizeTime(hour, minute);
  const value = `${pad2(t.hour)}:${pad2(t.minute)}`;
  try {
    await AsyncStorage.setItem(STORAGE_KEY_DAILY_REMINDER_TIME, value);
  } catch {
    // ignore
  }
}

export async function getDailyReminderTime(): Promise<DailyTime> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY_DAILY_REMINDER_TIME);
    if (!v) return { hour: 20, minute: 30 };

    const parts = v.split(':');
    if (parts.length !== 2) return { hour: 20, minute: 30 };

    const h = Number(parts[0]);
    const m = Number(parts[1]);
    return normalizeTime(h, m);
  } catch {
    return { hour: 20, minute: 30 };
  }
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  await cancelDailyReminder();

  await setDailyReminderTime(hour, minute);
  const t = normalizeTime(hour, minute);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'תזכורת יומית',
      body: 'כדאי לעדכן סימפטומים והערות, זה משפר את הדיוק של המעקב.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: t.hour,
      minute: t.minute,
    },
  });

  await setStoredReminderId(id);
}

export async function cancelDailyReminder(): Promise<void> {
  const storedId = await getStoredReminderId();

  if (storedId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(storedId);
    } catch {
      // ignore
    }
  }

  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      const trig: any = n.trigger;
      const isDaily = trig?.type === Notifications.SchedulableTriggerInputTypes.DAILY;
      const looksLikeOurTitle = n?.content?.title === 'תזכורת יומית';
      if (isDaily && looksLikeOurTitle) {
        try {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  await setStoredReminderId(null);
}

export async function isDailyReminderScheduled(): Promise<boolean> {
  const storedId = await getStoredReminderId();
  const all = await Notifications.getAllScheduledNotificationsAsync();

  if (storedId) return all.some(n => n.identifier === storedId);

  return all.some(n => {
    const trig: any = n.trigger;
    const isDaily = trig?.type === Notifications.SchedulableTriggerInputTypes.DAILY;
    const looksLikeOurTitle = n?.content?.title === 'תזכורת יומית';
    return isDaily && looksLikeOurTitle;
  });
}

export async function setPredictedPeriodReminderEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PREDICTED_PERIOD_ENABLED, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export async function getPredictedPeriodReminderEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY_PREDICTED_PERIOD_ENABLED);
    return v === 'true';
  } catch {
    return false;
  }
}

/**
 * חדש: תזמון התראת "מחזור צפוי בקרוב" לפי תאריך מחזור צפוי שכבר חושב באפליקציה (forecast.nextPeriodStart).
 * זה מבטיח שההתראה תואמת לדשבורד (כולל התאמות לפי ביוץ חיובי).
 */
export async function schedulePredictedPeriodReminderForNextPeriodStart(nextPeriodStartIso: string): Promise<void> {
  await cancelPredictedPeriodReminder();

  const nextStart = normalizeNoon(new Date(nextPeriodStartIso));
  if (Number.isNaN(nextStart.getTime())) return;

  const { hour, minute } = await getDailyReminderTime();
  const now = new Date();

  // ברירת מחדל: יום לפני המחזור הצפוי, בשעה השמורה
  let reminderDay = addDays(nextStart, -1);
  let triggerDate = buildTriggerDate(reminderDay, hour, minute);

  // אם כבר עבר, ננסה באותו יום של המחזור הצפוי בשעה השמורה
  if (triggerDate.getTime() <= now.getTime() + 60_000) {
    reminderDay = addDays(nextStart, 0);
    triggerDate = buildTriggerDate(reminderDay, hour, minute);
  }

  // אם גם זה עבר, נזיז למחר בשעה השמורה
  if (triggerDate.getTime() <= now.getTime() + 60_000) {
    const tomorrow = addDays(normalizeNoon(new Date()), 1);
    triggerDate = buildTriggerDate(tomorrow, hour, minute);
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'מחזור צפוי בקרוב',
      body: 'לפי הנתונים שהוזנו, ייתכן שמחר יתחיל מחזור. רוצה לעדכן סימפטומים או להתכונן מראש?',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  await setStoredPredictedPeriodId(id);
}

/**
 * ישן: נשאר לתאימות לאחור, אם עוד יש מקומות שקוראים לו.
 * מומלץ שבסוף לא נשתמש בו, אלא ב schedulePredictedPeriodReminderForNextPeriodStart.
 */
export async function schedulePredictedPeriodReminder(lastPeriodStartIso: string, cycleLength: number): Promise<void> {
  await cancelPredictedPeriodReminder();

  const okCycle = Number.isFinite(cycleLength) && cycleLength > 0;
  if (!okCycle) return;

  const lastStart = normalizeNoon(new Date(lastPeriodStartIso));
  if (Number.isNaN(lastStart.getTime())) return;

  const { hour, minute } = await getDailyReminderTime();
  const now = new Date();

  let nextPeriod = addDays(lastStart, cycleLength);
  let reminderDay = addDays(nextPeriod, -1);
  let triggerDate = buildTriggerDate(reminderDay, hour, minute);

  if (triggerDate.getTime() <= now.getTime() + 60_000) {
    nextPeriod = addDays(nextPeriod, cycleLength);
    reminderDay = addDays(nextPeriod, -1);
    triggerDate = buildTriggerDate(reminderDay, hour, minute);
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'מחזור צפוי בקרוב',
      body: 'לפי הנתונים שהוזנו, ייתכן שמחר יתחיל מחזור. רוצה לעדכן סימפטומים או הכנה מראש?',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  await setStoredPredictedPeriodId(id);
}

export async function cancelPredictedPeriodReminder(): Promise<void> {
  const storedId = await getStoredPredictedPeriodId();

  if (storedId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(storedId);
    } catch {
      // ignore
    }
  }

  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      const looksLikeTitle = n?.content?.title === 'מחזור צפוי בקרוב';
      if (looksLikeTitle) {
        try {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  await setStoredPredictedPeriodId(null);
}

export async function isPredictedPeriodReminderScheduled(): Promise<boolean> {
  const storedId = await getStoredPredictedPeriodId();
  const all = await Notifications.getAllScheduledNotificationsAsync();

  if (storedId) return all.some(n => n.identifier === storedId);

  return all.some(n => n?.content?.title === 'מחזור צפוי בקרוב');
}

export async function debugScheduledNotificationsText(): Promise<string> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  if (!all || all.length === 0) return 'אין התראות מתוזמנות כרגע.';

  const storedDailyId = await getStoredReminderId();
  const storedTime = await AsyncStorage.getItem(STORAGE_KEY_DAILY_REMINDER_TIME);

  const storedPredId = await getStoredPredictedPeriodId();
  const predEnabled = await getPredictedPeriodReminderEnabled();

  const lines: string[] = [];
  lines.push(`סה"כ מתוזמנות: ${all.length}`);
  lines.push(`Daily ID: ${storedDailyId || 'אין'}`);
  lines.push(`שעה שמורה: ${storedTime || 'אין'}`);
  lines.push(`Predicted enabled: ${predEnabled ? 'true' : 'false'}`);
  lines.push(`Predicted ID: ${storedPredId || 'אין'}`);

  for (const n of all) {
    const id = n.identifier || '(ללא מזהה)';
    const trig: any = n.trigger;

    const hh = typeof trig?.hour === 'number' ? String(trig.hour).padStart(2, '0') : '--';
    const mm = typeof trig?.minute === 'number' ? String(trig.minute).padStart(2, '0') : '--';

    const type = trig?.type ? String(trig.type) : 'unknown';
    const title = n?.content?.title || '';
    lines.push(`• ${id} | type=${type} | שעה=${hh}:${mm} | title=${title}`);
  }

  return lines.join('\n');
}
