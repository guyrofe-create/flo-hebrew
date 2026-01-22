import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

type MarkType = 'period' | 'fertile' | 'ovulation' | null;

type DaySymptoms = {
  flow?: 'none' | 'light' | 'medium' | 'heavy';
  pain?: 'none' | 'mild' | 'moderate' | 'severe';
  mood?: 'good' | 'ok' | 'low' | 'anxious';
  discharge?: 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
  sex?: boolean;
  ovulationTest?: 'negative' | 'positive';
  notes?: string;
  photoUri?: string;
};

type Props = {
  visible: boolean;
  day: Date | null;
  dayKey: string | null;
  dayIso: string | null;

  mark: MarkType;
  isUserPeriodStart: boolean;
  isFuture: boolean;
  isToday: boolean;

  symptoms: DaySymptoms;
  goal: string | null;

  lastPeriodStartIso: string | null;
  cycleLength: number;
  periodLength: number;

  isPeriodActive: boolean;
  onStartPeriodToday: () => Promise<void>;
  onEndPeriodToday: () => Promise<void>;

  onClose: () => void;

  onAddPeriod: (isoNoon: string) => Promise<void>;
  onRemovePeriod: (isoNoon: string) => Promise<void>;

  onSetSymptoms: (dayKey: string, patch: DaySymptoms) => Promise<void>;
  onClearSymptoms: (dayKey: string) => Promise<void>;
};

function normalizeNoon(d: Date) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date) {
  const aa = normalizeNoon(a).getTime();
  const bb = normalizeNoon(b).getTime();
  return Math.round((aa - bb) / 86400000);
}

function confirmAsync(title: string, message: string, okText = 'להמשיך', cancelText = 'ביטול') {
  return new Promise<boolean>(resolve => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: okText, onPress: () => resolve(true) },
    ]);
  });
}

function badgeLabel(mark: MarkType) {
  if (mark === 'period') return 'מחזור';
  if (mark === 'fertile') return 'פוריות';
  if (mark === 'ovulation') return 'ביוץ משוער';
  return null;
}

function goalKind(goal: string | null) {
  if (!goal) return 'general' as const;
  if (goal === 'להיכנס להריון') return 'trying' as const;
  if (goal === 'הריון פעיל') return 'pregnant' as const;
  if (goal === 'מעקב אחרי מחזור') return 'tracking' as const;
  if (goal === 'שמירה על הבריאות הכללית') return 'general' as const;
  return 'general' as const;
}

function labelFlow(v: DaySymptoms['flow']) {
  if (v === 'light') return 'דימום קל';
  if (v === 'medium') return 'דימום בינוני';
  if (v === 'heavy') return 'דימום כבד';
  if (v === 'none') return 'ללא דימום';
  return null;
}

function labelPain(v: DaySymptoms['pain']) {
  if (v === 'mild') return 'כאב קל';
  if (v === 'moderate') return 'כאב בינוני';
  if (v === 'severe') return 'כאב חזק';
  if (v === 'none') return 'ללא כאב';
  return null;
}

function labelMood(v: DaySymptoms['mood']) {
  if (v === 'good') return 'מצב רוח טוב';
  if (v === 'ok') return 'מצב רוח רגיל';
  if (v === 'low') return 'מצב רוח נמוך';
  if (v === 'anxious') return 'חרדה';
  return null;
}

function smartSummary(params: {
  mark: MarkType;
  isFuture: boolean;
  goal: string | null;
  symptoms: DaySymptoms;
}) {
  const { mark, isFuture, goal, symptoms } = params;
  const g = goalKind(goal);

  if (isFuture) {
    if (g === 'trying' && (mark === 'fertile' || mark === 'ovulation')) {
      return 'תחזית: חלון פוריות או ביוץ משוער. אפשר להיערך מראש. אפשר להזין סימפטומים, אבל לא מסמנים תחילת מחזור בעתיד.';
    }
    if (g === 'pregnant') {
      return 'זה תאריך עתידי. בהריון התחזיות במחזור פחות רלוונטיות, אבל אפשר להזין סימפטומים והערות.';
    }
    return 'זה תאריך עתידי. אפשר להזין סימפטומים והערות, אבל תחילת מחזור לא מסמנים בעתיד.';
  }

  const parts: string[] = [];
  const f = labelFlow(symptoms.flow);
  const p = labelPain(symptoms.pain);
  const m = labelMood(symptoms.mood);
  if (f) parts.push(f);
  if (p) parts.push(p);
  if (m) parts.push(m);
  if (symptoms.ovulationTest === 'positive') parts.push('בדיקת ביוץ חיובית');
  if (symptoms.ovulationTest === 'negative') parts.push('בדיקת ביוץ שלילית');
  if (symptoms.sex === true) parts.push('הוזנו יחסים');
  if (symptoms.sex === false) parts.push('סומן ללא יחסים');
  if (symptoms.photoUri) parts.push('צורפה תמונה');

  const symptomLine = parts.length > 0 ? `הוזן: ${parts.join(', ')}.` : null;

  if (g === 'trying') {
    if (mark === 'ovulation') {
      return [symptomLine, 'זה יום ביוץ משוער לפי חישוב. אם את מנסה להרות, זה יום רלוונטי במיוחד.']
        .filter(Boolean)
        .join(' ');
    }
    if (mark === 'fertile') {
      return [symptomLine, 'חלון פוריות משוער לפי חישוב. אם מנסים להרות, זה טווח טוב לתזמון יחסים.']
        .filter(Boolean)
        .join(' ');
    }
    if (mark === 'period') {
      return [symptomLine, 'ימים שמסומנים כמחזור לפי חישוב. אם התחלת דימום בפועל, אפשר לסמן תחילת מחזור.']
        .filter(Boolean)
        .join(' ');
    }
    return [symptomLine, 'אפשר להזין סימפטומים ולסמן תחילת מחזור אם רלוונטי.'].filter(Boolean).join(' ');
  }

  if (g === 'pregnant') {
    return [symptomLine, 'מומלץ להשתמש בהזנת סימפטומים והערות, ופחות להסתמך על חיזויי מחזור.']
      .filter(Boolean)
      .join(' ');
  }

  if (g === 'tracking') {
    if (mark === 'period') return [symptomLine, 'יום שמסומן כמחזור לפי חישוב.'].filter(Boolean).join(' ');
    if (mark === 'ovulation') return [symptomLine, 'ביוץ משוער לפי חישוב.'].filter(Boolean).join(' ');
    if (mark === 'fertile') return [symptomLine, 'חלון פוריות משוער לפי חישוב.'].filter(Boolean).join(' ');
    return [symptomLine, 'אפשר להזין סימפטומים ולתחזק היסטוריית מחזורים.'].filter(Boolean).join(' ');
  }

  return [symptomLine, 'אפשר להזין סימפטומים והערות, ולסמן תחילת מחזור אם רלוונטי.'].filter(Boolean).join(' ');
}

function OptionRow<T extends string>(props: {
  title: string;
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const { title, value, options, onChange } = props;

  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <View style={styles.optionsRow}>
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[styles.optBtn, active && styles.optBtnActive]}
            >
              <Text style={[styles.optText, active && styles.optTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function DayModal(props: Props) {
  const {
    visible,
    day,
    dayKey,
    dayIso,
    mark,
    isUserPeriodStart,
    isFuture,
    isToday,
    symptoms,
    goal,
    onClose,
    onAddPeriod,
    onRemovePeriod,
    onSetSymptoms,
    onClearSymptoms,
  } = props;

  const [localNotes, setLocalNotes] = useState<string>(symptoms.notes || '');

  const title = useMemo(() => {
    if (!day) return '';
    return day.toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }, [day]);

  const badge = useMemo(() => badgeLabel(mark), [mark]);

  const summary = useMemo(() => {
    return smartSummary({ mark, isFuture, goal, symptoms });
  }, [mark, isFuture, goal, symptoms]);

  const lastStart = useMemo(() => {
    return props.lastPeriodStartIso ? normalizeNoon(new Date(props.lastPeriodStartIso)) : null;
  }, [props.lastPeriodStartIso]);

  const dayStats = useMemo(() => {
    if (!day || !lastStart || !props.cycleLength || props.cycleLength <= 0) return null;

    const delta = daysBetween(day, lastStart);
    const cycleDay = delta + 1;

    const mod = ((delta % props.cycleLength) + props.cycleLength) % props.cycleLength;
    const daysToNextPeriod = props.cycleLength - mod;

    return { cycleDay, daysToNextPeriod };
  }, [day, lastStart, props.cycleLength]);

  const canMarkPeriodStart = !isFuture && !!dayIso;

  const setPatch = async (patch: DaySymptoms) => {
    if (!dayKey) return;
    await onSetSymptoms(dayKey, patch);
  };

  const handleAddPeriod = async () => {
    if (!dayIso) return;
    if (!canMarkPeriodStart) return;

    const msg = isToday ? 'לסמן את היום כתחילת מחזור?' : 'לסמן את התאריך כתחילת מחזור (עבר)?';

    Alert.alert('תחילת מחזור', msg, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'סמני',
        onPress: async () => {
          await onAddPeriod(dayIso);
        },
      },
    ]);
  };

  const handleRemovePeriod = async () => {
    if (!dayIso) return;

    Alert.alert('הסרת תאריך מחזור', 'להסיר את התאריך מההיסטוריה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'הסר',
        style: 'destructive',
        onPress: async () => {
          await onRemovePeriod(dayIso);
        },
      },
    ]);
  };

  const handleClearSymptoms = async () => {
    if (!dayKey) return;

    Alert.alert('ניקוי סימפטומים', 'למחוק את כל הסימפטומים וההערות של היום הזה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחקי',
        style: 'destructive',
        onPress: async () => {
          await onClearSymptoms(dayKey);
          setLocalNotes('');
        },
      },
    ]);
  };

  const handleSaveNotes = async () => {
    if (!dayKey) return;
    await onSetSymptoms(dayKey, { notes: localNotes });
  };

  const pickPhoto = async () => {
    if (!dayKey) return;

    if (isFuture) {
      const ok = await confirmAsync(
        'תמונה',
        'אפשר לצרף תמונה גם לתאריך עתידי, אבל זה בעיקר כתזכורת. להמשיך?'
      );
      if (!ok) return;
    }

    try {
      const perm = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!req.granted) {
          const canOpenSettings = Platform.OS === 'ios' || Platform.OS === 'android';
          Alert.alert(
            'אין הרשאה לתמונות',
            'כדי להוסיף תמונה צריך לאשר גישה לתמונות בהגדרות המכשיר.',
            canOpenSettings
              ? [
                  { text: 'ביטול', style: 'cancel' },
                  { text: 'פתח הגדרות', onPress: () => Linking.openSettings() },
                ]
              : [{ text: 'סגור' }]
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        Alert.alert('שגיאה', 'לא הצלחנו לקרוא את התמונה שנבחרה. נסי שוב.');
        return;
      }

      await onSetSymptoms(dayKey, { photoUri: uri });
    } catch {
      Alert.alert('שגיאה', 'משהו השתבש בבחירת התמונה. נסי שוב או בדקי הרשאות.');
    }
  };

  const removePhoto = async () => {
    if (!dayKey) return;
    await onSetSymptoms(dayKey, { photoUri: undefined });
  };

  const handleStartToday = async () => {
    try {
      await props.onStartPeriodToday();
      Alert.alert('עודכן', 'סומן: התחיל דימום היום.');
    } catch {
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן. נסי שוב.');
    }
  };

  const handleEndToday = async () => {
    try {
      await props.onEndPeriodToday();
      Alert.alert('עודכן', 'סומן: המחזור נגמר היום.');
    } catch {
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן. נסי שוב.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View style={styles.headerLeft}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>סגור</Text>
            </Pressable>
          </View>

          <View style={styles.headerCenter}>
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {title}
            </Text>

            <View style={styles.badgesRow}>
              {badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
              {isToday && (
                <View style={[styles.badge, styles.badgeToday]}>
                  <Text style={styles.badgeText}>היום</Text>
                </View>
              )}
              {isFuture && (
                <View style={[styles.badge, styles.badgeFuture]}>
                  <Text style={styles.badgeText}>עתידי</Text>
                </View>
              )}
              {isUserPeriodStart && (
                <View style={[styles.badge, styles.badgeUser]}>
                  <Text style={styles.badgeText}>תחילת מחזור שהוזנה</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {dayStats && !isFuture && (
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={styles.statText}>יום {dayStats.cycleDay} במחזור</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statText}>עוד {dayStats.daysToNextPeriod} ימים למחזור הבא</Text>
              </View>
            </View>
          )}

          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>

          <View style={styles.actionsRow}>
            {isToday && (
              <>
                {!props.isPeriodActive ? (
                  <Pressable onPress={handleStartToday} style={[styles.actionBtn, styles.actionBtnPrimary]}>
                    <Text style={styles.actionTextPrimary}>התחיל לי דימום היום</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={handleEndToday} style={[styles.actionBtn, styles.actionBtnDanger]}>
                    <Text style={styles.actionTextDanger}>המחזור נגמר היום</Text>
                  </Pressable>
                )}
              </>
            )}

            {!isUserPeriodStart && (
              <Pressable
                onPress={handleAddPeriod}
                disabled={!canMarkPeriodStart}
                style={[styles.actionBtn, !canMarkPeriodStart && styles.actionBtnDisabled]}
              >
                <Text style={[styles.actionText, !canMarkPeriodStart && styles.actionTextDisabled]}>
                  סמני תחילת מחזור
                </Text>
              </Pressable>
            )}

            {isUserPeriodStart && (
              <Pressable onPress={handleRemovePeriod} style={[styles.actionBtn, styles.actionBtnDanger]}>
                <Text style={styles.actionTextDanger}>הסירי תחילת מחזור</Text>
              </Pressable>
            )}

            <Pressable onPress={handleClearSymptoms} style={[styles.actionBtn, styles.actionBtnGhost]}>
              <Text style={styles.actionTextGhost}>ניקוי סימפטומים</Text>
            </Pressable>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>תמונה</Text>

            {symptoms.photoUri ? (
              <>
                <View style={styles.photoWrap}>
                  <Image source={{ uri: symptoms.photoUri }} style={styles.photo} contentFit="cover" />
                </View>

                <View style={styles.photoActions}>
                  <Pressable onPress={pickPhoto} style={[styles.actionBtn, styles.actionBtnGhost]}>
                    <Text style={styles.actionTextGhost}>החליפי תמונה</Text>
                  </Pressable>
                  <Pressable onPress={removePhoto} style={[styles.actionBtn, styles.actionBtnDanger]}>
                    <Text style={styles.actionTextDanger}>הסירי תמונה</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Pressable onPress={pickPhoto} style={[styles.actionBtn, styles.actionBtnPrimary]}>
                <Text style={styles.actionTextPrimary}>הוסיפי תמונה</Text>
              </Pressable>
            )}

            <Text style={styles.notesHint}>
              התמונה נשמרת כמזהה מקומי (URI). בשלב הבא אפשר לשדרג לשמירה קבועה בתוך האפליקציה.
            </Text>
          </View>

          <OptionRow
            title="דימום"
            value={symptoms.flow || 'none'}
            options={[
              { value: 'none', label: 'אין' },
              { value: 'light', label: 'קל' },
              { value: 'medium', label: 'בינוני' },
              { value: 'heavy', label: 'כבד' },
            ]}
            onChange={v => setPatch({ flow: v })}
          />

          <OptionRow
            title="כאב"
            value={symptoms.pain || 'none'}
            options={[
              { value: 'none', label: 'אין' },
              { value: 'mild', label: 'קל' },
              { value: 'moderate', label: 'בינוני' },
              { value: 'severe', label: 'חזק' },
            ]}
            onChange={v => setPatch({ pain: v })}
          />

          <OptionRow
            title="מצב רוח"
            value={symptoms.mood || 'ok'}
            options={[
              { value: 'good', label: 'טוב' },
              { value: 'ok', label: 'רגיל' },
              { value: 'low', label: 'נמוך' },
              { value: 'anxious', label: 'חרד' },
            ]}
            onChange={v => setPatch({ mood: v })}
          />

          <View style={styles.block}>
            <Text style={styles.blockTitle}>הערות</Text>
            <TextInput
              value={localNotes}
              onChangeText={setLocalNotes}
              onBlur={handleSaveNotes}
              placeholder="כתבי כאן..."
              placeholderTextColor="#888"
              multiline
              style={styles.notes}
              textAlign="right"
            />
            <Text style={styles.notesHint}>נשמר אוטומטית כשאת יוצאת מהשדה</Text>
          </View>

          <View style={{ height: 18 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '86%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },

  sheetHeader: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },

  headerLeft: { width: 90, alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { width: 90 },

  closeBtn: { paddingVertical: 8, paddingHorizontal: 10 },
  closeText: { color: '#6a1b9a', fontWeight: '900' },

  sheetTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
    color: '#111',
  },

  badgesRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },

  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: '#f2f2f2',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },

  badgeToday: { backgroundColor: '#efe5ff', borderColor: '#d9c3ff' },
  badgeFuture: { backgroundColor: '#fafafa', borderColor: '#eee' },
  badgeUser: { backgroundColor: '#fff', borderColor: '#111' },

  badgeText: { fontWeight: '900', color: '#222', writingDirection: 'rtl' },

  content: { padding: 14, paddingBottom: 26 },

  statsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 10,
  },

  statPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },

  statText: { fontWeight: '900', color: '#222', writingDirection: 'rtl' },

  summaryBox: {
    backgroundColor: '#faf7ff',
    borderWidth: 1,
    borderColor: '#e8dcff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },

  summaryText: {
    color: '#2b1b3a',
    fontWeight: '800',
    lineHeight: 20,
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  actionsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
    marginBottom: 12,
  },

  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },

  actionBtnDisabled: { opacity: 0.5 },

  actionBtnDanger: {
    borderColor: '#ffd0d9',
    backgroundColor: '#ffe3e8',
  },

  actionBtnGhost: {
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },

  actionBtnPrimary: {
    borderColor: '#d9c3ff',
    backgroundColor: '#efe5ff',
  },

  actionText: { fontWeight: '900', color: '#111', writingDirection: 'rtl' },
  actionTextDisabled: { color: '#666' },
  actionTextDanger: { fontWeight: '900', color: '#a3122a', writingDirection: 'rtl' },
  actionTextGhost: { fontWeight: '900', color: '#333', writingDirection: 'rtl' },
  actionTextPrimary: { fontWeight: '900', color: '#2b0b3f', writingDirection: 'rtl' },

  block: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
  },

  blockTitle: {
    fontWeight: '900',
    color: '#222',
    marginBottom: 10,
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  optionsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },

  optBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },

  optBtnActive: {
    borderColor: '#6a1b9a',
    backgroundColor: '#efe5ff',
  },

  optText: { fontWeight: '900', color: '#333', writingDirection: 'rtl' },
  optTextActive: { color: '#2b0b3f' },

  notes: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    padding: 12,
    minHeight: 88,
    fontWeight: '700',
    color: '#111',
    writingDirection: 'rtl',
  },

  notesHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    writingDirection: 'rtl',
    textAlign: 'right',
    fontWeight: '700',
  },

  photoWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },

  photo: {
    width: '100%',
    height: 220,
  },

  photoActions: {
    marginTop: 10,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
});
