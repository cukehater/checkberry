import { Icon, IconChip, type IconName } from '@/shared/ui';
import type { IconKey } from '../model/icons';

const HABIT_ICON: Record<IconKey, IconName> = {
  book: 'book',
  dumbbell: 'bolt',
  scale: 'weight',
  news: 'news',
  music: 'music',
  moon: 'moon',
  water: 'drop',
  activity: 'walk',
  pencil: 'study',
  pill: 'pill',
  leaf: 'sparkles',
  sun: 'sun',
  heart: 'heart',
  coffee: 'mug',
  sparkle: 'archive',
  wallet: 'wallet',
  phone: 'phone',
  check: 'dot',
};

export function HabitIcon({ iconKey, size = 22, tint, filled }: { iconKey: string; size?: number; tint?: string; filled?: boolean }) {
  return <Icon name={HABIT_ICON[iconKey as IconKey] ?? 'dot'} size={size} tint={tint} filled={filled} />;
}

/** 습관 유형 아이콘. 회색 사각형 위 글리프 */
export function HabitChip({ iconKey, size = 28 }: { iconKey: string; size?: number }) {
  return <IconChip name={HABIT_ICON[iconKey as IconKey] ?? 'dot'} size={size} />;
}
