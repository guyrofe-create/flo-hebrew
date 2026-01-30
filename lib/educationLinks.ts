// lib/educationLinks.ts

export const HOME_URL = 'https://www.guyrofe.com';

export type EducationTopic =
  | 'cycle_regular'
  | 'cycle_irregular'
  | 'late_period'
  | 'prolonged_bleeding'
  | 'heavy_bleeding'
  | 'period_pain'
  | 'endometriosis'
  | 'postpartum'
  | 'breastfeeding'
  | 'post_ocp';

export const EDUCATION_SLUGS: Record<EducationTopic, string> = {
  cycle_regular: '/מחזור-סדיר-מה-נחשב-תקין',
  cycle_irregular: '/מחזורים-לא-סדירים',
  late_period: '/איחור-במחזור',
  prolonged_bleeding: '/דימום-ממושך',
  heavy_bleeding: '/דימום-כבד-או-חריג',
  period_pain: '/כאבי-מחזור-חזקים',
  endometriosis: '/אנדומטריוזיס-תסמינים',
  postpartum: '/אחרי-לידה-מתי-חוזר-המחזור',
  breastfeeding: '/הנקה-ביוץ-ומחזור',
  post_ocp: '/הפסקת-גלולות-מתי-המחזור-חוזר',
};

export function getEducationUrl(topic: EducationTopic) {
  return `${HOME_URL}${EDUCATION_SLUGS[topic]}`;
}
