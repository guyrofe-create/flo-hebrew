// app/(tabs)/calendar.tsx
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DayModal from '../../components/DayModal';
import type { DaySymptoms } from '../../context/UserDataContext';
import { useUserData } from '../../context/UserDataContext';
import { findLatestPositiveOvulationInCurrentCycle, getLatestPeriodStart } from '../../lib/cycleForecast';
import { addDays, daysBetween, formatKey, isoNoonFromKey, normalizeNoon } from '../../lib/date';

type MarkType = 'period' | 'fertile' | 'ovulation' | null;

function hasAnySymptoms(sym: DaySymptoms | undefined) {
  if (!sym) return false;
  return Boolean(
    sym.flow ||
      sym.pain ||
      sym.mood ||
      sym.discharge ||
      typeof sym.sex === 'boolean' ||
      sym.ovulationTest ||
      (typeof sym.bbt === 'number' && Number.isFinite(sym.bbt)) ||
      (sym.notes && String(sym.notes).trim().length > 0) ||
      sym.photoUri
  );
}

export default function CalendarScreen() {
  const {
    goal,
    periodHistory,
    periodStart,
    cycleLength,
    periodLength,
    isPeriodActive,
    startPeriodToday,
    endPeriodToday,
    addPeriodDate,
    removePeriodDate,
    symptomsByDay,
    setSymptomsForDay,
    clearSymptomsForDay,
    advancedTracking,
    setSelectedDayKey,
  } = useUserData();

  const today = useMemo(() => normalizeNoon(new Date()), []);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return normalizeNoon(d);
  });

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const monthTitle = useMemo(() => {
    return month.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  }, [month]);

  const lastPeriodStart = useMemo(() => {
    return getLatestPeriodStart(periodHistory, periodStart);
  }, [periodHistory, periodStart]);

  // FIX: לא להשתמש ב toISOString (UTC) כדי למנוע סטייה של יום. לייצר ISO בצהריים דרך dayKey.
  const lastPeriodStartIso = useMemo(() => {
    if (!lastPeriodStart) return null;
    return isoNoonFromKey(formatKey(lastPeriodStart));
  }, [lastPeriodStart]);

  // FIX: לכלול גם periodStart כדי שסימון "תחילת מחזור שהוזנה" יעבוד גם אם אין היסטוריה
  const periodSet = useMemo(() => {
    const items = [
      ...(Array.isArray(periodHistory) ? periodHistory : []),
      ...(periodStart ? [periodStart] : []),
    ].filter(Boolean);
    return new Set(items);
  }, [periodHistory, periodStart]);

  const daysGrid = useMemo(() => {
    const start = normalizeNoon(new Date(month));
    start.setDate(1);

    const firstWeekday = start.getDay();
    const gridStart = normalizeNoon(addDays(start, -firstWeekday));

    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) cells.push(normalizeNoon(addDays(gridStart, i)));
    return cells;
  }, [month]);

  const latestPositiveOvulation = useMemo(() => {
    return findLatestPositiveOvulationInCurrentCycle(symptomsByDay, lastPeriodStart, cycleLength);
  }, [symptomsByDay, lastPeriodStart, cycleLength]);

  const marks = useMemo(() => {
    const m = new Map<string, MarkType>();

    if (!lastPeriodStart || !cycleLength || cycleLength <= 0) return m;

    const ovuIndexBase = Math.max(0, cycleLength - 14);

    for (const d of daysGrid) {
      const delta = daysBetween(d, lastPeriodStart);
      const mod = ((delta % cycleLength) + cycleLength) % cycleLength;

      const key = formatKey(d);

      if (mod >= 0 && mod < periodLength) {
        m.set(key, 'period');
        continue;
      }

      const shouldShowFertility = goal !== 'prevent';

      if (shouldShowFertility) {
        if (mod === ovuIndexBase) {
          m.set(key, 'ovulation');
          continue;
        }

        if (mod >= Math.max(0, ovuIndexBase - 4) && mod <= Math.min(cycleLength - 1, ovuIndexBase + 1)) {
          m.set(key, 'fertile');
          continue;
        }
      }

      m.set(key, null);
    }

    if (goal !== 'prevent' && latestPositiveOvulation) {
      for (const d of daysGrid) {
        const k = formatKey(d);
        const curr = m.get(k);
        if (curr === 'fertile' || curr === 'ovulation') m.set(k, null);
      }

      const ovuDate = latestPositiveOvulation.date;

      for (const d of daysGrid) {
        const k = formatKey(d);
        const diff = daysBetween(normalizeNoon(d), ovuDate);

        if (diff === 0) m.set(k, 'ovulation');
        else if (diff >= -4 && diff <= 1) m.set(k, 'fertile');
      }
    }

    return m;
  }, [lastPeriodStart, cycleLength, periodLength, daysGrid, latestPositiveOvulation, goal]);

  const goPrevMonth = () => {
    const d = new Date(month);
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    setMonth(normalizeNoon(d));
  };

  const goNextMonth = () => {
    const d = new Date(month);
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    setMonth(normalizeNoon(d));
  };

  const openDay = (day: Date) => {
    const noon = normalizeNoon(day);
    setSelectedDay(noon);
    setSelectedDayKey(formatKey(noon));
    setModalVisible(true);
  };

  const closeDay = () => {
    setModalVisible(false);
  };

  const selectedKey = useMemo(() => (selectedDay ? formatKey(selectedDay) : null), [selectedDay]);
  const selectedIso = useMemo(() => (selectedKey ? isoNoonFromKey(selectedKey) : null), [selectedKey]);

  const selectedMark = useMemo<MarkType>(() => {
    if (!selectedKey) return null;
    return marks.get(selectedKey) ?? null;
  }, [marks, selectedKey]);

  const selectedIsToday = useMemo(() => {
    if (!selectedDay) return false;
    return formatKey(selectedDay) === formatKey(today);
  }, [selectedDay, today]);

  const selectedIsFuture = useMemo(() => {
    if (!selectedDay) return false;
    return normalizeNoon(selectedDay).getTime() > normalizeNoon(today).getTime();
  }, [selectedDay, today]);

  const selectedIsUserPeriodStart = useMemo(() => {
    if (!selectedIso) return false;
    return periodSet.has(selectedIso);
  }, [periodSet, selectedIso]);

  const selectedSymptoms = useMemo(() => {
    if (!selectedKey) return {};
    return symptomsByDay[selectedKey] || {};
  }, [symptomsByDay, selectedKey]);

  const hasPositiveInCycle = useMemo(() => {
    return !!latestPositiveOvulation;
  }, [latestPositiveOvulation]);

  const tryingToConceive = goal === 'conceive';
  const showFertilityUI = goal !== 'prevent';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable onPress={goPrevMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>{'<'}</Text>
        </Pressable>

        <Text style={styles.title}>{monthTitle}</Text>

        <Pressable onPress={goNextMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>{'>'}</Text>
        </Pressable>
      </View>

      {tryingToConceive && (
        <View style={styles.ttcBanner}>
          <Text style={styles.ttcBannerTitle}>מנסה להיכנס להריון</Text>
          <Text style={styles.ttcBannerText}>
            חלון הפוריות והביוץ מסומנים בלוח. אם תסמני בדיקת ביוץ חיובית, הסימון יתעדכן סביב היום שסומן.
          </Text>
        </View>
      )}

      <View style={styles.weekHeader}>
        {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
          <Text key={d} style={styles.weekDay}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {daysGrid.map((d, idx) => {
          const key = formatKey(d);
          const mark = marks.get(key);

          const isInMonth = d.getMonth() === month.getMonth();
          const isTodayCell = formatKey(d) === formatKey(today);

          const iso = isoNoonFromKey(key);
          const isUserPeriodStart = periodSet.has(iso);

          const sym = symptomsByDay[key] as DaySymptoms | undefined;
          const showSymIcon = hasAnySymptoms(sym);
          const showPhotoIcon = !!sym?.photoUri;

          return (
            <Pressable
              key={`${key}-${idx}`}
              onPress={() => openDay(d)}
              style={[
                styles.cell,
                !isInMonth && styles.cellOutMonth,
                isTodayCell && styles.cellToday,
                mark === 'period' && styles.cellPeriod,
                showFertilityUI && mark === 'fertile' && styles.cellFertile,
                showFertilityUI && mark === 'ovulation' && styles.cellOvulation,
                isUserPeriodStart && styles.cellUserMarked,
              ]}
            >
              <Text style={[styles.cellText, !isInMonth && styles.cellTextOutMonth]}>{d.getDate()}</Text>

              {isUserPeriodStart && <View style={styles.userDot} />}

              {showSymIcon && (
                <Text style={styles.symIcon} numberOfLines={1}>
                  ✎
                </Text>
              )}

              {showPhotoIcon && (
                <Text style={styles.photoIcon} numberOfLines={1}>
                  📷
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, styles.dotPeriod]} />
          <Text style={styles.legendText}>מחזור (חישוב)</Text>
        </View>

        {showFertilityUI && (
          <>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.dotFertile]} />
              <Text style={styles.legendText}>חלון פוריות</Text>
            </View>

            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.dotOvulation]} />
              <Text style={styles.legendText}>ביוץ</Text>
            </View>
          </>
        )}

        <View style={styles.legendRow}>
          <View style={[styles.legendDot, styles.dotUser]} />
          <Text style={styles.legendText}>תחילת מחזור שהוזנה</Text>
        </View>

        <View style={styles.legendRow}>
          <Text style={styles.legendIcon}>✎</Text>
          <Text style={styles.legendText}>הוזנו סימפטומים</Text>
        </View>

        <View style={styles.legendRow}>
          <Text style={styles.legendIcon}>📷</Text>
          <Text style={styles.legendText}>הוזנה תמונה</Text>
        </View>

        {showFertilityUI && hasPositiveInCycle && (
          <Text style={styles.legendHint}>
            זוהתה בדיקת ביוץ חיובית במחזור הנוכחי: הביוץ וחלון הפוריות מחושבים סביב היום שסומן כחיובי.
          </Text>
        )}

        {!advancedTracking && (
          <Text style={styles.legendHint}>
            מעקב מתקדם כבוי: זה משפיע רק על תצוגת שדות נוספים. החישובים עדיין מתחשבים בנתונים מתקדמים שכבר הוזנו.
          </Text>
        )}
      </View>

      <Text style={styles.note}>טיפ: לחצי על יום כדי לראות סיכום, להזין סימפטומים, להוסיף תמונה, או לסמן תחילת מחזור</Text>

      <DayModal
        visible={modalVisible}
        day={selectedDay}
        dayKey={selectedKey}
        dayIso={selectedIso}
        mark={selectedMark}
        isUserPeriodStart={selectedIsUserPeriodStart}
        isFuture={selectedIsFuture}
        isToday={selectedIsToday}
        symptoms={selectedSymptoms as any}
        goal={goal}
        advancedTracking={advancedTracking}
        onClose={closeDay}
        onAddPeriod={addPeriodDate}
        onRemovePeriod={removePeriodDate}
        onSetSymptoms={setSymptomsForDay}
        onClearSymptoms={clearSymptomsForDay}
        lastPeriodStartIso={lastPeriodStartIso}
        cycleLength={cycleLength}
        periodLength={periodLength}
        isPeriodActive={isPeriodActive}
        onStartPeriodToday={startPeriodToday}
        onEndPeriodToday={endPeriodToday}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 18 },
  content: { paddingBottom: 28 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: '900',
    writingDirection: 'rtl',
    textAlign: 'center',
  },

  navBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },

  navBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#6a1b9a',
  },

  ttcBanner: {
    borderWidth: 1,
    borderColor: '#e9ddff',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#f6f2ff',
    marginBottom: 10,
  },

  ttcBannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#6a1b9a',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 4,
  },

  ttcBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  weekHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 8,
  },

  weekDay: {
    width: '13.8%',
    textAlign: 'center',
    fontWeight: '900',
    color: '#555',
  },

  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  cell: {
    width: '13.8%',
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#fff',
    position: 'relative',
  },

  cellText: { fontWeight: '800', color: '#222' },

  cellOutMonth: { backgroundColor: '#fafafa' },
  cellTextOutMonth: { color: '#aaa' },

  cellToday: { borderColor: '#6a1b9a', borderWidth: 2 },

  cellPeriod: { backgroundColor: '#ffe3e8', borderColor: '#ffd0d9' },
  cellFertile: { backgroundColor: '#e9fff0', borderColor: '#c8f5d6' },
  cellOvulation: { backgroundColor: '#efe5ff', borderColor: '#d9c3ff' },

  cellUserMarked: { borderColor: '#111', borderWidth: 1.5 },

  userDot: {
    position: 'absolute',
    bottom: 6,
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: '#111',
  },

  symIcon: {
    position: 'absolute',
    top: 6,
    left: 6,
    fontSize: 12,
    color: '#111',
    fontWeight: '900',
  },

  photoIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    fontSize: 12,
    color: '#111',
    fontWeight: '900',
  },

  legend: {
    marginTop: 14,
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },

  legendRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  legendDot: { width: 14, height: 14, borderRadius: 99 },
  legendText: { fontWeight: '800', color: '#333', writingDirection: 'rtl' },
  legendIcon: { fontSize: 14, fontWeight: '900', color: '#111' },

  dotPeriod: { backgroundColor: '#ff6b81' },
  dotFertile: { backgroundColor: '#34c759' },
  dotOvulation: { backgroundColor: '#6a1b9a' },
  dotUser: { backgroundColor: '#111' },

  legendHint: {
    marginTop: 6,
    fontSize: 11,
    color: '#555',
    writingDirection: 'rtl',
    textAlign: 'right',
    fontWeight: '700',
  },

  note: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    writingDirection: 'rtl',
    fontWeight: '700',
  },
});
