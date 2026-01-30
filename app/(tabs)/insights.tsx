// app/(tabs)/insights.tsx
import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { useUserData } from '../../context/UserDataContext';
import { computeClinicalInsights, type ClinicalFlag } from '../../lib/clinicalInsights';
import { computeCycleInsights } from '../../lib/cycleInsights';
import { getEducationUrl, type EducationTopic } from '../../lib/educationLinks';

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function computeAgeYears(birthdayIso: string | null): number | undefined {
  if (!birthdayIso) return undefined;
  const d = new Date(birthdayIso);
  if (Number.isNaN(d.getTime())) return undefined;

  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  if (!Number.isFinite(age) || age < 0 || age > 120) return undefined;
  return age;
}

function confidenceLabel(c: string) {
  switch (c) {
    case 'high':
      return 'גבוהה';
    case 'medium':
      return 'בינונית';
    case 'low':
      return 'נמוכה';
    case 'very_low':
      return 'נמוכה מאוד';
    case 'none':
    default:
      return 'אין';
  }
}

async function openExternal(url: string) {
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) return;
    await Linking.openURL(url);
  } catch {
    // ignore
  }
}

function LinkButton({ label, topic }: { label: string; topic: EducationTopic }) {
  return (
    <Pressable
      onPress={() => openExternal(getEducationUrl(topic))}
      style={({ pressed }) => [styles.linkBtn, pressed ? styles.linkBtnPressed : null]}
      accessibilityRole="button"
    >
      <Text style={styles.linkBtnText}>{label}</Text>
    </Pressable>
  );
}

function clinicalTopicForFlag(f: ClinicalFlag): EducationTopic {
  switch (f.type) {
    case 'short_cycles':
    case 'long_cycles':
      return 'cycle_irregular';
    case 'prolonged_bleeding':
    case 'bleeding_longer_than_config':
      return 'prolonged_bleeding';
    case 'intermenstrual_bleeding':
      return 'heavy_bleeding';
    case 'no_period':
      return 'late_period';
    default:
      return 'cycle_irregular';
  }
}

function modeTopicFromPhysioMode(physioMode: string): EducationTopic | null {
  if (physioMode === 'postpartum') return 'postpartum';
  if (physioMode === 'breastfeeding') return 'breastfeeding';
  if (physioMode === 'stoppingPills') return 'post_ocp';
  if (physioMode === 'perimenopause') return 'cycle_irregular';
  return null;
}

function Chart({ values, avg }: { values: number[]; avg: number | null }) {
  const W = 320;
  const H = 180;
  const padL = 34;
  const padR = 10;
  const padT = 16;
  const padB = 26;

  const n = values.length;

  const minY = values.length ? Math.min(20, ...values) - 2 : 18;
  const maxY = values.length ? Math.max(40, ...values) + 2 : 42;

  const xAt = (i: number) => {
    if (n <= 1) return padL;
    const t = i / (n - 1);
    return padL + t * (W - padL - padR);
  };

  const yAt = (v: number) => {
    const t = (v - minY) / (maxY - minY || 1);
    return padT + (1 - t) * (H - padT - padB);
  };

  const poly = values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');

  const y24 = yAt(24);
  const y38 = yAt(38);
  const yAvg = avg !== null ? yAt(avg) : null;

  return (
    <View style={styles.chartWrap}>
      <Text style={styles.cardTitle}>גרף אורכי מחזור</Text>

      <Svg width={W} height={H}>
        <Rect x={padL} y={Math.min(y24, y38)} width={W - padL - padR} height={Math.abs(y24 - y38)} opacity={0.08} />

        <Line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#999" strokeWidth={1} />
        <Line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#999" strokeWidth={1} />

        <Line x1={padL} y1={y24} x2={W - padR} y2={y24} stroke="#bbb" strokeWidth={1} strokeDasharray="4 4" />
        <Line x1={padL} y1={y38} x2={W - padR} y2={y38} stroke="#bbb" strokeWidth={1} strokeDasharray="4 4" />

        <SvgText x={4} y={clamp(y24 + 4, 12, H - 8)} fontSize="10" fill="#666">
          24
        </SvgText>
        <SvgText x={4} y={clamp(y38 + 4, 12, H - 8)} fontSize="10" fill="#666">
          38
        </SvgText>

        {yAvg !== null && (
          <>
            <Line x1={padL} y1={yAvg} x2={W - padR} y2={yAvg} stroke="#6a1b9a" strokeWidth={1} opacity={0.6} />
            <SvgText x={W - 44} y={clamp(yAvg - 4, 12, H - 8)} fontSize="10" fill="#6a1b9a">
              ממוצע
            </SvgText>
          </>
        )}

        {n >= 2 ? (
          <Polyline points={poly} fill="none" stroke="#6a1b9a" strokeWidth={2} />
        ) : (
          <SvgText x={padL} y={H / 2} fontSize="12" fill="#666">
            צריך לפחות 2 מחזורים מלאים לגרף
          </SvgText>
        )}
      </Svg>

      <Text style={styles.smallNote}>תחום מקובל למחזור סדיר: 24 עד 38 ימים.</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const { periodHistory, periodStart, periodLength, birthday, physioMode, symptomsByDay } = useUserData();

  const ageYears = useMemo(() => computeAgeYears(birthday), [birthday]);

  const cycleDatesOldestToNewest = useMemo(() => {
    const items = [
      ...(Array.isArray(periodHistory) ? periodHistory : []),
      ...(periodStart ? [periodStart] : []),
    ].filter(Boolean);

    const uniq = Array.from(new Set(items));
    return uniq.sort();
  }, [periodHistory, periodStart]);

  const cycleMode = useMemo(() => {
    if (physioMode === 'postpartum') return 'postpartum';
    if (physioMode === 'breastfeeding') return 'breastfeeding';
    if (physioMode === 'perimenopause') return 'perimenopause';
    if (physioMode === 'stoppingPills') return 'stoppingPills';
    return 'regular';
  }, [physioMode]);

  const insights = useMemo(
    () => computeCycleInsights(cycleDatesOldestToNewest, ageYears, cycleMode),
    [cycleDatesOldestToNewest, ageYears, cycleMode]
  );

  const values = insights.points.map(p => p.lengthDays);

  const clinicalFlags: ClinicalFlag[] = useMemo(() => {
    return computeClinicalInsights({
      today: new Date(),
      periodHistory: Array.isArray(periodHistory) ? periodHistory : [],
      periodStart: periodStart ?? null,
      periodLength,
      symptomsByDay,
      physioMode,
    });
  }, [periodHistory, periodStart, periodLength, symptomsByDay, physioMode]);

  const hasClinical = clinicalFlags.length > 0;

  const dataLevelText = useMemo(() => {
    if (insights.predictionConfidence === 'none') return 'אין עדיין מספיק נתונים לתובנות';
    if (insights.predictionConfidence === 'very_low') return 'הדיוק צפוי להיות נמוך מאוד כרגע';
    if (insights.predictionConfidence === 'low') return 'הדיוק צפוי להיות נמוך כרגע';
    if (insights.predictionConfidence === 'medium') return 'יש נתונים להערכה ראשונית של דפוס המחזור';
    return 'יש מספיק נתונים להערכה אמינה של דפוס המחזור';
  }, [insights.predictionConfidence]);

  const regularityText = useMemo(() => {
    if (insights.suppressIrregularFlag) return null;
    if (insights.n < 3) return null;
    return insights.isIrregular ? 'המחזורים עשויים להיות לא סדירים' : 'המחזורים נראים סדירים';
  }, [insights.n, insights.isIrregular, insights.suppressIrregularFlag]);

  const confidenceText = useMemo(() => {
    return `רמת ביטחון בתחזיות: ${confidenceLabel(insights.predictionConfidence)}`;
  }, [insights.predictionConfidence]);

  const modeTopic = useMemo(() => modeTopicFromPhysioMode(physioMode), [physioMode]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>תובנות מחזור</Text>
      <Text style={styles.subtitle}>אפשר לשנות בהגדרות בכל שלב</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>רמת נתונים</Text>
        <Text style={styles.statusText}>{dataLevelText}</Text>

        <Text style={styles.statusText}>{confidenceText}</Text>

        {insights.modeNote && <Text style={styles.modeNote}>{insights.modeNote}</Text>}

        {modeTopic && <LinkButton label="קראי עוד על המצב הזה" topic={modeTopic} />}

        {regularityText && (
          <Text style={[styles.statusText, insights.isIrregular ? styles.bad : styles.good]}>{regularityText}</Text>
        )}

        {!insights.suppressIrregularFlag && insights.n >= 3 && (
          <LinkButton label="קראי עוד על מחזורים לא סדירים" topic="cycle_irregular" />
        )}
      </View>

      {hasClinical && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>תובנות רפואיות בסיסיות</Text>

          {clinicalFlags.slice(0, 6).map((f, idx) => (
            <View key={`${f.type}-${idx}`} style={styles.flagRow}>
              <Text style={styles.flagTitle}>{f.title}</Text>
              <Text style={styles.line}>{f.message}</Text>
              <LinkButton label="קראי עוד" topic={clinicalTopicForFlag(f)} />
            </View>
          ))}

          <Text style={styles.smallNote}>אם נראה שיש דפוס שחוזר, מומלץ לשקול מעקב רפואי לפי הצורך.</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>סיכום מספרי</Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>מספר מחזורים</Text>
            <Text style={styles.kpiValue}>{insights.n}</Text>
          </View>

          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>ממוצע</Text>
            <Text style={styles.kpiValue}>{insights.avg !== null ? `${round1(insights.avg)}` : '-'}</Text>
          </View>

          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>סטיית תקן</Text>
            <Text style={styles.kpiValue}>{insights.stdDev !== null ? `${round1(insights.stdDev)}` : '-'}</Text>
          </View>
        </View>

        <LinkButton label="מה נחשב מחזור תקין" topic="cycle_regular" />
      </View>

      <View style={styles.card}>
        <Chart values={values} avg={insights.avg} />
      </View>

      <Text style={styles.disclaimer}>ההערכות הן מידע כללי ואינן תחליף לייעוץ רפואי</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 18 },
  content: { paddingTop: 16, paddingBottom: 28 },

  title: { fontSize: 22, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl' },
  subtitle: { marginTop: 6, fontSize: 13, color: '#666', fontWeight: '700', textAlign: 'center', writingDirection: 'rtl' },

  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 18, padding: 14, marginTop: 12, backgroundColor: '#fff' },
  cardTitle: { fontWeight: '900', fontSize: 16, marginBottom: 10, writingDirection: 'rtl', textAlign: 'right', color: '#111' },

  statusText: { fontSize: 14, fontWeight: '800', writingDirection: 'rtl', textAlign: 'right', marginBottom: 6 },

  modeNote: {
    marginTop: 2,
    fontSize: 12,
    color: '#555',
    writingDirection: 'rtl',
    textAlign: 'right',
    fontWeight: '700',
    lineHeight: 18,
  },

  kpiRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 10 },
  kpiBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fafafa',
  },
  kpiLabel: { fontSize: 12, color: '#666', fontWeight: '800', writingDirection: 'rtl', textAlign: 'right' },
  kpiValue: { marginTop: 4, fontSize: 14, fontWeight: '900', color: '#111', writingDirection: 'rtl', textAlign: 'right' },

  good: { color: '#137333' },
  bad: { color: '#b00020' },

  chartWrap: {},
  smallNote: { marginTop: 8, fontSize: 12, color: '#666', fontWeight: '700', writingDirection: 'rtl', textAlign: 'right', lineHeight: 16 },

  flagRow: { marginBottom: 10 },
  flagTitle: { fontSize: 14, fontWeight: '900', color: '#111', writingDirection: 'rtl', textAlign: 'right', marginBottom: 4 },
  line: { fontSize: 13, fontWeight: '800', color: '#333', writingDirection: 'rtl', textAlign: 'right', marginBottom: 6 },

  disclaimer: { marginTop: 14, fontSize: 12, color: '#666', textAlign: 'center', writingDirection: 'rtl', fontWeight: '700' },

  linkBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  linkBtnPressed: { opacity: 0.75 },
  linkBtnText: { fontSize: 12, fontWeight: '900', color: '#6a1b9a', writingDirection: 'rtl', textAlign: 'right' },
});
