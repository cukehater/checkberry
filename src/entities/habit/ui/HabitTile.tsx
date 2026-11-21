import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CheckGlyph, duration, haptic, Icon, spring, Text, useColor, usePressScale } from '@/shared/ui';
import { HabitIcon } from './HabitIcon';

/**
 * 오늘 화면 2열 습관 타일(높이 60, 모서리 18).
 * 아직: 옅은 강조색 원 + 아이콘 / 완료: 강조색 원이 튀며 차고 체크가 그려진다. 이름은 한 줄 말줄임이라 길어도 높이가 변하지 않는다
 */
export function HabitTile({
  name,
  iconKey,
  done,
  meta,
  metaStrong = false,
  onToggle,
  onLongPress,
}: {
  name: string;
  iconKey: string;
  done: boolean;
  /** 예: "12일 연속", "이번 주 2/3" */
  meta?: string;
  /** 연속 3일 이상, 주간 목표 달성. 불꽃과 초록 글자로 강조한다 */
  metaStrong?: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
}) {
  const c = useColor();
  const reduce = useReducedMotion();
  const press = usePressScale();

  const fill = useSharedValue(done ? 1 : 0);
  const pop = useSharedValue(1);
  const bump = useSharedValue(1);
  // 처음 그릴 때는 튀지 않는다. 직접 체크한 뒤에만 튄다
  const mounted = useRef(false);

  useEffect(() => {
    fill.set(reduce ? (done ? 1 : 0) : withTiming(done ? 1 : 0, { duration: duration.color }));
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (done && !reduce) {
      pop.set(withSequence(withTiming(0.86, { duration: 80 }), withSpring(1, spring.pop)));
      bump.set(withSequence(withTiming(1.2, { duration: 120 }), withSpring(1, spring.pop)));
    }
  }, [done, reduce, fill, pop, bump]);

  const circleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(fill.get(), [0, 1], [c.accentSoft, c.accent]),
    transform: [{ scale: pop.get() }],
  }));
  const metaStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.get() }] }));

  return (
    <Pressable
      onPress={() => {
        if (!done) haptic.check();
        onToggle();
      }}
      onLongPress={onLongPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      className="min-w-0 flex-1"
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${name}, 오늘 ${done ? '완료' : '미완료'}${meta ? `, ${meta}` : ''}`}
      accessibilityHint={onLongPress ? '길게 누르면 편집해요' : undefined}
    >
      <Animated.View className="h-[60px] flex-row items-center gap-2.5 rounded-[18px] bg-surface-secondary px-2.5" style={press.style}>
        <Animated.View className="h-10 w-10 items-center justify-center rounded-full" style={circleStyle}>
          {done ? <CheckGlyph size={20} color={c.onAccent} /> : <HabitIcon iconKey={iconKey} size={18} tint={c.accentInk} />}
        </Animated.View>
        <View className="min-w-0 flex-1 gap-px">
          <Text className="text-[15px] leading-5 font-medium" numberOfLines={1}>
            {name}
          </Text>
          {meta && (
            <Animated.View className="min-h-4 flex-row items-center gap-[3px]" style={[{ transformOrigin: 'left center' }, metaStyle]}>
              {metaStrong && <Icon name="habits" size={11} tint={c.successInk} />}
              <Text
                className={
                  metaStrong
                    ? 'text-[12px] leading-4 font-semibold text-success-soft-foreground tabular-nums'
                    : 'text-[12px] leading-4 text-muted tabular-nums'
                }
                numberOfLines={1}
              >
                {meta}
              </Text>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}
