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
import { cn } from '@/shared/lib';
import { type A11yAction, a11yActionProps, CheckGlyph, duration, easing, haptic, spring, Text, useColor, usePressScale } from '@/shared/ui';
import type { StreakUnit } from '../model/stage';
import type { HabitDayState } from '../model/today';
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
  return <Animated.View className="absolute top-4 left-4 h-1.5 w-1.5 rounded-full" style={[{ backgroundColor: color }, style]} />;
}

/**
 * 오늘 화면 습관 타일. 한 줄에 하나씩 전체 폭(58pt, 모서리 18). [원 38][이름 / 캡션][연속 메달 배지].
 * todo: 베리 soft 원 + 아이콘 / done: 베리 원이 튀며 차고 흰 체크가 그려진다 /
 * weekDone: 주 N회 목표를 이번 주에 채운 날(오늘 분모에서 빠짐). 베리 soft 원 + 1.5pt 베리 테두리 + 베리 ink 체크
 */
export function HabitTile({
  name,
  iconKey,
  state,
  caption,
  streak,
  accessory,
  onToggle,
  actions = [],
}: {
  name: string;
  iconKey: string;
  state: HabitDayState;
  /** 이름 아래 13pt 글자. 주 N회 습관의 '이번 주 2/3' */
  caption?: string;
  /** 연속 기록 메달 배지. 0이면 그리지 않는다 */
  streak?: { count: number; unit: StreakUnit };
  /** 배지 자리에 대신 둘 요소(습관 추가 시트 미리보기의 안내 글자) */
  accessory?: React.ReactNode;
  onToggle?: () => void;
  /** VoiceOver 동작(편집, 순서 옮기기). 화면에서는 길게 눌러 끌거나 놓아서 한다(SortableItem) */
  actions?: A11yAction[];
}) {
  const done = state === 'done';
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
    // 아직: 습관 원 색, 완료: 베리. 주간 목표 달성(weekDone)은 베리 soft + 베리 테두리로 달성을 말한다
    backgroundColor: interpolateColor(fill.get(), [0, 1], [state === 'weekDone' ? c.accentSoft : c.habitBg, c.accent]),
    transform: [{ scale: pop.get() }],
  }));
  const metaStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.get() }] }));

  return (
    <Pressable
      onPress={
        onToggle &&
        (() => {
          if (done) haptic.uncheck();
          else {
            haptic.checkStrong();
            if (!reduce) setBurst((k) => k + 1);
          }
          onToggle();
        })
      }
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: state !== 'todo', disabled: !onToggle }}
      accessibilityLabel={`${name}, 오늘 ${done ? '완료' : state === 'weekDone' ? '이번 주 목표 달성' : '미완료'}${streak?.count ? `, ${streak.count}${streak.unit} 연속` : ''}${caption ? `, ${caption}` : ''}`}
      {...a11yActionProps(actions)}
    >
      <Animated.View
        className="min-h-[58px] flex-row items-center gap-3 rounded-[18px] bg-surface-secondary px-2.5 py-2"
        style={press.style}
      >
        <View>
          <Animated.View
            className={cn(
              'h-[38px] w-[38px] items-center justify-center rounded-full',
              state === 'weekDone' && 'border-[1.5px] border-accent',
            )}
            style={circleStyle}
          >
            {done ? (
              <CheckGlyph size={18} color={c.onAccent} />
            ) : state === 'weekDone' ? (
              <CheckGlyph size={18} color={c.accentInk} />
            ) : (
              <HabitIcon iconKey={iconKey} size={18} tint={c.habitInk} />
            )}
          </Animated.View>
          {burst > 0 && (
            <View key={burst} pointerEvents="none" className="absolute inset-0" accessibilityElementsHidden>
              {Array.from({ length: SHARDS }, (_, i) => (
                <Shard key={i} index={i} color={c.accent} />
              ))}
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-[16px] leading-[22px] font-medium" numberOfLines={1}>
            {name}
          </Text>
          {caption && <Text className="text-[13px] leading-[18px] font-medium text-muted">{caption}</Text>}
        </View>
        {accessory ??
          (streak && (
            <Animated.View style={metaStyle}>
              <StreakBadge count={streak.count} unit={streak.unit} playKey={burst} />
            </Animated.View>
          ))}
      </Animated.View>
    </Pressable>
  );
}
