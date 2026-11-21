import { Surface } from 'heroui-native';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CelebrationBurst, duration, easing, haptic, MARK, RollingNumber, spring, Text, useColor } from '@/shared/ui';
import { ProgressRings } from './ProgressRings';

/** 완료 카드로 차오르고 돌아오는 시간 */
const FILL_MS = 360;
/** 베리 파편이 퍼지는 판 크기. 카드(약 220pt) 위아래 밖까지 나간다 */
const BURST = 240;

/** 범례 한 줄: 점 + 이름 + 굴러가는 n/m, 아래에 링과 같은 색의 얇은 막대 */
function LegendRow({ color, soft, label, done, total }: { color: string; soft: string; label: string; done: number; total: number }) {
  const reduce = useReducedMotion();
  const ratio = total ? done / total : 0;
  const w = useSharedValue(ratio);
  useEffect(() => {
    w.set(reduce ? ratio : withTiming(ratio, { duration: duration.ring, easing: easing.standard }));
  }, [ratio, reduce, w]);
  const bar = useAnimatedStyle(() => ({ width: `${w.get() * 100}%` }));
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-2">
        <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <Text className="flex-1 text-[14px] leading-5 text-muted">{label}</Text>
        <View className="flex-row items-end">
          <RollingNumber value={done} className="text-[15px] leading-5 font-semibold" />
          <Text className="text-[15px] leading-5 font-medium text-muted tabular-nums">/{total}</Text>
        </View>
      </View>
      <View className="h-1 overflow-hidden rounded-full" style={{ backgroundColor: soft }}>
        <Animated.View className="h-full rounded-full" style={[{ backgroundColor: color }, bar]} />
      </View>
    </View>
  );
}

/**
 * 오늘 화면 맨 위 카드: 한 줄 인사 배너 + 이중 링 + 범례. children은 범례 위(지연 로젠지 등).
 * 모두 완료면 카드 전체가 베리 채움 완료 카드로 바뀐다. 직접 마지막 하나를 끝낸 순간에만 튀며 베리가 퍼지고,
 * 처음부터 완료거나 다른 데서 완료되면 조용히 바뀐다. 완료가 풀리면 원래 카드로 돌아온다
 */
export function TodayProgressCard({
  greeting,
  habitsDone,
  habitsTotal,
  tasksDone,
  tasksTotal,
  allDone,
  finishing,
  children,
}: {
  greeting: string;
  habitsDone: number;
  habitsTotal: number;
  tasksDone: number;
  tasksTotal: number;
  allDone: boolean;
  finishing: boolean;
  children?: React.ReactNode;
}) {
  const c = useColor();
  const reduce = useReducedMotion();
  // 0 진행 카드 ~ 1 완료 카드. 바뀌는 동안 두 층을 겹쳐 그려 카드 높이가 그대로다
  const p = useSharedValue(allDone ? 1 : 0);
  const pop = useSharedValue(1);
  // 완료로 바뀐 순간을 렌더 중에 잡는다(이 화면에서 직접 끝냈을 때만 축하 회차를 올린다)
  const [prevDone, setPrevDone] = useState(allDone);
  const [burst, setBurst] = useState(0);
  if (allDone !== prevDone) {
    setPrevDone(allDone);
    if (allDone && finishing) setBurst(burst + 1);
  }
  useEffect(() => {
    if (!burst) return;
    haptic.allDoneStrong();
    if (!reduce) pop.set(withSequence(withTiming(0.96, { duration: 90 }), withSpring(1, spring.pop)));
  }, [burst, reduce, pop]);
  useEffect(() => {
    const to = prevDone ? 1 : 0;
    p.set(reduce ? to : withTiming(to, { duration: FILL_MS, easing: easing.standard }));
  }, [prevDone, reduce, p]);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const fillStyle = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ scale: interpolate(p.get(), [0, 1], [0.92, 1]) }],
  }));
  const progressStyle = useAnimatedStyle(() => ({ opacity: interpolate(p.get(), [0, 0.5], [1, 0], Extrapolation.CLAMP) }));
  const doneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.get(), [0.4, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(p.get(), [0, 1], [8, 0]) }],
  }));
  const summary = [habitsTotal && `습관 ${habitsDone}`, tasksTotal && `할 일 ${tasksDone}`].filter(Boolean).join(' · ');

  return (
    // 파편이 카드 밖 위·아래 카드 위로 보이게 z-10
    <Animated.View className="z-10" style={cardStyle}>
      <Surface variant="default" className="rounded-3xl p-5">
        <Animated.View pointerEvents="none" className="absolute inset-0 rounded-3xl bg-accent" style={fillStyle} />
        <Animated.View
          className="gap-4"
          style={progressStyle}
          accessibilityElementsHidden={allDone}
          importantForAccessibility={allDone ? 'no-hide-descendants' : 'auto'}
        >
          <View className="flex-row items-center gap-2">
            <Image source={MARK} style={{ width: 20, height: 20 }} accessibilityIgnoresInvertColors />
            <Text
              className="min-w-0 flex-1 text-[16px] leading-[22px] font-semibold tracking-[-0.2px]"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              accessibilityRole="header"
            >
              {greeting}
            </Text>
          </View>
          <View className="flex-row items-center gap-5">
            <ProgressRings habitsDone={habitsDone} habitsTotal={habitsTotal} tasksDone={tasksDone} tasksTotal={tasksTotal} />
            <View className="min-w-0 flex-1 gap-3">
              {children}
              <LegendRow color={c.accent} soft={c.accentSoft} label="습관" done={habitsDone} total={habitsTotal} />
              <LegendRow color={c.success} soft={c.successSoft} label="할 일" done={tasksDone} total={tasksTotal} />
            </View>
          </View>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
          style={doneStyle}
          accessible={allDone}
          accessibilityElementsHidden={!allDone}
          importantForAccessibility={allDone ? 'yes' : 'no-hide-descendants'}
          accessibilityRole="header"
          accessibilityLabel={`${greeting}. ${summary}`}
        >
          <View className="h-24 w-24 items-center justify-center rounded-full" style={{ backgroundColor: c.onAccent }}>
            <Image source={MARK} style={{ width: 64, height: 64 }} accessibilityIgnoresInvertColors />
          </View>
          {/* 한 줄. 좁은 화면·큰 글자에서는 줄바꿈 대신 글자를 줄인다 */}
          <Text
            className="mt-3 px-5 text-center text-[24px] leading-[30px] font-bold tracking-[-0.5px] text-accent-foreground"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            maxFontSizeMultiplier={1.3}
          >
            체크베리를 모두 수확했어요
          </Text>
          {/* 70% 흰 글자는 베리 위 대비가 2.9:1이라 흰 글자 그대로(4.70:1) 두고 굵기·크기로 위계를 낮춘다 */}
          <Text className="mt-0.5 text-[15px] leading-5 font-medium text-accent-foreground" maxFontSizeMultiplier={1.3}>
            {summary}
          </Text>
        </Animated.View>
      </Surface>
      {burst > 0 && (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View style={{ width: BURST, height: BURST }}>
            <CelebrationBurst key={burst} size={BURST} />
          </View>
        </View>
      )}
    </Animated.View>
  );
}
