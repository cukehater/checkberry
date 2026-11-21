import { View } from 'react-native';
import { PhosphorIcon, useColor } from '@/shared/ui';
import { habitIconName } from '../model/icons';

/** 습관 아이콘(Phosphor fill). 옛 값(옛 키·gi:)도 Phosphor로 옮겨 그린다 */
export function HabitIcon({ iconKey, size = 22, tint }: { iconKey: string; size?: number; tint?: string }) {
  const c = useColor();
  return <PhosphorIcon name={habitIconName(iconKey)} size={size} color={tint ?? c.text} />;
}

/** 습관 유형 아이콘. 습관 원(라이트 베리 soft, 다크 따뜻한 회색) 위 글리프(IconChip과 같은 모양) */
export function HabitChip({ iconKey, size = 28 }: { iconKey: string; size?: number }) {
  const c = useColor();
  return (
    // 크기·색은 계산되는 값이라 style로 준다
    <View className="items-center justify-center rounded-full" style={{ width: size, height: size, backgroundColor: c.habitBg }}>
      <HabitIcon iconKey={iconKey} size={Math.round(size / 2)} tint={c.habitInk} />
    </View>
  );
}
