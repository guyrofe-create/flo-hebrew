// app/privacy.tsx
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>חזרה</Text>
        </Pressable>
        <Text style={styles.title}>מדיניות פרטיות</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>עקרון בסיסי</Text>
        <Text style={styles.text}>
          האפליקציה שומרת נתונים מקומית על המכשיר בלבד (Local storage).
          אין שליחה אוטומטית של נתונים לשרת חיצוני.
        </Text>

        <Text style={styles.sectionTitle}>איזה נתונים נשמרים</Text>
        <Text style={styles.text}>
          נתוני מטרה, תאריך לידה, תאריכי מחזור שהוזנו, סימפטומים והערות, ותמונה ליום אם הוזנה.
        </Text>

        <Text style={styles.sectionTitle}>הרשאות</Text>
        <Text style={styles.text}>
          התראות: נדרשות רק אם המשתמשת מפעילה תזכורת יומית.
          תמונות: נדרשת גישה למדיה רק אם המשתמשת בוחרת להוסיף תמונה ליום.
        </Text>

        <Text style={styles.sectionTitle}>שיתוף מידע</Text>
        <Text style={styles.text}>
          האפליקציה לא משתפת נתונים עם צדדים שלישיים כברירת מחדל.
          אם בעתיד יתווסף כלי ניטור תקלות (כמו Sentry), הוא יופעל רק כדי לדווח על שגיאות טכניות ולא מידע רפואי אישי.
        </Text>

        <Text style={styles.sectionTitle}>מחיקה ואיפוס</Text>
        <Text style={styles.text}>
          ניתן לאפס את כל הנתונים מהמסך "הגדרות" ולמחוק את המידע המקומי מהמכשיר.
        </Text>

        <Text style={styles.footer}>עדכון אחרון: ינואר 2026</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingTop: 60,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  backBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 8 },
  backText: { color: '#6a1b9a', fontWeight: '800', fontSize: 16 },

  title: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 6,
  },

  content: { padding: 18, paddingBottom: 30 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 16,
    marginBottom: 6,
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  text: {
    fontSize: 15,
    lineHeight: 22,
    writingDirection: 'rtl',
    textAlign: 'right',
    color: '#222',
  },

  footer: {
    marginTop: 24,
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    writingDirection: 'rtl',
  },
});
