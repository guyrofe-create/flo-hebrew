// context/UserDataContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { MS_PER_DAY, toNoonIso } from '../lib/date';

export type DaySymptoms = {
  flow?: 'none' | 'light' | 'medium' | 'heavy';
  pain?: 'none' | 'mild' | 'moderate' | 'severe';
  mood?: 'good' | 'ok' | 'low' | 'anxious';
  discharge?: 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
  sex?: boolean;
  ovulationTest?: 'negative' | 'positive';
  bbt?: number;
  notes?: string;
  photoUri?: string;
};

export type UserData = {
  goal: string | null;
  birthday: string | null;
  periodStart: string | null;
  periodHistory: string[];
  periodLength: number;
  cycleLengthManual: number;
  cycleLength: number;
  isPeriodActive: boolean;
  symptomsByDay: Record<string, DaySymptoms>;

  selectedDayKey: string | null;
  setSelectedDayKey: (key: string | null) => void;

  advancedTracking: boolean;
  setAdvancedTracking: (v: boolean) => Promise<void>;

  disclaimerAccepted: boolean;
  acceptDisclaimer: () => Promise<void>;
  resetDisclaimer: () => Promise<void>;

  setGoal: (goal: string) => Promise<void>;
  setBirthday: (date: string | null) => Promise<void>;
  setPeriodLength: (days: number) => Promise<void>;

  setCycleLength: (days: number) => Promise<void>;

  setCycleLengthManual: (days: number) => Promise<void>;
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

const STORAGE_KEY_GOAL = 'goal';
const STORAGE_KEY_BIRTHDAY = 'birthday';
const STORAGE_KEY_PERIOD_START = 'periodStart';
const STORAGE_KEY_PERIOD_HISTORY = 'periodHistory';
const STORAGE_KEY_PERIOD_LENGTH = 'periodLength';
const STORAGE_KEY_CYCLE_LENGTH_MANUAL = 'cycleLengthManual';
const STORAGE_KEY_IS_PERIOD_ACTIVE = 'isPeriodActive';
const STORAGE_KEY_SYMPTOMS_BY_DAY = 'symptomsByDay';
const STORAGE_KEY_DISCLAIMER_ACCEPTED = 'disclaimerAccepted';
const STORAGE_KEY_ADVANCED_TRACKING = 'advancedTracking';

function clampInt(n: number, min: number, max: number) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.min(max, Math.max(min, Math.trunc(x)));
}

function calculateAverageCycleLength(cyclesOldestToNewest: string[]): number | null {
  if (cyclesOldestToNewest.length < 2) return null;

  const sorted = [...cyclesOldestToNewest].sort();
  const diffs: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = Math.round((curr.getTime() - prev.getTime()) / MS_PER_DAY);
    if (diff > 0) diffs.push(diff);
  }

  if (diffs.length === 0) return null;
  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return clampInt(Math.round(avg), 18, 60);
}

function uniqueSortedNewestToOldest(items: string[]): string[] {
  const uniq = Array.from(new Set(items.filter(Boolean)));
  return uniq.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
}

function shouldForceAdvancedTracking(goal: string | null) {
  return goal === 'conceive' || goal === 'prevent';
}

export function UserDataProvider({ children }: { children: ReactNode }) {
  const [goal, setGoalState] = useState<string | null>(null);
  const [birthday, setBirthdayState] = useState<string | null>(null);
  const [periodStart, setPeriodStartState] = useState<string | null>(null);
  const [periodHistory, setPeriodHistoryState] = useState<string[]>([]);
  const [periodLength, setPeriodLengthState] = useState<number>(5);
  const [cycleLengthManual, setCycleLengthManualState] = useState<number>(28);
  const [isPeriodActive, setIsPeriodActive] = useState<boolean>(false);
  const [symptomsByDay, setSymptomsByDayState] = useState<Record<string, DaySymptoms>>({});
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(false);
  const [advancedTracking, setAdvancedTrackingState] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const [selectedDayKey, setSelectedDayKeyState] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await AsyncStorage.multiGet([
          STORAGE_KEY_GOAL,
          STORAGE_KEY_BIRTHDAY,
          STORAGE_KEY_PERIOD_START,
          STORAGE_KEY_PERIOD_HISTORY,
          STORAGE_KEY_PERIOD_LENGTH,
          STORAGE_KEY_CYCLE_LENGTH_MANUAL,
          STORAGE_KEY_IS_PERIOD_ACTIVE,
          STORAGE_KEY_SYMPTOMS_BY_DAY,
          STORAGE_KEY_DISCLAIMER_ACCEPTED,
          STORAGE_KEY_ADVANCED_TRACKING,
        ]);

        const map = Object.fromEntries(stored);

        const loadedGoal = map[STORAGE_KEY_GOAL] || null;
        const loadedAdv = map[STORAGE_KEY_ADVANCED_TRACKING] === 'true';

        if (loadedGoal) setGoalState(loadedGoal);
        if (map[STORAGE_KEY_BIRTHDAY]) setBirthdayState(map[STORAGE_KEY_BIRTHDAY]);

        if (map[STORAGE_KEY_PERIOD_HISTORY]) {
          try {
            const parsed = JSON.parse(map[STORAGE_KEY_PERIOD_HISTORY]);
            if (Array.isArray(parsed)) setPeriodHistoryState(parsed);
          } catch {
            // ignore
          }
        }

        if (map[STORAGE_KEY_PERIOD_START]) setPeriodStartState(map[STORAGE_KEY_PERIOD_START]);
        if (map[STORAGE_KEY_PERIOD_LENGTH]) setPeriodLengthState(Number(map[STORAGE_KEY_PERIOD_LENGTH]));
        if (map[STORAGE_KEY_CYCLE_LENGTH_MANUAL]) setCycleLengthManualState(Number(map[STORAGE_KEY_CYCLE_LENGTH_MANUAL]));
        if (map[STORAGE_KEY_IS_PERIOD_ACTIVE]) setIsPeriodActive(map[STORAGE_KEY_IS_PERIOD_ACTIVE] === 'true');

        if (map[STORAGE_KEY_SYMPTOMS_BY_DAY]) {
          try {
            setSymptomsByDayState(JSON.parse(map[STORAGE_KEY_SYMPTOMS_BY_DAY]));
          } catch {
            // ignore
          }
        }

        if (map[STORAGE_KEY_DISCLAIMER_ACCEPTED]) setDisclaimerAccepted(map[STORAGE_KEY_DISCLAIMER_ACCEPTED] === 'true');

        if (shouldForceAdvancedTracking(loadedGoal)) {
          setAdvancedTrackingState(true);
          if (!loadedAdv) {
            await AsyncStorage.setItem(STORAGE_KEY_ADVANCED_TRACKING, 'true');
          }
        } else {
          setAdvancedTrackingState(loadedAdv);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const setSelectedDayKey = (key: string | null) => {
    setSelectedDayKeyState(key);
  };

  const setAdvancedTracking = async (v: boolean) => {
    if (shouldForceAdvancedTracking(goal) && !v) {
      setAdvancedTrackingState(true);
      await AsyncStorage.setItem(STORAGE_KEY_ADVANCED_TRACKING, 'true');
      return;
    }

    setAdvancedTrackingState(v);
    await AsyncStorage.setItem(STORAGE_KEY_ADVANCED_TRACKING, v ? 'true' : 'false');
  };

  const acceptDisclaimer = async () => {
    setDisclaimerAccepted(true);
    await AsyncStorage.setItem(STORAGE_KEY_DISCLAIMER_ACCEPTED, 'true');
  };

  const resetDisclaimer = async () => {
    setDisclaimerAccepted(false);
    await AsyncStorage.removeItem(STORAGE_KEY_DISCLAIMER_ACCEPTED);
  };

  const setGoal = async (g: string) => {
    setGoalState(g);
    await AsyncStorage.setItem(STORAGE_KEY_GOAL, g);

    if (shouldForceAdvancedTracking(g)) {
      setAdvancedTrackingState(true);
      await AsyncStorage.setItem(STORAGE_KEY_ADVANCED_TRACKING, 'true');
    }
  };

  const setBirthday = async (d: string | null) => {
    if (!d) {
      setBirthdayState(null);
      await AsyncStorage.removeItem(STORAGE_KEY_BIRTHDAY);
      return;
    }
    setBirthdayState(d);
    await AsyncStorage.setItem(STORAGE_KEY_BIRTHDAY, d);
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
  };

  const setCycleLength = async (days: number) => {
    await setCycleLengthManual(days);
  };

  const setPeriodStart = async (date: string) => {
    const normalized = toNoonIso(date);
    setPeriodStartState(normalized);
    await AsyncStorage.setItem(STORAGE_KEY_PERIOD_START, normalized);
  };

  const addPeriodDate = async (date: string) => {
    const normalized = toNoonIso(date);

    setPeriodHistoryState(prev => {
      const updated = uniqueSortedNewestToOldest([normalized, ...prev]);
      AsyncStorage.setItem(STORAGE_KEY_PERIOD_HISTORY, JSON.stringify(updated));
      return updated;
    });

    setPeriodStartState(prev => {
      if (prev) return prev;
      AsyncStorage.setItem(STORAGE_KEY_PERIOD_START, normalized);
      return normalized;
    });
  };

  const removePeriodDate = async (date: string) => {
    const normalized = toNoonIso(date);
    setPeriodHistoryState(prev => {
      const updated = prev.filter(d => d !== normalized);
      AsyncStorage.setItem(STORAGE_KEY_PERIOD_HISTORY, JSON.stringify(updated));
      return updated;
    });
  };

  const startPeriodToday = async () => {
    await addPeriodDate(toNoonIso(new Date()));
    setIsPeriodActive(true);
    await AsyncStorage.setItem(STORAGE_KEY_IS_PERIOD_ACTIVE, 'true');
  };

  const endPeriodToday = async () => {
    setIsPeriodActive(false);
    await AsyncStorage.setItem(STORAGE_KEY_IS_PERIOD_ACTIVE, 'false');
  };

  const setSymptomsForDay = async (dayKey: string, patch: DaySymptoms) => {
    setSymptomsByDayState(prev => {
      const next = { ...prev, [dayKey]: { ...(prev[dayKey] || {}), ...patch } };
      AsyncStorage.setItem(STORAGE_KEY_SYMPTOMS_BY_DAY, JSON.stringify(next));
      return next;
    });
  };

  const clearSymptomsForDay = async (dayKey: string) => {
    setSymptomsByDayState(prev => {
      const next = { ...prev };
      delete next[dayKey];
      AsyncStorage.setItem(STORAGE_KEY_SYMPTOMS_BY_DAY, JSON.stringify(next));
      return next;
    });
  };

  const resetUserData = async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEY_GOAL,
      STORAGE_KEY_BIRTHDAY,
      STORAGE_KEY_PERIOD_START,
      STORAGE_KEY_PERIOD_HISTORY,
      STORAGE_KEY_PERIOD_LENGTH,
      STORAGE_KEY_CYCLE_LENGTH_MANUAL,
      STORAGE_KEY_IS_PERIOD_ACTIVE,
      STORAGE_KEY_SYMPTOMS_BY_DAY,
      STORAGE_KEY_DISCLAIMER_ACCEPTED,
      STORAGE_KEY_ADVANCED_TRACKING,
    ]);

    setGoalState(null);
    setBirthdayState(null);
    setPeriodStartState(null);
    setPeriodHistoryState([]);
    setPeriodLengthState(5);
    setCycleLengthManualState(28);
    setIsPeriodActive(false);
    setSymptomsByDayState({});
    setDisclaimerAccepted(false);
    setAdvancedTrackingState(false);
    setSelectedDayKeyState(null);
  };

  const cycleDatesOldestToNewest = useMemo(() => {
    if (periodHistory.length > 0) return [...periodHistory].sort();
    if (periodStart) return [periodStart];
    return [];
  }, [periodHistory, periodStart]);

  const cycleLength = useMemo(() => {
    const avg = calculateAverageCycleLength(cycleDatesOldestToNewest);
    return avg ?? cycleLengthManual ?? 28;
  }, [cycleDatesOldestToNewest, cycleLengthManual]);

  const isSetupComplete = useMemo(() => {
    const hasGoal = !!goal;
    const hasAnyPeriod = (Array.isArray(periodHistory) && periodHistory.length > 0) || !!periodStart;
    return hasGoal && hasAnyPeriod;
  }, [goal, periodHistory, periodStart]);

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

        selectedDayKey,
        setSelectedDayKey,

        advancedTracking,
        setAdvancedTracking,

        disclaimerAccepted,
        acceptDisclaimer,
        resetDisclaimer,

        setGoal,
        setBirthday,
        setPeriodLength,

        setCycleLength,
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
  if (!context) throw new Error('useUserData must be used within a UserDataProvider');
  return context;
}
