// 습관 아이콘. 사용자가 직접 고른다(FR-07: 이름으로 자동 추천하던 기능은 없앴다)
export const ICON_KEYS = [
  'book',
  'dumbbell',
  'scale',
  'news',
  'music',
  'moon',
  'water',
  'activity',
  'pencil',
  'pill',
  'leaf',
  'sun',
  'heart',
  'coffee',
  'sparkle',
  'wallet',
  'phone',
  'check',
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

/** 화면 읽기 프로그램용 아이콘 이름 */
export const ICON_LABELS: Record<IconKey, string> = {
  book: '책',
  dumbbell: '운동',
  scale: '체중',
  news: '뉴스',
  music: '음악',
  moon: '수면',
  water: '물',
  activity: '걷기',
  pencil: '공부',
  pill: '약',
  leaf: '명상',
  sun: '아침',
  heart: '마음',
  coffee: '커피',
  sparkle: '정리',
  wallet: '돈',
  phone: '휴대폰',
  check: '기본',
};
