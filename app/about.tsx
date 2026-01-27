import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

export default function AboutScreen() {
  const email = 'briutguy@gmail.com';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>אודות שולה</Text>

      <Text style={styles.p}>
        שולה היא אפליקציה בעברית למעקב אחר המחזור החודשי ולהערכת חלון פוריות.
      </Text>

      <Text style={styles.p}>
        כל החישובים באפליקציה הם הערכה בלבד ואינם תחליף לייעוץ רפואי.
      </Text>

      <View style={styles.card}>
        <Text style={styles.h}>יצירת קשר</Text>

        <Pressable
          style={styles.linkBtn}
          onPress={() => Linking.openURL(`mailto:${email}`)}
        >
          <Text style={styles.linkText}>{email}</Text>
        </Pressable>

        <Text style={styles.small}>
          פותח על ידי ד"ר גיא רופא
        </Text>
      </View>

      <Text style={styles.note}>
        למסמכים: מדיניות פרטיות ומידע משפטי ניתן להגיע דרך מסך ההגדרות.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
    writingDirection: 'rtl',
  },
  p: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 10,
    writingDirection: 'rtl',
    textAlign: 'right',
    color: '#111',
    fontWeight: '600',
  },
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 18,
    padding: 14,
  },
  h: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  linkBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  linkText: { fontSize: 16, fontWeight: '900', color: '#6a1b9a' },
  small: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
    writingDirection: 'rtl',
    textAlign: 'right',
    fontWeight: '700',
  },
  note: {
    marginTop: 14,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    writingDirection: 'rtl',
    fontWeight: '700',
  },
});
