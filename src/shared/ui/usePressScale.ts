import { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { duration, easing, PRESS_SCALE } from './motion';

/**
 * 누르면 0.96배로 줄었다 돌아오는 반응.
 * <Pressable onPressIn={onPressIn} onPressOut={onPressOut}><Animated.View style={style}>…
 * HeroUI Button 은 자체 누름 반응이 있으니 직접 만든 타일과 행에만 쓴다.
 */
export function usePressScale(to: number = PRESS_SCALE) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const onPressIn = () => {
    if (!reduce) scale.set(withTiming(to, { duration: duration.press, easing: easing.standard }));
  };
  const onPressOut = () => {
    scale.set(withTiming(1, { duration: duration.press, easing: easing.standard }));
  };
  return { style, onPressIn, onPressOut };
}
