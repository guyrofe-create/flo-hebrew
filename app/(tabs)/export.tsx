// app/(tabs)/export.tsx
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useUserData } from '../../context/UserDataContext';
import { buildReportModel } from '../../lib/reportExport';

function escHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Lazy native loaders (מונע קריסה אם המודול לא בבילד)
async function loadPrint() {
  try {
    const mod = await import('expo-print');
    return mod;
  } catch {
    return null;
  }
}

async function loadSharing() {
  try {
    const mod = await import('expo-sharing');
    return mod;
  } catch {
    return null;
  }
}

export default function ExportScreen() {
  const { periodHistory, symptomsByDay } = useUserData();
  const [busy, setBusy] = useState(false);

  const model = useMemo(() => buildReportModel({ periodHistory, symptomsByDay }), [periodHistory, symptomsByDay]);
  const canExport = model.periodHistoryUniq.length > 0;

  const buildHtml = () => {
    const cyclesAvg = model.cycles.avg !== null ? model.round1(model.cycles.avg) : null;
    const cyclesRange =
      model.cycles.min !== null && model.cycles.max !== null ? `${model.cycles.min} עד ${model.cycles.max}` : null;

    const periodAvg = model.periodLens.avg !== null ? model.round1(model.periodLens.avg) : null;

    const periodsList = model.periodHistoryUniq
      .slice(0, 18)
      .map(d => `<li>${escHtml(model.fmtIL(d))}</li>`)
      .join('');

    const opkList = model.opk
      .slice(0, 18)
      .map(k => `<li>${escHtml(model.fmtDayKeyIL(k))}</li>`)
      .join('');

    const abnList = model.abnormal
      .slice(0, 18)
      .map(x => `<li>${escHtml(model.fmtDayKeyIL(x.dayKey))}: ${escHtml(x.text)}</li>`)
      .join('');

    return `
<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, system-ui, Segoe UI, Roboto, Arial; padding: 18px; color: #111; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    h2 { font-size: 14px; margin: 18px 0 8px; }
    .card { border: 1px solid #eee; border-radius: 12px; padding: 12px; margin-top: 10px; }
    .kpi { display: flex; gap: 10px; flex-wrap: wrap; }
    .pill { border: 1px solid #eee; border-radius: 999px; padding: 6px 10px; background: #fafafa; font-weight: 700; }
    ul { margin: 8px 0 0; padding-right: 18px; }
    .muted { color: #666; font-size: 12px; font-weight: 600; line-height: 1.5; }
    .foot { margin-top: 18px; padding-top: 10px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <h1>דוח מעקב מחזור</h1>
  <div class="muted">נוצר מתוך האפליקציה לצורך שיתוף עם רופא/ה.</div>

  <div class="card">
    <h2>סיכום מספרי</h2>
    <div class="kpi">
      <div class="pill">מספר תאריכי מחזור: ${model.periodHistoryUniq.length}</div>
      <div class="pill">ממוצע אורך מחזור: ${cyclesAvg !== null ? cyclesAvg : '-'}</div>
      <div class="pill">טווח אורך מחזור: ${cyclesRange || '-'}</div>
      <div class="pill">ממוצע אורך וסת (מתוך סימפטומים): ${periodAvg !== null ? periodAvg : '-'}</div>
    </div>
  </div>

  <div class="card">
    <h2>תאריכי תחילת מחזור (אחרונים)</h2>
    <ul>${periodsList || '<li>אין</li>'}</ul>
  </div>

  <div class="card">
    <h2>תאריכי בדיקת ביוץ חיובית (OPK)</h2>
    <ul>${opkList || '<li>אין</li>'}</ul>
  </div>

  <div class="card">
    <h2>סימפטומים חריגים שסומנו</h2>
    <div class="muted">MVP: כאב חזק, BBT מחוץ לטווח, או הערות ארוכות מאוד.</div>
    <ul>${abnList || '<li>אין</li>'}</ul>
  </div>

  <div class="foot muted">
    המידע נועד לשיתוף עם רופא/ה ואינו אבחנה רפואית.
  </div>
</body>
</html>
    `.trim();
  };

  const exportPdf = async () => {
    if (!canExport) {
      Alert.alert('אין מספיק נתונים', 'כדי לייצא דוח צריך לפחות תאריך תחילת מחזור אחד.');
      return;
    }

    setBusy(true);
    try {
      const Print = await loadPrint();
      const Sharing = await loadSharing();

      if (!Print || !Print.printToFileAsync) {
        Alert.alert(
          'ייצוא לא זמין בבילד הזה',
          'נראה שהוספת expo-print אבל ה-Dev Build לא נבנה מחדש. צריך לבנות Dev Client חדש כדי לאפשר ייצוא PDF.'
        );
        return;
      }

      const html = buildHtml();
      const { uri } = await Print.printToFileAsync({ html });

      if (!Sharing || !Sharing.isAvailableAsync || !Sharing.shareAsync) {
        Alert.alert(
          'שיתוף לא זמין בבילד הזה',
          'הקובץ נוצר, אבל מודול השיתוף לא זמין בבילד הזה. בנה Dev Client חדש כדי לשתף.'
        );
        return;
      }

      const ok = await Sharing.isAvailableAsync();
      if (!ok) {
        Alert.alert('שיתוף לא זמין', 'במכשיר הזה אין שיתוף קבצים זמין. הקובץ נוצר מקומית.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'שיתוף דוח לרופא',
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      Alert.alert('שגיאה', 'לא הצלחתי לייצא דוח. נסה שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>דוח לרופא</Text>
      <Text style={styles.subtitle}>יוצר PDF מסכם שניתן לשתף</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>מה נכנס לדוח</Text>
        <Text style={styles.line}>תאריכי מחזורים</Text>
        <Text style={styles.line}>אורכי מחזור (ממוצע, טווח)</Text>
        <Text style={styles.line}>אורכי וסת (ממוצע, מתוך סימפטומים אם הוזנו)</Text>
        <Text style={styles.line}>תאריכי OPK חיובי</Text>
        <Text style={styles.line}>סימפטומים חריגים</Text>
      </View>

      <Pressable
        onPress={exportPdf}
        style={[styles.btn, (!canExport || busy) && styles.btnDisabled]}
        disabled={!canExport || busy}
      >
        <Text style={[styles.btnText, (!canExport || busy) && styles.btnTextDisabled]}>
          {busy ? 'מייצר...' : 'ייצוא PDF ושיתוף'}
        </Text>
      </Pressable>

      <Text style={styles.disclaimer}>המידע נועד לשיתוף עם רופא/ה ואינו אבחנה רפואית</Text>
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

  line: { fontSize: 13, fontWeight: '800', color: '#333', writingDirection: 'rtl', textAlign: 'right', marginBottom: 6 },

  btn: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d9c3ff',
    alignItems: 'center',
    backgroundColor: '#efe5ff',
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { fontSize: 16, fontWeight: '900', color: '#2b0b3f', writingDirection: 'rtl' },
  btnTextDisabled: { color: '#666' },

  disclaimer: { marginTop: 14, fontSize: 12, color: '#666', textAlign: 'center', writingDirection: 'rtl', fontWeight: '700' },
});
