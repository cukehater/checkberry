import { Surface } from 'heroui-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CelebrationBurst, duration, easing, haptic, RollingNumber, spring, Text, useCardStyle, useColor } from '@/shared/ui';
import { ProgressRings } from './ProgressRings';

/** 베리 파편이 퍼지는 판 크기. 카드 위아래 밖까지 나간다 */
const BURST = 240;

/** 범례 한 줄: 점 + 이름 + 굴러가는 n/m, 아래에 링과 같은 색의 6pt 막대 */
function LegendRow({ color, soft, label, done, total }: { color: string; soft: string; label: string; done: number; total: number }) {
  const reduce = useReducedMotion();
  const ratio = total ? done / total : 0;
  const w = useSharedValue(ratio);
  useEffect(() => {
    w.set(reduce ? ratio : withTiming(ratio, { duration: duration.ring, easing: easing.standard }));
  }, [ratio, reduce, w]);
  const bar = useAnimatedStyle(() => ({ width: `${w.get() * 100}%` }));
  return (
    <View className="gap-[7px]">
      <View className="flex-row items-center gap-2">
        <View className="h-[9px] w-[9px] rounded-full" style={{ backgroundColor: color }} />
        <Text className="flex-1 text-[14px] leading-5 font-medium text-muted">{label}</Text>
        <View className="flex-row items-end">
          <RollingNumber value={done} className="text-[16px] leading-5 font-bold" />
          <Text className="text-[16px] leading-5 font-medium text-muted tabular-nums">/{total}</Text>
        </View>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: soft }}>
        <Animated.View className="h-full rounded-full" style={[{ backgroundColor: color }, bar]} />
      </View>
    </View>
  );
}

/**
 * 오늘 화면 맨 위 카드: 진행을 말하는 제목(18 SemiBold) + 이중 링(128) + 범례.
 * 모두 끝내면 링 가운데가 베리 Lottie로 바뀐다. 이 화면에서 마지막 하나를 직접 끝낸 순간에만 카드가 튀며 베리가 퍼진다
 */
export function TodayProgressCard({
  title,
  habitsDone,
  habitsTotal,
  tasksDone,
  tasksTotal,
  allDone,
  finishing,
}: {
  title: string;
  habitsDone: number;
  habitsTotal: number;
  tasksDone: number;
  tasksTotal: number;
  allDone: boolean;
  finishing: boolean;
}) {
  const c = useColor();
  const card = useCardStyle();
  const reduce = useReducedMotion();
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
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  return (
    // 파편이 카드 밖 위·아래 카드 위로 보이게 z-10
    <Animated.View className="z-10" style={cardStyle}>
      {/* 라이트는 HeroUI Surface 그림자, 다크는 다른 카드와 같은 1pt 윤곽선 */}
      <Surface variant="default" className="gap-3 rounded-3xl p-4" style={c.raised ? undefined : card}>
        <Text
          className="text-[18px] leading-6 font-semibold"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <View className="flex-row items-center gap-5">
          <ProgressRings
            habitsDone={habitsDone}
            habitsTotal={habitsTotal}
            tasksDone={tasksDone}
            tasksTotal={tasksTotal}
            allDone={allDone}
          />
          <View className="min-w-0 flex-1 gap-4">
            <LegendRow color={c.ringHabit} soft={c.ringHabitSoft} label="습관" done={habitsDone} total={habitsTotal} />
            <LegendRow color={c.ringTask} soft={c.ringTaskSoft} label="할 일" done={tasksDone} total={tasksTotal} />
          </View>
        </View>
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
