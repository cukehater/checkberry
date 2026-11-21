import { View } from 'react-native';
import { GravityIcon, Icon, type IconName, useColor } from '@/shared/ui';
import { type IconKey, parseIconKey } from '../model/icons';

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
  // 기본(아이콘을 고르지 않은 습관). 빈 원(dot)은 체크 상자처럼 보여서 쓰지 않는다
  check: 'sparkles',
};

/** 습관 아이콘. 옛 키(`book`)와 Gravity 전체 아이콘(`gi:<이름>`)을 모두 그린다 */
export function HabitIcon({ iconKey, size = 22, tint, filled }: { iconKey: string; size?: number; tint?: string; filled?: boolean }) {
  const c = useColor();
  const k = parseIconKey(iconKey);
  if (k.kind === 'gravity') return <GravityIcon name={k.name} size={size} color={tint ?? c.text} />;
  return <Icon name={HABIT_ICON[k.key]} size={size} tint={tint} filled={filled} />;
}

/** 습관 유형 아이콘. 베리 soft 원 위 글리프(IconChip과 같은 모양) */
export function HabitChip({ iconKey, size = 28 }: { iconKey: string; size?: number }) {
  const c = useColor();
  return (
    // 크기는 계산되는 값이라 style로 준다
    <View className="items-center justify-center rounded-full bg-accent-soft" style={{ width: size, height: size }}>
      <HabitIcon iconKey={iconKey} size={Math.round(size / 2)} tint={c.accentInk} filled />
    </View>
  );
}
