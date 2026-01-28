import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DaySymptoms } from '../../context/UserDataContext';
import { useUserData } from '../../context/UserDataContext';
import { addDays, isoNoonFromKey, normalizeNoon } from '../../lib/date';

function formatDateIL(d: Date) {
  return d.toLocaleDateString('he-IL');
}

function isOvulationPositive(v: unknown) {
  if (v === true) return true;

  if (typeof v === 'number') return v === 1;

  if (typeof v !== 'string') return false;

  const s = v.trim().toLowerCase();

  return (
    s === 'positive' ||
    s === 'pos' ||
    s === 'true' ||
    s === 'yes' ||
    s === 'y' ||
    s === '1' ||
    s === 'חיובי' ||
    s === 'כן'
  );
}

function parseNoonFromDayKey(key: string): Date | null {
  try {
    const d = normalizeNoon(new Date(isoNoonFromKey(key)));
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function getLatestPeriodStart(periodHistory: string[] | undefined, periodStart: string | null | undefined): Date | null {
  let best: Date | null = null;

  if (Array.isArray(periodHistory) && periodHistory.length) {
    for (const iso of periodHistory) {
      const d = normalizeNoon(new Date(iso));
      if (Number.isNaN(d.getTime())) continue;
      if (!best || d.getTime() > best.getTime()) best = d;
    }
  }

  if (!best && periodStart) {
    const d = normalizeNoon(new Date(periodStart));
    if (!Number.isNaN(d.getTime())) best = d;
  }

  return best;
}

function findLatestPositiveOvulationInCurrentCycle(
  symptomsByDay: Record<string, DaySymptoms> | undefined,
  lastPeriodStart: Date | null,
  cycleLength: number
): Date | null {
  if (!symptomsByDay || !lastPeriodStart || !cycleLength || cycleLength <= 0) return null;

  const start = normalizeNoon(lastPeriodStart);
  const end = normalizeNoon(addDays(start, cycleLength));

  let best: Date | null = null;

  for (const key of Object.keys(symptomsByDay)) {
    const sym = symptomsByDay[key];
    if (!sym) continue;
    if (!isOvulationPositive(sym.ovulationTest)) continue;

    const d = parseNoonFromDayKey(key);
    if (!d) continue;

    if (d.getTime() < start.getTime() || d.getTime() >= end.getTime()) continue;

    if (!best || d.getTime() > best.getTime()) best = d;
  }

  return best;
}

export default function DashboardScreen() {
  const {
    goal,
    periodHistory,
    periodStart,
    cycleLength,
    periodLength,
    isPeriodActive,
    startPeriodToday,
    endPeriodToday,
    symptomsByDay,
  } = useUserData();

  const today = useMemo(() => normalizeNoon(new Date()), []);

  const lastPeriodStart = useMemo(() => {
    return getLatestPeriodStart(periodHistory, periodStart);
  }, [periodHistory, periodStart]);

  const computedPeriodEnd = useMemo(() => {
    if (!lastPeriodStart || !periodLength || periodLength <= 0) return null;
    return normalizeNoon(addDays(lastPeriodStart, Math.max(0, periodLength - 1)));
  }, [lastPeriodStart, periodLength]);

  const latestPositiveOvulation = useMemo(() => {
    return findLatestPositiveOvulationInCurrentCycle(symptomsByDay, lastPeriodStart, cycleLength);
  }, [symptomsByDay, lastPeriodStart, cycleLength]);

  const ovulationDate = useMemo(() => {
    if (latestPositiveOvulation) return latestPositiveOvulation;

    if (!lastPeriodStart || !cycleLength || cycleLength <= 0) return null;
    const ovuIndex = Math.max(0, cycleLength - 14);
    return normalizeNoon(addDays(lastPeriodStart, ovuIndex));
  }, [latestPositiveOvulation, lastPeriodStart, cycleLength]);

  const fertileWindow = useMemo(() => {
    if (!ovulationDate) return null;
    const start = normalizeNoon(addDays(ovulationDate, -4));
    const end = normalizeNoon(addDays(ovulationDate, 1));
    return { start, end };
  }, [ovulationDate]);

  const nextPeriodStart = useMemo(() => {
    if (latestPositiveOvulation) return normalizeNoon(addDays(latestPositiveOvulation, 14));

    if (!lastPeriodStart || !cycleLength || cycleLength <= 0) return null;
    return normalizeNoon(addDays(lastPeriodStart, cycleLength));
  }, [latestPositiveOvulation, lastPeriodStart, cycleLength]);

  const cycleDayNumber = useMemo(() => {
    if (!lastPeriodStart) return null;
    const diffDays = Math.floor((today.getTime() - lastPeriodStart.getTime()) / (24 * 60 * 60 * 1000));
    return diffDays >= 0 ? diffDays + 1 : null;
  }, [today, lastPeriodStart]);

  const isInFertileWindow = useMemo(() => {
    if (!fertileWindow) return false;
    return today.getTime() >= fertileWindow.start.getTime() && today.getTime() <= fertileWindow.end.getTime();
  }, [fertileWindow, today]);

  const inPeriodByCalc = useMemo(() => {
    if (!lastPeriodStart || !periodLength || periodLength <= 0) return false;
    const end = normalizeNoon(addDays(lastPeriodStart, Math.max(0, periodLength - 1)));
    return today.getTime() >= lastPeriodStart.getTime() && today.getTime() <= end.getTime();
  }, [today, lastPeriodStart, periodLength]);

  const handlePrimary = async () => {
    if (isPeriodActive) {
      await endPeriodToday();
      return;
    }
    await startPeriodToday();
  };

  const goalLabel = useMemo(() => {
    if (!goal) return 'מעקב כללי';
    if (goal === 'conceive') return 'כניסה להריון';
    if (goal === 'prevent') return 'מניעה';
    return 'מעקב כללי';
  }, [goal]);

  const handleDebugPress = () => {
    const lp = lastPeriodStart ? formatDateIL(lastPeriodStart) : '-';
    const ov = latestPositiveOvulation ? formatDateIL(latestPositiveOvulation) : '-';
    Alert.alert('דיבוג (זמני)', `תחילת מחזור אחרון: ${lp}\nבדיקת ביוץ חיובית במחזור הנוכחי: ${ov}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>מעקב</Text>

      <View style={styles.cardTop}>
        <Text style={styles.bigTitle}>{cycleDayNumber ? `יום ${cycleDayNumber} במחזור` : 'מעקב מחזור'}</Text>

        {lastPeriodStart && <Text style={styles.smallLine}>תחילת מחזור אחרון: {formatDateIL(lastPeriodStart)}</Text>}
        {computedPeriodEnd && <Text style={styles.smallLine}>סיום מחזור משוער: {formatDateIL(computedPeriodEnd)}</Text>}
        {nextPeriodStart && <Text style={styles.smallLine}>מחזור צפוי הבא: {formatDateIL(nextPeriodStart)}</Text>}

        <Text style={styles.goalLine}>{goalLabel}</Text>

        <Pressable style={styles.primaryBtn} onPress={() => void handlePrimary()}>
          <Text style={styles.primaryBtnText}>{isPeriodActive ? 'סיים מחזור היום' : 'התחיל לי מחזור היום'}</Text>
        </Pressable>

        <Pressable style={styles.debugBtn} onPress={handleDebugPress}>
          <Text style={styles.debugBtnText}>דיבוג</Text>
        </Pressable>

        <Text style={styles.disclaimer}>כל החישובים הם הערכה בלבד, ואינם תחליף לייעוץ רפואי</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ציר זמן</Text>

        <View style={styles.rowBox}>
          <Text style={styles.rowLabel}>מחזור הבא</Text>
          <Text style={styles.rowValue}>{nextPeriodStart ? formatDateIL(nextPeriodStart) : '-'}</Text>
        </View>

        <View style={styles.rowBox}>
          <Text style={styles.rowLabel}>חלון פוריות</Text>
          <Text style={styles.rowValue}>
            {fertileWindow ? `${formatDateIL(fertileWindow.start)} - ${formatDateIL(fertileWindow.end)}` : '-'}
          </Text>
        </View>

        <View style={styles.rowBox}>
          <Text style={styles.rowLabel}>ביוץ</Text>
          <Text style={styles.rowValue}>{ovulationDate ? formatDateIL(ovulationDate) : '-'}</Text>
        </View>

        <Text style={styles.cardNote}>
          אם הוזנה בדיקת ביוץ חיובית במחזור הנוכחי, הביוץ והחלון מחושבים סביב היום שסומן כחיובי. אחרת החישוב לפי אורך המחזור.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>היום</Text>

        <View style={styles.badgesRow}>
          <View style={[styles.badge, inPeriodByCalc && styles.badgeOn]}>
            <Text style={[styles.badgeText, inPeriodByCalc && styles.badgeTextOn]}>מחזור</Text>
          </View>

          <View style={[styles.badge, isInFertileWindow && styles.badgeOnGreen]}>
            <Text style={[styles.badgeText, isInFertileWindow && styles.badgeTextOn]}>חלון פוריות</Text>
          </View>
        </View>

        <Text style={styles.cardNote}>טיפ: כדי לדייק, היכנסי ליום והזיני בדיקת ביוץ כחיובית כאשר זה רלוונטי.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 18 },
  content: { paddingBottom: 28 },

  screenTitle: {
    marginTop: 10,
    marginBottom: 12,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  cardTop: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#f6f2ff',
    marginBottom: 12,
  },

  bigTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 6,
  },

  smallLine: {
    fontSize: 13,
    color: '#333',
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 2,
  },

  goalLine: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '900',
    color: '#6a1b9a',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  primaryBtn: {
    marginTop: 12,
    backgroundColor: '#6a1b9a',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },

  primaryBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    writingDirection: 'rtl',
  },

  debugBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#6a1b9a',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  debugBtnText: {
    color: '#6a1b9a',
    fontWeight: '900',
    fontSize: 14,
    writingDirection: 'rtl',
  },

  disclaimer: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    writingDirection: 'rtl',
    fontWeight: '700',
  },

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

  rowBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },

  rowLabel: {
    fontWeight: '900',
    color: '#111',
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  rowValue: {
    fontWeight: '800',
    color: '#111',
    writingDirection: 'rtl',
    textAlign: 'left',
  },

  cardNote: {
    marginTop: 6,
    fontSize: 12,
    color: '#666',
    writingDirection: 'rtl',
    textAlign: 'right',
    fontWeight: '700',
  },

  badgesRow: { flexDirection: 'row-reverse', gap: 10, justifyContent: 'flex-start' },

  badge: {
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
  },

  badgeOn: {
    borderColor: '#ffd0d9',
    backgroundColor: '#ffe3e8',
  },

  badgeOnGreen: {
    borderColor: '#c8f5d6',
    backgroundColor: '#e9fff0',
  },

  badgeText: {
    fontWeight: '900',
    color: '#333',
    writingDirection: 'rtl',
  },

  badgeTextOn: {
    color: '#111',
  },
});
