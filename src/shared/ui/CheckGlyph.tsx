import { useEffect } from 'react';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { duration, easing } from './motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** HeroUI Checkbox 의 체크 한 획. 체크박스, 습관 원, 완료 칩이 모두 이 모양을 쓴다. */
const CHECK_D = 'M4 9.5L8 13L14 6';
const CHECK_LEN = 16;

type Props = {
  size?: number;
  color: string;
  strokeWidth?: number;
  /** 처음 나타날 때 획을 그린다. 이미 완료 상태로 그려지는 목록에서는 false. */
  animate?: boolean;
};

export function CheckGlyph({ size = 16, color, strokeWidth = 2.5, animate = true }: Props) {
  const reduce = useReducedMotion();
  const drawn = !animate || reduce;
  const offset = useSharedValue(drawn ? 0 : CHECK_LEN);

  useEffect(() => {
    if (drawn) return;
    offset.set(withDelay(80, withTiming(0, { duration: duration.check, easing: easing.draw })));
  }, [drawn, offset]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.get() }));

  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <AnimatedPath
        d={CHECK_D}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={CHECK_LEN}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
