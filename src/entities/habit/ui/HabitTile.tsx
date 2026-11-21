import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CheckGlyph, duration, easing, haptic, spring, Text, useColor, usePressScale } from '@/shared/ui';
import { HabitIcon } from './HabitIcon';
import { StreakBadge } from './StreakBadge';

const SHARDS = 6;
const SHARD_MS = 260;

/** 체크한 원 둘레로 베리 파편 6개가 짧게 퍼진다 */
function Shard({ index, color }: { index: number; color: string }) {
  const p = useSharedValue(0);
  const angle = (index / SHARDS) * Math.PI * 2 - Math.PI / 2;
  useEffect(() => {
    p.set(withTiming(1, { duration: SHARD_MS, easing: easing.burst }));
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.get(), [0, 0.2, 1], [0, 1, 0]),
    transform: [
      { translateX: Math.cos(angle) * (14 + 14 * p.get()) },
      { translateY: Math.sin(angle) * (14 + 14 * p.get()) },
      { scale: 1 - 0.5 * p.get() },
    ],
  }));
  return <Animated.View className="absolute top-[17px] left-[17px] h-1.5 w-1.5 rounded-full" style={[{ backgroundColor: color }, style]} />;
}

/**
 * 오늘 화면 습관 타일. 한 줄에 하나씩 전체 폭(최소 높이 60, 모서리 18).
 * [원][이름 / 주 N회 점][연속 불꽃 + 숫자]. 아직: 옅은 강조색 원 + 아이콘 / 완료: 강조색 원이 튀며 차고 체크가 그려진다.
 * 이름은 두 줄까지 보여 주고 넘치면 말줄임
 */
export function HabitTile({
  name,
  iconKey,
  done,
  streak,
  week,
  onToggle,
  onLongPress,
}: {
  name: string;
  iconKey: string;
  done: boolean;
  /** 연속 기록. 오른쪽 고정 폭 칸에 불꽃 + 숫자. 0이면 꺼진 재로 자리를 지킨다 */
  streak?: { count: number; unit: '일' | '회' | '주' };
  /** 주 N회 습관의 이번 주 진행. 목표 칸만큼 점을 채운다 */
  week?: { done: number; target: number };
  onToggle: () => void;
  onLongPress?: () => void;
}) {
  const c = useColor();
  const reduce = useReducedMotion();
  const press = usePressScale();

  const fill = useSharedValue(done ? 1 : 0);
  const pop = useSharedValue(1);
  const bump = useSharedValue(1);
  // 체크할 때마다 새 key로 파편을 다시 그린다
  const [burst, setBurst] = useState(0);
  // 처음 그릴 때는 튀지 않는다. 직접 체크한 뒤에만 튄다
  const mounted = useRef(false);

  useEffect(() => {
    fill.set(reduce ? (done ? 1 : 0) : withTiming(done ? 1 : 0, { duration: duration.color }));
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (done && !reduce) {
      // 0.8배로 눌렸다가 1.12배로 튀고 제자리
      pop.set(
        withSequence(withTiming(0.8, { duration: 70 }), withTiming(1.12, { duration: 110, easing: easing.pop }), withSpring(1, spring.pop)),
      );
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
        if (done) haptic.uncheck();
        else {
          haptic.checkStrong();
          if (!reduce) setBurst((k) => k + 1);
        }
        onToggle();
      }}
      onLongPress={onLongPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${name}, 오늘 ${done ? '완료' : '미완료'}${streak?.count ? `, ${streak.count}${streak.unit} 연속` : ''}${week ? `, 이번 주 ${week.done}/${week.target}` : ''}`}
      accessibilityHint={onLongPress ? '길게 누르면 편집해요' : undefined}
    >
      <Animated.View
        className="min-h-[60px] flex-row items-center gap-3 rounded-[18px] bg-surface-secondary px-2.5 py-2.5"
        style={press.style}
      >
        <View>
          <Animated.View className="h-10 w-10 items-center justify-center rounded-full" style={circleStyle}>
            {done ? <CheckGlyph size={20} color={c.onAccent} /> : <HabitIcon iconKey={iconKey} size={18} tint={c.accentInk} />}
          </Animated.View>
          {burst > 0 && (
            <View key={burst} pointerEvents="none" className="absolute inset-0" accessibilityElementsHidden>
              {Array.from({ length: SHARDS }, (_, i) => (
                <Shard key={i} index={i} color={c.accent} />
              ))}
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1 gap-px">
          <Text className="text-[15px] leading-5 font-medium" numberOfLines={2}>
            {name}
          </Text>
          {week && (
            // 목표 칸 수만큼 점, 채운 만큼 잎 초록
            <Animated.View className="min-h-4 flex-row items-center gap-[3px]" style={[{ transformOrigin: 'left center' }, metaStyle]}>
              {Array.from({ length: week.target }, (_, i) => (
                <View key={i} className={i < week.done ? 'h-1.5 w-1.5 rounded-full bg-success' : 'h-1.5 w-1.5 rounded-full bg-track'} />
              ))}
            </Animated.View>
          )}
        </View>
        {streak && (
          <Animated.View style={metaStyle}>
            <StreakBadge count={streak.count} unit={streak.unit} />
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}
