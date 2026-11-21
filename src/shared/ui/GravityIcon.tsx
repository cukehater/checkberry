import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { GRAVITY_ICONS, type GravityIconName, type IconPath } from './gravity-icons.data';

// 전체 아이콘(약 800개, 380KB)은 처음 필요할 때(습관 아이콘 `gi:`, 아이콘 피커) 모듈을 평가한다
let all: Record<string, readonly IconPath[]> | undefined;
export function allGravityIcons(): Record<string, readonly IconPath[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- import는 앱 시작 때 평가돼서 require로 미룬다
  return (all ??= require('./gravity-icons.all').GRAVITY_ICONS_ALL);
}

type Props = {
  /** 앱 기본 아이콘 이름, 또는 전체 데이터(gravity-icons.all)의 이름. 없는 이름이면 원을 그린다 */
  name: GravityIconName | (string & {});
  size?: number;
  color: string;
};

/** Gravity UI 아이콘 (16 격자, 채운 모양). 색은 부모가 넘긴다. */
export const GravityIcon = memo(function GravityIcon({ name, size = 16, color }: Props) {
  const paths: readonly IconPath[] = GRAVITY_ICONS[name as GravityIconName] ?? allGravityIcons()[name] ?? GRAVITY_ICONS.circle;
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {paths.map((p, i) => (
        <Path key={i} d={p.d} fill={color} fillRule={p.evenOdd ? 'evenodd' : 'nonzero'} clipRule={p.evenOdd ? 'evenodd' : 'nonzero'} />
      ))}
    </Svg>
  );
});

export type { GravityIconName };
