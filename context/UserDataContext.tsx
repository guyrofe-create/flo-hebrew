// context/UserDataContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  cancelPredictedPeriodReminder,
  getPredictedPeriodReminderEnabled,
  schedulePredictedPeriodReminder,
} from '../lib/notifications';

export type DaySymptoms = {
  flow?: 'none' | 'light' | 'medium' | 'heavy';
  pain?: 'none' | 'mild' | 'moderate' | 'severe';
  mood?: 'good' | 'ok' | 'low' | 'anxious';
  discharge?: 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
  sex?: boolean;
  ovulationTest?: 'negative' | 'positive';
  notes?: string;

  photoUri?: string;
};

export type UserData = {
  goal: string | null;
  birthday: string | null;

  periodStart: string | null; // ISO noon
  periodHistory: string[]; // ISO noon, חדש -> ישן

  periodLength: number; // default 5
  cycleLengthManual: number; // default 28 (אם אין מספיק היסטוריה)
  cycleLength: number; // מחושב מהיסטוריה, ואם אין מספיק - ידני
  isPeriodActive: boolean;

  symptomsByDay: Record<string, DaySymptoms>;

  disclaimerAccepted: boolean;
  acceptDisclaimer: () => Promise<void>;
  resetDisclaimer: () => Promise<void>;

  setGoal: (goal: string) => Promise<void>;
  setBirthday: (date: string | null) => Promise<void>;

  setPeriodLength: (days: number) => Promise<void>;
  setCycleLengthManual: (days: number) => Promise<void>;

  // חשוב: להשתמש בזה רק אם אתה יודע מה אתה עושה
  // בשגרה, onboarding/הוספת מחזור צריכים לקרוא addPeriodDate
  setPeriodStart: (date: string) => Promise<void>;

  addPeriodDate: (date: string) => Promise<void>;
  removePeriodDate: (date: string) => Promise<void>;

  startPeriodToday: () => Promise<void>;
  endPeriodToday: () => Promise<void>;

  setSymptomsForDay: (dayKey: string, patch: DaySymptoms) => Promise<void>;
  clearSymptomsForDay: (dayKey: string) => Promise<void>;

  resetUserData: () => Promise<void>;

  isSetupComplete: boolean;
  loading: boolean;
};

const UserDataContext = createContext<UserData | undefined>(undefined);

function calculateAverageCycleLength(cyclesOldestToNewest: string[]): number | null {
  if (cyclesOldestToNewest.length < 2) return null;

  const sorted = [...cyclesOldestToNewest].sort(); // ISO sort (ישן -> חדש)
  const diffs: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = Math.round((+curr - +prev) / 86400000);
    diffs.push(diff);
  }

  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.round(avg);
}

function toNoonIso(input: string | Date): string {
  const d = input instanceof Date ? new Date(input) : new Date(input);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function clampInt(n: number, min: number, max: number) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.min(max, Math.max(min, Math.trunc(x)));
}

const DISCLAIMER_KEY = 'disclaimerAccepted';

// Notifications storage keys (same as lib/notifications.ts)
const STORAGE_KEY_DAILY_REMINDER_ID = 'shula_daily_reminder_id';
const STORAGE_KEY_DAILY_REMINDER_TIME = 'shula_daily_reminder_time';
const STORAGE_KEY_PREDICTED_PERIOD_ENABLED = 'shula_predicted_period_enabled';
const STORAGE_KEY_PREDICTED_PERIOD_ID = 'shula_predicted_period_id';

// New onboarding keys
const STORAGE_KEY_CYCLE_LENGTH_MANUAL = 'cycleLengthManual';
const STORAGE_KEY_PERIOD_LENGTH = 'periodLength';

function computeCycleLengthFromHistoryOrManual(historyNewestToOldest: string[], manual: number): number {
  const oldestToNewest = [...historyNewestToOldest].sort(); // ישן -> חדש
  const avg = calculateAverageCycleLength(oldestToNewest);
  return avg ?? manual ?? 28;
}

async function resyncPredictedReminderFromHistory(
  historyNewestToOldest: string[],
  cycleLengthManual: number
) {
  try {
    const enabled = await getPredictedPeriodReminderEnabled();

    if (!enabled) {
      await cancelPredictedPeriodReminder();
      return;
    }

    if (!historyNewestToOldest || historyNewestToOldest.length === 0) {
      await cancelPredictedPeriodReminder();
      return;
    }

    const lastStartIso = historyNewestToOldest[0];
    const cycleLength = computeCycleLengthFromHistoryOrManual(historyNewestToOldest, cycleLengthManual);

    await schedulePredictedPeriodReminder(lastStartIso, cycleLength);
  } catch {
    // ignore
  }
}

export function UserDataProvider({ children }: { children: ReactNode }) {
  const [goal, setGoalState] = useState<string | null>(null);
  const [birthday, setBirthdayState] = useState<string | null>(null);
  const [periodStart, setPeriodStartState] = useState<string | null>(null);
  const [periodHistory, setPeriodHistory] = useState<string[]>([]);

  const [periodLength, setPeriodLengthState] = useState<number>(5);
  const [cycleLengthManual, setCycleLengthManualState] = useState<number>(28);
  const [isPeriodActive, setIsPeriodActive] = useState<boolean>(false);

  const [symptomsByDay, setSymptomsByDayState] = useState<Record<string, DaySymptoms>>({});

  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          storedGoal,
          storedBirthday,
          storedPeriodStart,
          storedHistory,
          storedPeriodLength,
          storedCycleLengthManual,
          storedIsPeriodActive,
          storedSymptomsByDay,
          storedDisclaimerAccepted,
        ] = await Promise.all([
          AsyncStorage.getItem('goal'),
          AsyncStorage.getItem('birthday'),
          AsyncStorage.getItem('periodStart'),
          AsyncStorage.getItem('periodHistory'),
          AsyncStorage.getItem(STORAGE_KEY_PERIOD_LENGTH),
          AsyncStorage.getItem(STORAGE_KEY_CYCLE_LENGTH_MANUAL),
          AsyncStorage.getItem('isPeriodActive'),
          AsyncStorage.getItem('symptomsByDay'),
          AsyncStorage.getItem(DISCLAIMER_KEY),
        ]);

        if (storedGoal) setGoalState(storedGoal);
        if (storedBirthday) setBirthdayState(storedBirthday);

        if (storedCycleLengthManual) {
          const num = Number(storedCycleLengthManual);
          if (!Number.isNaN(num) && num > 0) setCycleLengthManualState(clampInt(num, 18, 60));
        }

        if (storedPeriodLength) {
          const num = Number(storedPeriodLength);
          if (!Number.isNaN(num) && num > 0) setPeriodLengthState(clampInt(num, 2, 12));
        }

        // normalize + load history first (מקור האמת)
        let loadedHistory: string[] = [];
        if (storedHistory) {
          const parsed = JSON.parse(storedHistory);
          if (Array.isArray(parsed)) {
            loadedHistory = parsed
              .filter(Boolean)
              .map(toNoonIso)
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            setPeriodHistory(loadedHistory);
          }
        }

        // periodStart: אם יש history, נגזור ממנה. אם אין, נטען מ periodStart
        if (loadedHistory.length > 0) {
          setPeriodStartState(loadedHistory[0]);
        } else if (storedPeriodStart) {
          setPeriodStartState(toNoonIso(storedPeriodStart));
        }

        if (storedIsPeriodActive) {
          setIsPeriodActive(storedIsPeriodActive === 'true');
        }

        if (storedSymptomsByDay) {
          const parsed = JSON.parse(storedSymptomsByDay);
          if (parsed && typeof parsed === 'object') setSymptomsByDayState(parsed);
        }

        if (storedDisclaimerAccepted) {
          setDisclaimerAccepted(storedDisclaimerAccepted === 'true');
        }

        // Sync predicted reminder on boot (only if enabled and we have data)
        const manual = storedCycleLengthManual ? clampInt(Number(storedCycleLengthManual), 18, 60) : 28;

        if (loadedHistory.length > 0) {
          void resyncPredictedReminderFromHistory(loadedHistory, manual);
        } else if (storedPeriodStart) {
          const only = [toNoonIso(storedPeriodStart)];
          void resyncPredictedReminderFromHistory(only, manual);
        }
      } catch (e) {
        console.warn('שגיאה בטעינת נתונים מהזיכרון:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const setGoal = async (newGoal: string) => {
    setGoalState(newGoal);
    await AsyncStorage.setItem('goal', newGoal);
  };

  const setBirthday = async (newDate: string | null) => {
    if (!newDate) {
      setBirthdayState(null);
      await AsyncStorage.removeItem('birthday');
      return;
    }
    setBirthdayState(newDate);
    await AsyncStorage.setItem('birthday', newDate);
  };

  const setPeriodLength = async (days: number) => {
    const v = clampInt(days, 2, 12);
    setPeriodLengthState(v);
    await AsyncStorage.setItem(STORAGE_KEY_PERIOD_LENGTH, String(v));
  };

  const setCycleLengthManual = async (days: number) => {
    const v = clampInt(days, 18, 60);
    setCycleLengthManualState(v);
    await AsyncStorage.setItem(STORAGE_KEY_CYCLE_LENGTH_MANUAL, String(v));

    // update predicted reminder if enabled and we have history
    const history = periodHistory.length > 0 ? periodHistory : periodStart ? [periodStart] : [];
    if (history.length > 0) void resyncPredictedReminderFromHistory(history, v);
  };

  const setPeriodStart = async (newDate: string) => {
    const normalized = toNoonIso(newDate);
    setPeriodStartState(normalized);
    await AsyncStorage.setItem('periodStart', normalized);

    // If user sets periodStart manually, treat as a single-entry history for prediction
    const base = [normalized, ...periodHistory].filter(Boolean);
    void resyncPredictedReminderFromHistory(base, cycleLengthManual);
  };

  // 1) לא להשתמש ב periodHistory מה closure (יכול להיות ישן).
  // 2) periodStart חייב להתעדכן יחד עם history.
  // 3) לנרמל לשעה 12:00 ולהסיר כפילויות.
  const addPeriodDate = async (newDate: string) => {
    const normalized = toNoonIso(newDate);

    setPeriodHistory(prev => {
      const updated = [normalized, ...prev]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      setPeriodStartState(updated[0]);

      AsyncStorage.setItem('periodHistory', JSON.stringify(updated));
      AsyncStorage.setItem('periodStart', updated[0]);

      // resync predicted reminder based on the new history
      void resyncPredictedReminderFromHistory(updated, cycleLengthManual);

      return updated;
    });
  };

  const removePeriodDate = async (dateToRemove: string) => {
    const normalizedRemove = toNoonIso(dateToRemove);

    setPeriodHistory(prev => {
      const updated = prev
        .filter(d => d !== normalizedRemove)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      AsyncStorage.setItem('periodHistory', JSON.stringify(updated));

      if (updated.length > 0) {
        setPeriodStartState(updated[0]);
        AsyncStorage.setItem('periodStart', updated[0]);
        void resyncPredictedReminderFromHistory(updated, cycleLengthManual);
      } else {
        setPeriodStartState(null);
        AsyncStorage.removeItem('periodStart');
        void resyncPredictedReminderFromHistory([], cycleLengthManual);
      }

      return updated;
    });
  };

  const startPeriodToday = async () => {
    const todayIso = toNoonIso(new Date());
    await addPeriodDate(todayIso);
    setIsPeriodActive(true);
    await AsyncStorage.setItem('isPeriodActive', 'true');
  };

  const endPeriodToday = async () => {
    setIsPeriodActive(false);
    await AsyncStorage.setItem('isPeriodActive', 'false');
  };

  const setSymptomsForDay = async (dayKey: string, patch: DaySymptoms) => {
    setSymptomsByDayState(prev => {
      const next: Record<string, DaySymptoms> = {
        ...prev,
        [dayKey]: { ...(prev[dayKey] || {}), ...patch },
      };
      AsyncStorage.setItem('symptomsByDay', JSON.stringify(next));
      return next;
    });
  };

  const clearSymptomsForDay = async (dayKey: string) => {
    setSymptomsByDayState(prev => {
      const next = { ...prev };
      delete next[dayKey];
      AsyncStorage.setItem('symptomsByDay', JSON.stringify(next));
      return next;
    });
  };

  const acceptDisclaimer = useCallback(async () => {
    await AsyncStorage.setItem(DISCLAIMER_KEY, 'true');
    setDisclaimerAccepted(true);
  }, []);

  const resetDisclaimer = useCallback(async () => {
    await AsyncStorage.removeItem(DISCLAIMER_KEY);
    setDisclaimerAccepted(false);
  }, []);

  const resetUserData = async () => {
    await AsyncStorage.multiRemove([
      'goal',
      'birthday',
      'periodStart',
      'periodHistory',
      STORAGE_KEY_PERIOD_LENGTH,
      STORAGE_KEY_CYCLE_LENGTH_MANUAL,
      'isPeriodActive',
      'symptomsByDay',
      DISCLAIMER_KEY,

      // notifications state cleanup
      STORAGE_KEY_DAILY_REMINDER_ID,
      STORAGE_KEY_DAILY_REMINDER_TIME,
      STORAGE_KEY_PREDICTED_PERIOD_ENABLED,
      STORAGE_KEY_PREDICTED_PERIOD_ID,
    ]);

    // cancel scheduled predicted reminder if any
    try {
      await cancelPredictedPeriodReminder();
    } catch {
      // ignore
    }

    setGoalState(null);
    setBirthdayState(null);
    setPeriodStartState(null);
    setPeriodHistory([]);
    setPeriodLengthState(5);
    setCycleLengthManualState(28);
    setIsPeriodActive(false);
    setSymptomsByDayState({});
    setDisclaimerAccepted(false);
  };

  const cycleDatesOldestToNewest = useMemo(() => {
    if (periodHistory.length > 0) return [...periodHistory].sort(); // ישן->חדש לחישוב
    if (periodStart) return [periodStart];
    return [];
  }, [periodHistory, periodStart]);

  const cycleLength = useMemo(() => {
    const avg = calculateAverageCycleLength(cycleDatesOldestToNewest);
    return avg ?? cycleLengthManual ?? 28;
  }, [cycleDatesOldestToNewest, cycleLengthManual]);

  const isSetupComplete = useMemo(() => {
    // Birthday הוא מומלץ אבל לא חובה
    return !!(goal && periodStart);
  }, [goal, periodStart]);

  return (
    <UserDataContext.Provider
      value={{
        goal,
        birthday,
        periodStart,
        periodHistory,

        periodLength,
        cycleLengthManual,
        cycleLength,
        isPeriodActive,

        symptomsByDay,

        disclaimerAccepted,
        acceptDisclaimer,
        resetDisclaimer,

        setGoal,
        setBirthday,

        setPeriodLength,
        setCycleLengthManual,

        setPeriodStart,

        addPeriodDate,
        removePeriodDate,

        startPeriodToday,
        endPeriodToday,

        setSymptomsForDay,
        clearSymptomsForDay,

        resetUserData,
        isSetupComplete,
        loading,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}
