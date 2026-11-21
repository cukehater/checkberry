import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { type SharedValue, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { duration, easing, RollingNumber, Text, useColor } from '@/shared/ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const VIEW = 140;
const CENTER = 70;
const STROKE = 14;
const R_OUT = 63; // 습관
const R_IN = 46; // 할 일
const C_OUT = 2 * Math.PI * R_OUT;
const C_IN = 2 * Math.PI * R_IN;

function useAnimatedRatio(target: number): SharedValue<number> {
  const reduce = useReducedMotion();
  const v = useSharedValue(target);
  useEffect(() => {
    v.set(reduce ? target : withTiming(target, { duration: duration.ring, easing: easing.standard }));
  }, [target, reduce, v]);
  return v;
}

/**
 * 오늘 진행률 이중 링. 바깥은 습관(강조색), 안쪽은 오늘 할 일(잎 초록), 가운데는 합친 완료율.
 * 모두 완료 연출은 TodayProgressCard가 카드 전체로 한다
 */
export function ProgressRings({
  habitsDone,
  habitsTotal,
  tasksDone,
  tasksTotal,
  size = 140,
}: {
  habitsDone: number;
  habitsTotal: number;
  tasksDone: number;
  tasksTotal: number;
  size?: number;
}) {
  const c = useColor();
  const total = habitsTotal + tasksTotal;
  const done = habitsDone + tasksDone;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const h = useAnimatedRatio(habitsTotal ? habitsDone / habitsTotal : 0);
  const t = useAnimatedRatio(tasksTotal ? tasksDone / tasksTotal : 0);
  // 0일 때 둥근 선끝이 점으로 남지 않게 숨긴다
  const outerProps = useAnimatedProps(() => ({ strokeDashoffset: C_OUT * (1 - h.get()), strokeOpacity: h.get() > 0.001 ? 1 : 0 }));
  const innerProps = useAnimatedProps(() => ({ strokeDashoffset: C_IN * (1 - t.get()), strokeOpacity: t.get() > 0.001 ? 1 : 0 }));

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`오늘 ${total}개 중 ${done}개 완료. 습관 ${habitsTotal}개 중 ${habitsDone}개, 할 일 ${tasksTotal}개 중 ${tasksDone}개`}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
        <Circle cx={CENTER} cy={CENTER} r={R_OUT} fill="none" stroke={c.accentSoft} strokeWidth={STROKE} />
        <Circle cx={CENTER} cy={CENTER} r={R_IN} fill="none" stroke={c.successSoft} strokeWidth={STROKE} />
        <G rotation={-90} origin={`${CENTER}, ${CENTER}`}>
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={R_OUT}
            fill="none"
            stroke={c.accent}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${C_OUT} ${C_OUT}`}
            animatedProps={outerProps}
          />
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={R_IN}
            fill="none"
            stroke={c.success}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${C_IN} ${C_IN}`}
            animatedProps={innerProps}
          />
        </G>
      </Svg>

      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        {/* 개수는 옆 범례가 보여 주므로 가운데는 퍼센트만. 바뀌면 숫자가 굴러간다(글자 크기는 기본 size 140 기준) */}
        <View className="flex-row items-end">
          <RollingNumber value={pct} className="text-[30px] leading-[34px] font-bold tracking-[-1px]" />
          <Text className="mb-[3px] font-semibold" style={{ fontSize: size * 0.107 }} maxFontSizeMultiplier={1.3}>
            %
          </Text>
        </View>
      </View>
    </View>
  );
}
