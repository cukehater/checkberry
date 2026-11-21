import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { GRAVITY_ICONS, type GravityIconName, type IconPath } from './gravity-icons.data';

type Props = {
  name: GravityIconName;
  size?: number;
  color: string;
};

/** Gravity UI 아이콘 (16 격자, 채운 모양). 색은 부모가 넘긴다. */
export const GravityIcon = memo(function GravityIcon({ name, size = 16, color }: Props) {
  const paths: readonly IconPath[] = GRAVITY_ICONS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {paths.map((p, i) => (
        <Path key={i} d={p.d} fill={color} fillRule={p.evenOdd ? 'evenodd' : 'nonzero'} clipRule={p.evenOdd ? 'evenodd' : 'nonzero'} />
      ))}
    </Svg>
  );
});

export type { GravityIconName };
