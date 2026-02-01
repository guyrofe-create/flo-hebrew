// lib/educationLinks.ts

export const HOME_URL = 'https://www.guyrofe.com';

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
  | 'post_ocp';

export const EDUCATION_SLUGS: Record<EducationTopic, string> = {
  cycle_regular: '/מחזור-סדיר-מה-נחשב-תקין',
  cycle_irregular: '/מחזורים-לא-סדירים', // עמוד מרכז שצריך להתקיים
  late_period: '/איחור-במחזור',
  prolonged_bleeding: '/דימום-ממושך',
  heavy_bleeding: '/דימום-כבד-במחזור',
  intermenstrual_bleeding: '/דימום-בין-מחזורים',
  period_pain: '/כאבים-חזקים-בזמן-מחזור',

  // עד שיהיה עמוד ייעודי לאנדומטריוזיס
  endometriosis: '/כאבים-חזקים-בזמן-מחזור',

  postpartum: '/אחרי-לידה-מתי-חוזר-המחזור',
  breastfeeding: '/הנקה-ביוץ-ומחזור',
  post_ocp: '/הפסקת-גלולות-מתי-המחזור-חוזר',
};

export function getEducationUrl(topic: EducationTopic) {
  return `${HOME_URL}${EDUCATION_SLUGS[topic]}`;
}
