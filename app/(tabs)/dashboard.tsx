// app/(tabs)/dashboard.tsx
import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '../../context/UserDataContext';
import { computeCycleForecast } from '../../lib/cycleForecast';
import { daysBetween as daysBetweenNoon, normalizeNoon } from '../../lib/date';

type NormalizedPhysioMode = 'regular' | 'postpartum' | 'breastfeeding' | 'perimenopause' | 'postOCP';

function normalizePhysioMode(mode: any): NormalizedPhysioMode {
  if (mode === 'regular') return 'regular';
  if (mode === 'none') return 'regular';

  if (mode === 'postOCP') return 'postOCP';
  if (mode === 'stoppingPills') return 'postOCP';

  if (mode === 'postpartum') return 'postpartum';
  if (mode === 'breastfeeding') return 'breastfeeding';
  if (mode === 'perimenopause') return 'perimenopause';

  return 'regular';
}

function formatDateIL(d: Date) {
  return d.toLocaleDateString('he-IL');
}

function modeBannerText(mode: NormalizedPhysioMode) {
  if (mode === 'postpartum') return 'מצב אחרי לידה פעיל: התחזיות עשויות להיות פחות מדויקות בתקופה זו.';
  if (mode === 'breastfeeding') return 'מצב הנקה פעיל: ביוץ ומחזורים יכולים להיות לא צפויים, ולכן התחזיות פחות מדויקות.';
  if (mode === 'perimenopause') return 'מצב לקראת גיל המעבר פעיל: שכיחים שינויים במחזור ולכן התחזיות פחות מדויקות.';
  if (mode === 'postOCP') return 'מצב הפסקת גלולות פעיל: לעיתים יש תקופת הסתגלות ולכן התחזיות פחות מדויקות.';
  return null;
}

export default function DashboardScreen() {
  const {
    goal,
    physioMode,
    periodHistory,
    periodStart,
    cycleLength,
    periodLength,
    isPeriodActive,
    startPeriodToday,
    endPeriodToday,
    symptomsByDay,
  } = useUserData();

  const physioModeNorm = useMemo(() => normalizePhysioMode(physioMode), [physioMode]);
  const isSpecialMode = physioModeNorm !== 'regular';

  const forecast = useMemo(() => {
    return computeCycleForecast({
      periodHistory,
      periodStart,
      cycleLength,
      periodLength,
      symptomsByDay,
    });
  }, [periodHistory, periodStart, cycleLength, periodLength, symptomsByDay]);

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
    const lp = forecast.lastPeriodStart ? formatDateIL(forecast.lastPeriodStart) : '-';
    const ov = forecast.latestPositiveOvulation ? formatDateIL(forecast.latestPositiveOvulation.date) : '-';
    const next = forecast.nextPeriodStart ? formatDateIL(forecast.nextPeriodStart) : '-';
    Alert.alert('דיבוג (זמני)', `תחילת מחזור אחרון: ${lp}\nבדיקת ביוץ חיובית במחזור הנוכחי: ${ov}\nמחזור צפוי הבא: ${next}`);
  };

  const tryingToConceive = goal === 'conceive';
  const preventing = goal === 'prevent';

  const modeNote = useMemo(() => modeBannerText(physioModeNorm), [physioModeNorm]);

  const lateInfo = useMemo(() => {
    const expected = forecast.nextPeriodStart;
    if (!expected) return { isLate: false, daysLate: 0 };

    const daysLateRaw = daysBetweenNoon(normalizeNoon(expected), normalizeNoon(forecast.today));
    const daysLate = Math.max(0, daysLateRaw);

    const isLate = daysLate >= 2;
    return { isLate, daysLate };
  }, [forecast.today, forecast.nextPeriodStart]);

  const lateMessage = useMemo(() => {
    if (!lateInfo.isLate) return null;

    const expected = forecast.nextPeriodStart ? formatDateIL(forecast.nextPeriodStart) : null;
    const daysText = lateInfo.daysLate > 0 ? ` (עיכוב של כ-${lateInfo.daysLate} ימים)` : '';
    const baseLine = expected ? `המחזור היה צפוי ב-${expected}${daysText}.` : `המחזור מתעכב${daysText}.`;

    if (tryingToConceive) {
      return (
        `${baseLine}\n` +
        `אפשר לבצע בדיקת הריון, ואם היא שלילית - לחזור על הבדיקה בעוד 48 שעות.\n` +
        `אם הבדיקות שליליות והמחזור עדיין לא מופיע, מומלץ לפנות לבדיקה.`
      );
    }

    if (preventing) {
      return (
        `${baseLine}\n` +
        `מומלץ לשלול הריון באמצעות בדיקת הריון.\n` +
        `אם הבדיקה שלילית, מומלץ לחזור על הבדיקה בעוד 48 שעות.\n` +
        `אם האיחור נמשך למרות בדיקות שליליות, מומלץ לפנות לבדיקה.`
      );
    }

    return `${baseLine}\nמומלץ לשלול הריון באמצעות בדיקת הריון.\nאם האיחור מתמשך, מומלץ לפנות לבדיקה.`;
  }, [lateInfo.isLate, lateInfo.daysLate, forecast.nextPeriodStart, tryingToConceive, preventing]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>מעקב</Text>

      <View style={styles.cardTop}>
        <Text style={styles.bigTitle}>{forecast.cycleDayNumber ? `יום ${forecast.cycleDayNumber} במחזור` : 'מעקב מחזור'}</Text>

        {modeNote && (
          <View style={styles.modeBox}>
            <Text style={styles.modeTitle}>מצב מיוחד פעיל</Text>
            <Text style={styles.modeText}>{modeNote}</Text>
          </View>
        )}

        {forecast.lastPeriodStart && <Text style={styles.smallLine}>תחילת מחזור אחרון: {formatDateIL(forecast.lastPeriodStart)}</Text>}
        {forecast.computedPeriodEnd && <Text style={styles.smallLine}>סיום מחזור משוער: {formatDateIL(forecast.computedPeriodEnd)}</Text>}
        {forecast.nextPeriodStart && <Text style={styles.smallLine}>מחזור צפוי הבא: {formatDateIL(forecast.nextPeriodStart)}</Text>}

        <Text style={styles.goalLine}>{goalLabel}</Text>

        {lateInfo.isLate && lateMessage && !isSpecialMode && (
          <View style={styles.lateBox}>
            <Text style={styles.lateTitle}>המחזור מתעכב</Text>
            <Text style={styles.lateText}>{lateMessage}</Text>
          </View>
        )}

        {tryingToConceive && (
          <View style={styles.ttcBox}>
            <Text style={styles.ttcTitle}>מנסה להיכנס להריון</Text>

            <View style={styles.ttcRow}>
              <Text style={styles.ttcLabel}>חלון פוריות</Text>
              <Text style={styles.ttcValue}>
                {forecast.fertileWindow
                  ? `${formatDateIL(forecast.fertileWindow.start)} - ${formatDateIL(forecast.fertileWindow.end)}`
                  : '-'}
              </Text>
            </View>

            <View style={styles.ttcRow}>
              <Text style={styles.ttcLabel}>ביוץ</Text>
              <Text style={styles.ttcValue}>{forecast.ovulationDate ? formatDateIL(forecast.ovulationDate) : '-'}</Text>
            </View>

            {forecast.latestPositiveOvulation?.date ? (
              <Text style={styles.ttcNote}>זוהתה בדיקת ביוץ חיובית. לרוב הביוץ מתרחש 12 עד 24 שעות לאחר בדיקה חיובית.</Text>
            ) : (
              <Text style={styles.ttcNote}>
                {!isSpecialMode
                  ? 'לא זוהתה בדיקת ביוץ חיובית במחזור הנוכחי. החישוב מבוסס על אורך המחזור שהוגדר.'
                  : 'במצב מיוחד החישובים פחות מדויקים. כדי לדייק, מומלץ להזין בדיקות ביוץ או נתונים נוספים במעקב מתקדם.'}
              </Text>
            )}
          </View>
        )}

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
          <Text style={styles.rowValue}>{forecast.nextPeriodStart ? formatDateIL(forecast.nextPeriodStart) : '-'}</Text>
        </View>

        <View style={styles.rowBox}>
          <Text style={styles.rowLabel}>חלון פוריות</Text>
          <Text style={styles.rowValue}>
            {forecast.fertileWindow ? `${formatDateIL(forecast.fertileWindow.start)} - ${formatDateIL(forecast.fertileWindow.end)}` : '-'}
          </Text>
        </View>

        <View style={styles.rowBox}>
          <Text style={styles.rowLabel}>ביוץ</Text>
          <Text style={styles.rowValue}>{forecast.ovulationDate ? formatDateIL(forecast.ovulationDate) : '-'}</Text>
        </View>

        <Text style={styles.cardNote}>
          אם הוזנה בדיקת ביוץ חיובית במחזור הנוכחי, הביוץ וחלון הפוריות מחושבים סביב היום שסומן כחיובי. אחרת החישוב לפי אורך המחזור.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>היום</Text>

        <View style={styles.badgesRow}>
          <View style={[styles.badge, forecast.inPeriodByCalc && styles.badgeOn]}>
            <Text style={[styles.badgeText, forecast.inPeriodByCalc && styles.badgeTextOn]}>מחזור</Text>
          </View>

          <View style={[styles.badge, forecast.isInFertileWindow && styles.badgeOnGreen]}>
            <Text style={[styles.badgeText, forecast.isInFertileWindow && styles.badgeTextOn]}>חלון פוריות</Text>
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

  modeBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ddff',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
  },

  modeTitle: {
    fontWeight: '900',
    fontSize: 13,
    marginBottom: 6,
    writingDirection: 'rtl',
    textAlign: 'right',
    color: '#6a1b9a',
  },

  modeText: {
    fontSize: 12,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
    color: '#444',
    lineHeight: 18,
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

  lateBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ffe0b2',
    backgroundColor: '#fff8e1',
    borderRadius: 16,
    padding: 12,
  },

  lateTitle: {
    fontWeight: '900',
    fontSize: 14,
    marginBottom: 6,
    writingDirection: 'rtl',
    textAlign: 'right',
    color: '#e65100',
  },

  lateText: {
    fontSize: 12,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
    color: '#5d4037',
    lineHeight: 18,
  },

  ttcBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e9ddff',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#fff',
  },

  ttcTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#6a1b9a',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 8,
  },

  ttcRow: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },

  ttcLabel: {
    fontWeight: '900',
    color: '#111',
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  ttcValue: {
    fontWeight: '800',
    color: '#111',
    writingDirection: 'rtl',
    textAlign: 'left',
  },

  ttcNote: {
    marginTop: 4,
    fontSize: 12,
    color: '#555',
    writingDirection: 'rtl',
    textAlign: 'right',
    fontWeight: '700',
    lineHeight: 18,
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
    lineHeight: 18,
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
