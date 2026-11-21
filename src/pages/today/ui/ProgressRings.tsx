import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { CelebrationBurst, duration, easing, haptic, MARK, Text, useColor } from '@/shared/ui';

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
 * allDone이면 가운데가 로고 마크로 바뀌고, 직접 끝내 완료로 바뀐 순간에만 베리가 퍼지며 성공 햅틱이 한 번 울린다
 */
export function ProgressRings({
  habitsDone,
  habitsTotal,
  tasksDone,
  tasksTotal,
  allDone,
  finishing,
  size = 140,
}: {
  habitsDone: number;
  habitsTotal: number;
  tasksDone: number;
  tasksTotal: number;
  /** 지연된 할 일까지 없어야 완료다(링 분모에는 지연이 없다) */
  allDone: boolean;
  /** 이 화면에서 마지막 하나를 직접 끝냈을 때만 축하한다(다른 탭에서 끝내거나 남은 것을 지운 경우는 조용히) */
  finishing: boolean;
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

  // 처음부터 완료 상태로 열면 조용히 마크만 보인다
  const wasDone = useRef(allDone);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    const changed = allDone && !wasDone.current;
    wasDone.current = allDone;
    if (!changed || !finishing) return;
    haptic.allDone();
    setCelebrate(true);
    const id = setTimeout(() => setCelebrate(false), duration.burst + 200);
    return () => clearTimeout(id);
  }, [allDone, finishing]);

  const markSize = Math.round(size * 0.43);

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
        {allDone ? (
          <Animated.Image
            entering={ZoomIn.springify().damping(10).stiffness(320)}
            source={MARK}
            style={{ width: markSize, height: markSize }}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <>
            <Text
              className="font-bold tracking-[-1px] tabular-nums"
              style={{ fontSize: size * 0.214, lineHeight: size * 0.243 }}
              maxFontSizeMultiplier={1.3}
            >
              {pct}
              <Text className="font-semibold tracking-normal" style={{ fontSize: size * 0.107 }}>
                %
              </Text>
            </Text>
            <Text className="text-[12px] leading-4 font-medium text-muted tabular-nums" maxFontSizeMultiplier={1.3}>
              {done}/{total}
            </Text>
          </>
        )}
      </View>

      {celebrate && <CelebrationBurst size={size} />}
    </View>
  );
}
