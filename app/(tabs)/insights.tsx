// app/(tabs)/insights.tsx
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useUserData } from '../../context/UserDataContext';
import { computeCycleInsights } from '../../lib/cycleInsights';

function formatDateIL(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL');
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function Chart({ values, avg }: { values: number[]; avg: number | null }) {
  const W = 320;
  const H = 180;
  const padL = 34;
  const padR = 10;
  const padT = 16;
  const padB = 26;

  const n = values.length;
  const minY = Math.min(20, ...values) - 2;
  const maxY = Math.max(40, ...values) + 2;

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
        <Rect
          x={padL}
          y={Math.min(y24, y38)}
          width={W - padL - padR}
          height={Math.abs(y24 - y38)}
          opacity={0.08}
        />

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
  const { periodHistory } = useUserData();
  const insights = useMemo(() => computeCycleInsights(periodHistory), [periodHistory]);
  const values = insights.points.map(p => p.lengthDays);

  const dataLevelText = useMemo(() => {
    if (insights.n < 3) return 'אין עדיין מספיק מחזורים להערכת דפוס מחזורי';
    if (insights.n < 6) return 'יש נתונים להערכה ראשונית של דפוס המחזור';
    return 'יש מספיק נתונים להערכה אמינה של דפוס המחזור';
  }, [insights.n]);

  const regularityText = useMemo(() => {
    if (insights.n < 3) return null;
    return insights.isIrregular ? 'המחזורים עשויים להיות לא סדירים' : 'המחזורים נראים סדירים';
  }, [insights.n, insights.isIrregular]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>תובנות מחזור</Text>
      <Text style={styles.subtitle}>אפשר לשנות מטרה בהגדרות בכל שלב</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>רמת נתונים</Text>
        <Text style={styles.statusText}>{dataLevelText}</Text>

        {regularityText && (
          <Text style={[styles.statusText, insights.isIrregular ? styles.bad : styles.good]}>{regularityText}</Text>
        )}
      </View>

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
      </View>

      <View style={styles.card}>
        <Chart values={values} avg={insights.avg} />
      </View>

      <Text style={styles.disclaimer}>ההערכות מבוססות על דפוס מחזורי לאורך זמן ואינן תחליף לייעוץ רפואי</Text>
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
  smallNote: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 16,
  },

  disclaimer: { marginTop: 14, fontSize: 12, color: '#666', textAlign: 'center', writingDirection: 'rtl', fontWeight: '700' },
});
