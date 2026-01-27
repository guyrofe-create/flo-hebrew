import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Alert, Button, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '../context/UserDataContext';
import { normalizeNoon } from '../lib/date';

export const options = {
  title: 'היסטוריית מחזורים',
};

function isoDay(iso: string) {
  return iso.slice(0, 10);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('he-IL');
}

export default function HistoryScreen() {
  const { periodHistory, addPeriodDate, removePeriodDate } = useUserData();

  const [showAdd, setShowAdd] = useState(false);
  const [date, setDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const iso = useMemo(() => {
    if (!date) return null;
    return normalizeNoon(date).toISOString();
  }, [date]);

  const alreadyAdded = useMemo(() => {
    if (!iso) return false;
    return periodHistory.some(d => isoDay(d) === isoDay(iso));
  }, [periodHistory, iso]);

  const onPick = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (!selectedDate) return;
    setDate(selectedDate);
    if (Platform.OS === 'ios') setShowPicker(true);
  };

  const handleAdd = async () => {
    if (!iso) return;
    if (alreadyAdded) {
      Alert.alert('כבר קיים', 'התאריך הזה כבר נמצא בהיסטוריה.');
      return;
    }
    await addPeriodDate(iso);
    setDate(null);
    setShowPicker(false);
    setShowAdd(false);
  };

  const confirmRemove = (isoToRemove: string) => {
    Alert.alert('מחיקת תאריך', `למחוק את ${formatDate(isoToRemove)}?`, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחיקה', style: 'destructive', onPress: () => removePeriodDate(isoToRemove) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>היסטוריית מחזורים</Text>

      <Pressable onPress={() => setShowAdd(v => !v)} style={styles.addToggleBtn}>
        <Text style={styles.addToggleText}>{showAdd ? 'סגירה' : 'הוספת תאריך מחזור'}</Text>
      </Pressable>

      {showAdd && (
        <View style={styles.addBox}>
          <Button
            title={date ? date.toLocaleDateString('he-IL') : 'בחרי תאריך'}
            onPress={() => setShowPicker(true)}
            color="#6a1b9a"
          />

          {showPicker && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={onPick}
            />
          )}

          <View style={{ marginTop: 10 }}>
            <Button title="הוספה" onPress={handleAdd} disabled={!date || alreadyAdded} color="#6a1b9a" />
          </View>

          {alreadyAdded && <Text style={styles.dupHint}>התאריך כבר קיים בהיסטוריה.</Text>}
        </View>
      )}

      {periodHistory.length === 0 ? (
        <Text style={styles.message}>לא הוזנו מחזורים עדיין.</Text>
      ) : (
        <ScrollView style={styles.list}>
          {periodHistory.map((d: string, index: number) => (
            <View key={`${d}-${index}`} style={styles.entry}>
              <Text style={styles.text}>• {formatDate(d)}</Text>

              <Pressable onPress={() => confirmRemove(d)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>מחיקה</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 18, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl' },
  message: { marginTop: 14, textAlign: 'center', color: '#666', writingDirection: 'rtl' },

  addToggleBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e7dcff',
    backgroundColor: '#f5efff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  addToggleText: { textAlign: 'center', fontWeight: '900', color: '#2b0b3f', writingDirection: 'rtl' },

  addBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#fafafa',
  },
  dupHint: { marginTop: 8, color: '#8a2be2', writingDirection: 'rtl', textAlign: 'right', fontWeight: '700' },

  list: { marginTop: 14 },
  entry: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  text: { fontWeight: '800', color: '#222', writingDirection: 'rtl', textAlign: 'right', flex: 1 },

  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffd6d6',
    backgroundColor: '#fff5f5',
  },
  deleteText: { fontWeight: '900', color: '#a30000' },
});
