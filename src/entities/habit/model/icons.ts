// 습관 아이콘. 사용자가 직접 고른다(FR-07: 이름으로 자동 추천하던 기능은 없앴다)
const ICON_KEYS = [
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
const ICON_LABELS: Record<IconKey, string> = {
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

/**
 * 저장된 아이콘 값(`habits.icon_key`)을 읽는다. `gi:<이름>`은 Gravity 아이콘 전체에서 고른 것,
 * 접두사가 없으면 옛 ICON_KEYS 값이다(모르는 값은 기본 아이콘)
 */
export function parseIconKey(value: string): { kind: 'gravity'; name: string } | { kind: 'legacy'; key: IconKey } {
  if (value.startsWith('gi:') && value.length > 3) return { kind: 'gravity', name: value.slice(3) };
  return { kind: 'legacy', key: (ICON_KEYS as readonly string[]).includes(value) ? (value as IconKey) : 'check' };
}

/** 화면에 보일 아이콘 이름. 옛 키는 한국어 라벨, Gravity 아이콘은 영문 이름 */
export function iconLabel(value: string): string {
  const k = parseIconKey(value);
  return k.kind === 'gravity' ? k.name : ICON_LABELS[k.key];
}
