import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DayModal from '../../components/DayModal';
import { useUserData } from '../../context/UserDataContext';

function normalizeNoon(d: Date) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

function formatKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return normalizeNoon(d);
}

function isoNoonFromKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setHours(12, 0, 0, 0);
  return dt.toISOString();
}

type MarkType = 'period' | 'fertile' | 'ovulation' | null;

function dayDiff(a: Date, b: Date) {
  const aa = normalizeNoon(a).getTime();
  const bb = normalizeNoon(b).getTime();
  return Math.round((aa - bb) / 86400000);
}

function hasAnySymptoms(sym: any) {
  if (!sym || typeof sym !== 'object') return false;
  const keys = Object.keys(sym);
  if (keys.length === 0) return false;

  if (sym.flow && sym.flow !== 'none') return true;
  if (sym.pain && sym.pain !== 'none') return true;
  if (sym.mood && sym.mood !== 'ok') return true;
  if (sym.discharge && sym.discharge !== 'dry') return true;
  if (sym.sex === true || sym.sex === false) return true;
  if (sym.ovulationTest === 'positive' || sym.ovulationTest === 'negative') return true;
  if (typeof sym.notes === 'string' && sym.notes.trim().length > 0) return true;
  if (sym.photoUri) return true;

  return false;
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
    if (periodHistory.length > 0) return normalizeNoon(new Date(periodHistory[0]));
    if (periodStart) return normalizeNoon(new Date(periodStart));
    return null;
  }, [periodHistory, periodStart]);

  const lastPeriodStartIso = useMemo(() => {
    return lastPeriodStart ? lastPeriodStart.toISOString() : null;
  }, [lastPeriodStart]);

  const periodSet = useMemo(() => {
    return new Set(periodHistory);
  }, [periodHistory]);

  const daysGrid = useMemo(() => {
    const start = new Date(month);
    start.setDate(1);

    const firstWeekday = start.getDay(); // 0 Sun
    const gridStart = addDays(start, -firstWeekday);

    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) cells.push(addDays(gridStart, i));
    return cells;
  }, [month]);

  const marks = useMemo(() => {
    const m = new Map<string, MarkType>();
    if (!lastPeriodStart || !cycleLength || cycleLength <= 0) return m;

    for (const d of daysGrid) {
      const delta = dayDiff(d, lastPeriodStart);
      const mod = ((delta % cycleLength) + cycleLength) % cycleLength;

      const key = formatKey(d);

      if (mod >= 0 && mod < periodLength) {
        m.set(key, 'period');
        continue;
      }

      const ovuIndex = Math.max(0, cycleLength - 14);
      if (mod === ovuIndex) {
        m.set(key, 'ovulation');
        continue;
      }

      if (
        mod >= Math.max(0, ovuIndex - 4) &&
        mod <= Math.min(cycleLength - 1, ovuIndex + 1)
      ) {
        m.set(key, 'fertile');
        continue;
      }

      m.set(key, null);
    }

    return m;
  }, [lastPeriodStart, cycleLength, periodLength, daysGrid]);

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
    setSelectedDay(normalizeNoon(day));
    setModalVisible(true);
  };

  const closeDay = () => {
    setModalVisible(false);
  };

  const selectedKey = useMemo(
    () => (selectedDay ? formatKey(selectedDay) : null),
    [selectedDay]
  );

  const selectedIso = useMemo(
    () => (selectedKey ? isoNoonFromKey(selectedKey) : null),
    [selectedKey]
  );

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goPrevMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>{'<'}</Text>
        </Pressable>

        <Text style={styles.title}>{monthTitle}</Text>

        <Pressable onPress={goNextMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>{'>'}</Text>
        </Pressable>
      </View>

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

          const sym = symptomsByDay[key];
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
                mark === 'fertile' && styles.cellFertile,
                mark === 'ovulation' && styles.cellOvulation,
                isUserPeriodStart && styles.cellUserMarked,
              ]}
            >
              <Text style={[styles.cellText, !isInMonth && styles.cellTextOutMonth]}>
                {d.getDate()}
              </Text>

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
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, styles.dotFertile]} />
          <Text style={styles.legendText}>חלון פוריות (חישוב)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, styles.dotOvulation]} />
          <Text style={styles.legendText}>ביוץ משוער (חישוב)</Text>
        </View>
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
      </View>

      <Text style={styles.note}>
        טיפ: לחצי על יום כדי לראות סיכום, להזין סימפטומים, להוסיף תמונה, או לסמן תחילת מחזור
      </Text>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
  },

  navBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#6a1b9a',
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
  },

  legendRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  legendDot: { width: 14, height: 14, borderRadius: 99 },
  legendText: { fontWeight: '800', color: '#333', writingDirection: 'rtl' },
  legendIcon: { fontSize: 14, fontWeight: '900', color: '#111' },

  dotPeriod: { backgroundColor: '#ff6b81' },
  dotFertile: { backgroundColor: '#34c759' },
  dotOvulation: { backgroundColor: '#6a1b9a' },
  dotUser: { backgroundColor: '#111' },

  note: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
