import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { duration, easing } from './motion';
import { useColor } from './theme';

const COUNT = 12;

function Dot({ index, size, color }: { index: number; size: number; color: string }) {
  const p = useSharedValue(0);
  const angle = (index / COUNT) * Math.PI * 2 + 0.2;
  const radius = size * 0.6 + (index % 3) * size * 0.055;
  const dot = Math.round(size * (0.043 + (index % 3) * 0.014));

  useEffect(() => {
    p.set(withDelay((index % 4) * 25, withTiming(1, { duration: duration.burst, easing: easing.burst })));
  }, [index, p]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.get(), [0, 0.15, 1], [0, 1, 0]),
    transform: [
      { translateX: Math.cos(angle) * radius * p.get() },
      { translateY: Math.sin(angle) * radius * p.get() },
      { scale: 0.3 + 0.7 * p.get() },
    ],
  }));

  return (
    <Animated.View
      className="absolute"
      style={[
        { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color, left: size / 2 - dot / 2, top: size / 2 - dot / 2 },
        style,
      ]}
    />
  );
}

/** 모두 완료한 순간 링 밖으로 베리 12개가 퍼진다. 동작 줄이기가 켜져 있으면 그리지 않는다 */
export function CelebrationBurst({ size }: { size: number }) {
  const reduce = useReducedMotion();
  const c = useColor();
  if (reduce) return null;
  const colors = [c.accent, c.success, c.accentInk, c.warning];
  return (
    <View
      pointerEvents="none"
      className="absolute top-0 left-0"
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: COUNT }, (_, i) => (
        <Dot key={i} index={i} size={size} color={colors[i % colors.length]} />
      ))}
    </View>
  );
}
