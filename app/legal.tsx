import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const PRIVACY_URL =
  'https://guyrofe.com/%d7%9e%d7%93%d7%99%d7%a0%d7%99%d7%95%d7%aa_%d7%a4%d7%a8%d7%98%d7%99%d7%95%d7%aa_%d7%a9%d7%95%d7%9c%d7%94/';

export default function LegalScreen() {
  const router = useRouter();

  const openPrivacy = async () => {
    try {
      const ok = await Linking.canOpenURL(PRIVACY_URL);
      if (!ok) {
        Alert.alert('שגיאה', 'לא ניתן לפתוח את הקישור כרגע.');
        return;
      }
      await Linking.openURL(PRIVACY_URL);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את הקישור כרגע.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>חזרה</Text>
        </Pressable>
        <Text style={styles.title}>מידע משפטי והבהרות</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>מטרת האפליקציה</Text>
        <Text style={styles.text}>
          האפליקציה מיועדת למעקב אישי והצגת מידע כללי וחישובים להכוונה בלבד.
          החישובים מבוססים על נתונים שהוזנו ועל מודלים סטטיסטיים, ועלולים להיות לא מדויקים.
        </Text>

        <Text style={styles.sectionTitle}>לא תחליף לייעוץ רפואי</Text>
        <Text style={styles.text}>
          האפליקציה אינה מספקת ייעוץ רפואי, אבחנה או טיפול, ואינה מהווה תחליף לפנייה לרופא/ה.
          בכל חשש רפואי, כאב חריג, דימום לא רגיל, או חשד להריון יש לפנות לגורם רפואי מוסמך.
        </Text>

        <Text style={styles.sectionTitle}>מניעת הריון, פוריות וביוץ</Text>
        <Text style={styles.text}>
          אין להסתמך על תחזיות ביוץ/פוריות באפליקציה לצורך מניעת הריון.
          אם מטרתך מניעה, יש להשתמש באמצעי מניעה רפואיים מוכחים ולהיוועץ ברופא/ה.
        </Text>

        <Text style={styles.sectionTitle}>מדיניות פרטיות</Text>
        <Text style={styles.text}>
          להסבר מלא על איסוף ושימוש במידע, ניתן לקרוא את מדיניות הפרטיות של שולה בקישור הבא.
        </Text>

        <Pressable onPress={openPrivacy} style={styles.linkBtn}>
          <Text style={styles.linkText}>פתיחת מדיניות הפרטיות של שולה</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>היקף אחריות</Text>
        <Text style={styles.text}>
          השימוש באפליקציה הוא באחריות המשתמשת בלבד.
          אין לראות במידע באפליקציה התחייבות לדיוק, זמינות או התאמה לצורך רפואי מסוים.
          בעל האפליקציה לא יישא באחריות לכל נזק ישיר או עקיף הנובע מהשימוש באפליקציה או מהסתמכות על המידע שבה.
        </Text>

        <Text style={styles.sectionTitle}>זכויות יוצרים</Text>
        <Text style={styles.text}>
          התכנים, העיצוב, הקוד והמבנה של האפליקציה מוגנים בזכויות יוצרים.
          אין להעתיק, לשכפל או לעשות שימוש מסחרי ללא אישור מראש ובכתב מבעל האפליקציה.
        </Text>

        <Text style={styles.sectionTitle}>יצירת קשר</Text>
        <Text style={styles.text}>
          בעל האפליקציה: ד"ר גיא רופא
          {'\n'}
          לפניות כלליות ולנושא פרטיות: briutguy@gmail.com
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

  linkBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d9c3ff',
    backgroundColor: '#efe5ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },

  linkText: {
    fontWeight: '900',
    color: '#2b0b3f',
    writingDirection: 'rtl',
    textAlign: 'center',
  },

  footer: {
    marginTop: 24,
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    writingDirection: 'rtl',
  },
});
