import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { FadeIn, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { type EventRow, TaskList, toggleTask } from '@/entities/event';
import { type Habit, HABIT_SQL, type HabitLog, isScheduled } from '@/entities/habit';
import { useQuery } from '@/shared/db';
import { cn, type DateStr, formatKo } from '@/shared/lib';
import { duration as motion, Text, useOverlayShadow, useTabBarInset } from '@/shared/ui';

// 달력 접기·펼치기(CalendarPage)도 같은 시간으로 패널과 함께 움직인다
export const DURATION = 250;
// 핸들을 패널 높이의 30% 넘게 내리거나 빠르게 튕기면 닫는다
const CLOSE_RATIO = 0.3;
const CLOSE_VELOCITY = 800;
const MAX_BERRIES = 5;
// 패널은 아래에서 올라오니 떠 있는 그림자를 위쪽으로 드리운다
const SHADOW_UP = { shadowOffset: { width: 0, height: -4 }, elevation: 8 };
// 날짜를 바꾸면 목록이 옅게 바뀐다(행 추가·삭제·이동은 TaskRow의 LinearTransition이 맡는다)
const SWAP = FadeIn.duration(motion.color).reduceMotion(ReduceMotion.System);

/**
 * 캘린더에서 고른 날의 할 일 패널. 처음 나타날 때만 아래에서 올라오고, 날짜만 바뀌면 내용만 바꾼다.
 * closing이 true가 되면 내려간 뒤 onClosed를 부른다. 핸들을 아래로 끌면 onRequestClose로 닫기를 요청한다
 */
export function DayPanel({
  date,
  today,
  tasks,
  closing,
  onRequestClose,
  onClosed,
}: {
  date: DateStr;
  today: DateStr;
  tasks: EventRow[];
  closing: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
}) {
  const db = useSQLiteContext();
  const { height: screen } = useWindowDimensions();
  const duration = useReducedMotion() ? 0 : DURATION;
  const height = useSharedValue(screen);
  const offset = useSharedValue(screen);

  // 열기(마운트)와 닫기 모두 이 효과 하나로 움직인다. 닫는 중에 다른 날짜를 누르면 closing이 false로 돌아와 다시 올라온다
  useEffect(() => {
    offset.set(
      withTiming(closing ? height.get() : 0, { duration }, (finished) => {
        if (finished && closing) scheduleOnRN(onClosed);
      }),
    );
  }, [closing, duration, height, offset, onClosed]);

  const drag = usePanGesture({
    runOnJS: true,
    onUpdate: (e) => {
      offset.set(Math.max(0, e.translationY));
    },
    onDeactivate: (e) => {
      if (e.translationY > height.get() * CLOSE_RATIO || e.velocityY > CLOSE_VELOCITY) onRequestClose();
      else offset.set(withTiming(0, { duration }));
    },
  });
  const shadow = useOverlayShadow();
  const tabBarInset = useTabBarInset();
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));

  // 습관 달성률: 그날 해야 하는 습관 중 완료한 수(주 N회 습관은 주 단위라 뺀다, 달성률 계산과 같은 규칙)
  const habits = useQuery<Habit>(HABIT_SQL.allHabits).filter((h) => h.frequency_type !== 'weekly' && isScheduled(h, date));
  const logs = useQuery<HabitLog>(HABIT_SQL.logsBetween, [date, date]);
  const done = habits.filter((h) => logs.some((l) => l.habit_id === h.id)).length;
  const label = date === today ? `오늘 · ${formatKo(date, today)}` : formatKo(date, today);

  return (
    <Animated.View
      onLayout={(e) => {
        height.set(e.nativeEvent.layout.height);
      }}
      className="flex-1 rounded-t-[32px] bg-card"
      style={[shadow, SHADOW_UP, style]}
      role="region"
      accessibilityLabel={`${formatKo(date, today)} 할 일`}
    >
      {/* 머리(핸들·날짜·습관 링)는 고정하고, 끌어서 닫기도 여기서만 받는다. 목록의 세로 제스처는 스크롤로 쓴다 */}
      <GestureDetector gesture={drag}>
        <View className="px-5 pb-2">
          <View className="h-[22px] items-center justify-center">
            <View className="h-[5px] w-9 rounded-full bg-track" />
          </View>
          <View className="min-h-9 flex-row items-center gap-3 pt-1">
            <Text className="flex-1 text-[18px] leading-6 font-semibold tracking-[-0.2px]" accessibilityRole="header">
              {label}
            </Text>
            {habits.length > 0 && (
              // 예정 습관 하나에 베리 하나: 한 것은 채우고 안 한 것은 옅게(오늘 탭 습관 원과 같은 말). 점은 5개까지, 전체 수는 옆 숫자가 말한다
              <View accessible accessibilityLabel={`습관 ${habits.length}개 중 ${done}개 완료`} className="flex-row items-center gap-1">
                {habits.slice(0, MAX_BERRIES).map((h) => (
                  <View
                    key={h.id}
                    className={cn('h-2.5 w-2.5 rounded-full', logs.some((l) => l.habit_id === h.id) ? 'bg-accent' : 'bg-accent-soft')}
                  />
                ))}
                <Text className="ml-1.5 text-[18px] leading-6 font-semibold tracking-[-0.2px] tabular-nums">
                  {done}
                  <Text className="text-muted">/{habits.length}</Text>
                </Text>
              </View>
            )}
          </View>
        </View>
      </GestureDetector>
      {/* 패널이 이미 흰 면이라 카드 없이 행을 바로 그린다 */}
      <ScrollView className="flex-1" contentContainerClassName="px-5" contentContainerStyle={{ paddingBottom: tabBarInset }}>
        <Animated.View key={date} entering={SWAP}>
          <TaskList flat tasks={tasks} today={today} onToggle={(e) => toggleTask(db, e, today)} empty="이날은 할 일이 없어요." />
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}
