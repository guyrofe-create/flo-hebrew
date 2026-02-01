// lib/educationLinks.ts

export const HOME_URL = 'https://guyrofe.com';

export type EducationTopic =
  | 'cycle_regular'
  | 'cycle_irregular'
  | 'late_period'
  | 'prolonged_bleeding'
  | 'heavy_bleeding'
  | 'intermenstrual_bleeding'
  | 'period_pain'
  | 'endometriosis'
  | 'postpartum'
  | 'breastfeeding'
  | 'post_ocp'
  | 'late_or_irregular_ovulation'
  | 'perimenopause_cycle_changes'
  | 'long_cycle'
  | 'short_cycle';

export const EDUCATION_SLUGS: Record<EducationTopic, string> = {
  // מחזור תקין
  cycle_regular: '/מחזור-סדיר-מה-נחשב-תקין/',

  // מחזורים לא סדירים -> שחלות פוליציסטיות (כפי שביקשת)
  cycle_irregular: '/שחלות-פוליציסטיות-מחזור-לא-סדיר/',

  // איחור
  late_period: '/איחור-במחזור/',

  // דימומים
  prolonged_bleeding: '/דימום-ממושך/',
  heavy_bleeding: '/דימום-כבד-במחזור/',
  intermenstrual_bleeding: '/דימום-בין-מחזורים/',

  // כאבים
  period_pain: '/כאבים-חזקים-בזמן-מחזור/',

  // עד שיהיה עמוד ייעודי לאנדומטריוזיס
  endometriosis: '/כאבים-חזקים-בזמן-מחזור/',

  // מצבים פיזיולוגיים
  postpartum: '/אחרי-לידה-מתי-חוזר-המחזור/',
  breastfeeding: '/הנקה-ביוץ-ומחזור/',
  post_ocp: '/הפסקת-גלולות-מתי-המחזור-חוזר/',

  // קישורים נוספים שביקשת שיהיה להם ביטוי
  late_or_irregular_ovulation: '/ביוץ-מאוחר-או-לא-סדיר/',
  perimenopause_cycle_changes: '/גיל-המעבר-שינויים-במחזור/',
  long_cycle: '/מחזור-ארוך-מהרגיל/',
  short_cycle: '/מחזור-קצר-מהרגיל/',
};

export function getEducationUrl(topic: EducationTopic) {
  return `${HOME_URL}${EDUCATION_SLUGS[topic]}`;
}
