// app/disclaimer.tsx
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '../context/UserDataContext';

const PRIVACY_URL =
  'https://guyrofe.com/%d7%9e%d7%93%d7%99%d7%a0%d7%99%d7%95%d7%aa_%d7%a4%d7%a8%d7%98%d7%99%d7%95%d7%aa_%d7%a9%d7%95%d7%9c%d7%94/';

// אם אין לך עדיין דף תנאים - השאר null
const TERMS_URL: string | null = null;

export default function DisclaimerScreen() {
  const router = useRouter();
  const { acceptDisclaimer } = useUserData();
  const [checked, setChecked] = useState(false);

  const canContinue = useMemo(() => checked, [checked]);

  const openUrl = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert('שגיאה', 'לא ניתן לפתוח את הקישור כרגע.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את הקישור כרגע.');
    }
  };

  const onContinue = async () => {
    if (!checked) {
      Alert.alert('שנייה לפני שממשיכים', 'צריך לסמן שקראת והבנת כדי להמשיך.');
      return;
    }

    try {
      await acceptDisclaimer();
      router.replace('/');
    } catch {
      Alert.alert('שגיאה', 'לא הצלחנו לשמור את האישור. נסה שוב.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>דיסקליימר - שולה</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.p}>
          שולה היא אפליקציית מעקב מחזור, סימפטומים והערות. המידע באפליקציה אינו תחליף לייעוץ רפואי,
          אבחון או טיפול.
        </Text>

        <Text style={styles.p}>
          אם יש דימום חריג, כאב חריג, חשד להריון, חשד להריון חוץ רחמי, חום, עילפון, או כל תסמין מדאיג,
          יש לפנות לבדיקה רפואית.
        </Text>

        <Text style={styles.p}>
          החישובים והתחזיות באפליקציה מבוססים על נתונים שהוזנו ועל מודלים כלליים, ולכן ייתכנו סטיות.
        </Text>

        <View style={styles.linksBox}>
          <Pressable onPress={() => openUrl(PRIVACY_URL)} style={styles.linkBtn}>
            <Text style={styles.linkText}>למדיניות פרטיות של שולה</Text>
          </Pressable>

          {TERMS_URL ? (
            <Pressable onPress={() => openUrl(TERMS_URL)} style={styles.linkBtn}>
              <Text style={styles.linkText}>לתנאי שימוש</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable onPress={() => setChecked(v => !v)} style={styles.checkRow}>
          <View style={[styles.checkbox, checked && styles.checkboxOn]}>
            {checked ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={styles.checkText}>קראתי, הבנתי ואני מסכים/ה להמשיך</Text>
        </Pressable>

        <Pressable onPress={onContinue} disabled={!canContinue} style={[styles.cta, !canContinue && styles.ctaDisabled]}>
          <Text style={[styles.ctaText, !canContinue && styles.ctaTextDisabled]}>המשך</Text>
        </Pressable>

        <Text style={styles.footer}>
          בעל האפליקציה: ד"ר גיא רופא | יצירת קשר בנושא פרטיות: briutguy@gmail.com
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl', color: '#111', marginBottom: 14 },
  content: { paddingBottom: 30 },
  p: { fontSize: 15, lineHeight: 22, color: '#222', textAlign: 'right', writingDirection: 'rtl', marginBottom: 10, fontWeight: '600' },

  linksBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    marginBottom: 14,
    backgroundColor: '#fafafa',
  },
  linkBtn: { paddingVertical: 10 },
  linkText: { color: '#6a1b9a', fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },

  checkRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, marginBottom: 10 },
  checkbox: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { borderColor: '#6a1b9a', backgroundColor: '#efe5ff' },
  checkMark: { fontWeight: '900', color: '#2b0b3f', fontSize: 16 },
  checkText: { flex: 1, fontWeight: '800', color: '#111', textAlign: 'right', writingDirection: 'rtl' },

  cta: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: '#efe5ff', borderWidth: 1, borderColor: '#d9c3ff' },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { fontWeight: '900', color: '#2b0b3f' },
  ctaTextDisabled: { color: '#666' },

  footer: { marginTop: 14, fontSize: 12, color: '#666', textAlign: 'center', writingDirection: 'rtl', fontWeight: '700' },
});
