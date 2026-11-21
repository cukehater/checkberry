import LottieView from 'lottie-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { type SharedValue, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { duration, easing, RollingNumber, Text, useColor } from '@/shared/ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// 모두 끝냈을 때 가운데 베리. 안쪽 링 빈 원(지름 2 × (38 − 13/2) = 63) 안에 들어가는 크기
const DONE_BERRY = require('../../../../assets/lottie/done-berry.json');
const DONE_SIZE = 58;

const VIEW = 128;
const CENTER = 64;
const STROKE = 13;
const R_OUT = 56; // 습관
const R_IN = 38; // 할 일
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
 * 오늘 진행률 이중 링(128). 바깥은 습관(베리), 안쪽은 오늘 할 일(잎 초록), 가운데는 합친 완료율.
 * allDone이면 가운데 숫자 대신 베리 Lottie가 반복한다(동작 줄이기면 정지)
 */
export function ProgressRings({
  habitsDone,
  habitsTotal,
  tasksDone,
  tasksTotal,
  allDone,
  size = 128,
}: {
  habitsDone: number;
  habitsTotal: number;
  tasksDone: number;
  tasksTotal: number;
  allDone: boolean;
  size?: number;
}) {
  const c = useColor();
  const reduce = useReducedMotion();
  const total = habitsTotal + tasksTotal;
  const done = habitsDone + tasksDone;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const h = useAnimatedRatio(habitsTotal ? habitsDone / habitsTotal : 0);
  const t = useAnimatedRatio(tasksTotal ? tasksDone / tasksTotal : 0);
  // 0 근처에서는 둥근 선끝이 점으로 남았다가 툭 사라지지 않게, 마지막 4% 동안 서서히 흐려진다
  const outerProps = useAnimatedProps(() => ({ strokeDashoffset: C_OUT * (1 - h.get()), strokeOpacity: Math.min(1, h.get() / 0.04) }));
  const innerProps = useAnimatedProps(() => ({ strokeDashoffset: C_IN * (1 - t.get()), strokeOpacity: Math.min(1, t.get() / 0.04) }));

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`오늘 ${total}개 중 ${done}개 완료. 습관 ${habitsTotal}개 중 ${habitsDone}개, 할 일 ${tasksTotal}개 중 ${tasksDone}개`}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
        <Circle cx={CENTER} cy={CENTER} r={R_OUT} fill="none" stroke={c.ringHabitSoft} strokeWidth={STROKE} />
        <Circle cx={CENTER} cy={CENTER} r={R_IN} fill="none" stroke={c.ringTaskSoft} strokeWidth={STROKE} />
        <G rotation={-90} origin={`${CENTER}, ${CENTER}`}>
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={R_OUT}
            fill="none"
            stroke={c.ringHabit}
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
            stroke={c.ringTask}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${C_IN} ${C_IN}`}
            animatedProps={innerProps}
          />
        </G>
      </Svg>

      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        {allDone ? (
          <LottieView
            key={String(reduce)}
            source={DONE_BERRY}
            autoPlay={!reduce}
            loop={!reduce}
            style={{ width: DONE_SIZE, height: DONE_SIZE }}
          />
        ) : (
          // 개수는 옆 범례가 보여 주므로 가운데는 퍼센트만. 바뀌면 숫자가 굴러간다
          <View className="flex-row items-end">
            <RollingNumber value={pct} className="text-[30px] leading-[34px] font-bold tracking-[-0.5px]" />
            <Text className="mb-[3px] text-[15px] font-semibold" maxFontSizeMultiplier={1.3}>
              %
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
