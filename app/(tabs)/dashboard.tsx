import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '../../context/UserDataContext';

function formatDate(date: Date) {
  return date.toLocaleDateString('he-IL');
}

function normalizeNoon(d: Date) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return normalizeNoon(d);
}

function daysBetween(a: Date, b: Date) {
  const start = normalizeNoon(a);
  const end = normalizeNoon(b);
  return Math.round((+end - +start) / 86400000);
}

export default function DashboardScreen() {
  const router = useRouter();

  const {
    goal,
    birthday,
    periodStart,
    periodHistory,
    cycleLength,
    periodLength,
    isPeriodActive,
    startPeriodToday,
    endPeriodToday,
    resetUserData,
  } = useUserData();

  const today = useMemo(() => normalizeNoon(new Date()), []);

  // newest period start (periodHistory sorted newest->oldest)
  const lastPeriodStart = useMemo(() => {
    if (!periodStart && periodHistory.length === 0) return null;

    const newest = periodHistory.length > 0 ? periodHistory[0] : periodStart!;
    return normalizeNoon(new Date(newest));
  }, [periodStart, periodHistory]);

  const cycleDay = useMemo(() => {
    if (!lastPeriodStart) return null;
    return daysBetween(lastPeriodStart, today) + 1;
  }, [lastPeriodStart, today]);

  const periodEndDate = useMemo(() => {
    if (!lastPeriodStart) return null;
    return addDays(lastPeriodStart, periodLength - 1);
  }, [lastPeriodStart, periodLength]);

  const nextPeriodDate = useMemo(() => {
    if (!lastPeriodStart) return null;
    return addDays(lastPeriodStart, cycleLength);
  }, [lastPeriodStart, cycleLength]);

  const ovulationDate = useMemo(() => {
    if (!lastPeriodStart) return null;
    return addDays(lastPeriodStart, cycleLength - 14);
  }, [lastPeriodStart, cycleLength]);

  const fertilityWindow = useMemo(() => {
    if (!ovulationDate) return null;
    return {
      start: addDays(ovulationDate, -4),
      end: addDays(ovulationDate, +1),
    };
  }, [ovulationDate]);

  // status labels
  const headerText = useMemo(() => {
    if (!cycleDay) return 'בואי נתחיל לעקוב';
    return isPeriodActive ? `יום ${cycleDay} למחזור` : `יום ${cycleDay} במחזור`;
  }, [cycleDay, isPeriodActive]);

  const daysToNextPeriod = useMemo(() => {
    if (!nextPeriodDate) return null;
    return daysBetween(today, nextPeriodDate);
  }, [today, nextPeriodDate]);

  const fertilityNow = useMemo(() => {
    if (!fertilityWindow) return false;
    return today >= fertilityWindow.start && today <= fertilityWindow.end;
  }, [fertilityWindow, today]);

  const ovulationToday = useMemo(() => {
    if (!ovulationDate) return false;
    return formatDate(ovulationDate) === formatDate(today);
  }, [ovulationDate, today]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.appTitle}>Flo Hebrew</Text>

      {/* TODAY CARD */}
      <View style={styles.card}>
        <Text style={styles.bigTitle}>{headerText}</Text>

        {!lastPeriodStart ? (
          <Text style={styles.subText}>עוד לא הוזן מחזור. התחילי עכשיו.</Text>
        ) : (
          <>
            <Text style={styles.subText}>
              תחילת מחזור אחרון: {formatDate(lastPeriodStart)}
            </Text>

            {periodEndDate && (
              <Text style={styles.subText}>
                סיום מחזור משוער: {formatDate(periodEndDate)}
              </Text>
            )}

            {nextPeriodDate && (
              <Text style={styles.subText}>
                מחזור צפוי הבא: {formatDate(nextPeriodDate)}
                {daysToNextPeriod !== null ? ` (בעוד ${daysToNextPeriod} ימים)` : ''}
              </Text>
            )}

            {(fertilityNow || ovulationToday) && (
              <Text style={styles.highlight}>
                {ovulationToday ? 'ביוץ משוער היום' : 'את בחלון הפוריות'}
              </Text>
            )}
          </>
        )}

        {/* MAIN FLO ACTION */}
        <Pressable
          style={[
            styles.mainButton,
            isPeriodActive ? styles.mainButtonEnd : styles.mainButtonStart,
          ]}
          onPress={async () => {
            if (isPeriodActive) {
              await endPeriodToday();
            } else {
              await startPeriodToday();
            }
          }}
        >
          <Text style={styles.mainButtonText}>
            {isPeriodActive ? 'המחזור נגמר היום' : 'התחיל לי מחזור היום'}
          </Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          * כל החישובים הם הערכה בלבד, ואינם תחליף לייעוץ רפואי
        </Text>
      </View>

      {/* TIMELINE MINI */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ציר זמן</Text>

        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>מחזור הבא</Text>
            <Text style={styles.timelineValue}>
              {nextPeriodDate ? formatDate(nextPeriodDate) : '-'}
            </Text>
          </View>

          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>חלון פוריות</Text>
            <Text style={styles.timelineValue}>
              {fertilityWindow
                ? `${formatDate(fertilityWindow.start)} - ${formatDate(fertilityWindow.end)}`
                : '-'}
            </Text>
          </View>

          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>ביוץ</Text>
            <Text style={styles.timelineValue}>
              {ovulationDate ? formatDate(ovulationDate) : '-'}
            </Text>
          </View>
        </View>
      </View>

      {/* DETAILS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>פרטים</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>אורך מחזור ממוצע</Text>
          <Text style={styles.rowValue}>{cycleLength} ימים</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>מטרה</Text>
          <Text style={styles.rowValue}>{goal || '-'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>תאריך לידה</Text>
          <Text style={styles.rowValue}>
            {birthday ? new Date(birthday).toLocaleDateString('he-IL') : '-'}
          </Text>
        </View>
      </View>

      {/* NAV */}
      <View style={styles.bottomActions}>
        <Pressable style={styles.linkBtn} onPress={() => router.push('/history')}>
          <Text style={styles.linkBtnText}>היסטוריה</Text>
        </Pressable>

        <Pressable
          style={[styles.linkBtn, styles.dangerBtn]}
          onPress={async () => {
            await resetUserData();
            router.replace('/');
          }}
        >
          <Text style={[styles.linkBtnText, styles.dangerText]}>התחלה מחדש</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {},

  content: { paddingBottom: 28 },

  appTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 12,
  },

  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#faf7ff',
  },

  bigTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 8,
  },

  subText: {
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 4,
    color: '#444',
  },

  highlight: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'rtl',
    color: '#6a1b9a',
    fontWeight: '900',
  },

  mainButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
  },

  mainButtonStart: { backgroundColor: '#6a1b9a' },
  mainButtonEnd: { backgroundColor: '#e53935' },

  mainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    writingDirection: 'rtl',
  },

  disclaimer: {
    marginTop: 12,
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
    color: '#666',
  },

  section: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    writingDirection: 'rtl',
    marginBottom: 10,
  },

  timeline: {
    gap: 10,
  },

  timelineItem: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },

  timelineLabel: {
    fontSize: 13,
    fontWeight: '900',
    writingDirection: 'rtl',
    color: '#444',
    textAlign: 'right',
  },

  timelineValue: {
    marginTop: 2,
    fontSize: 14,
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },

  rowLabel: { fontSize: 14, fontWeight: '700', writingDirection: 'rtl' },
  rowValue: { fontSize: 14, writingDirection: 'rtl', color: '#333' },

  bottomActions: { marginTop: 'auto', gap: 10, paddingBottom: 10 },
  linkBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  linkBtnText: { fontSize: 16, fontWeight: '800', color: '#6a1b9a' },

  dangerBtn: { borderColor: '#f1b9b9' },
  dangerText: { color: '#e53935' },
});
