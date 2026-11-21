import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { FadeIn, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { type EventRow, TaskList, toggleTask } from '@/entities/event';
import { type Habit, habitDayState, HABIT_SQL, type HabitLog, habitTally, isScheduled } from '@/entities/habit';
import { useQuery } from '@/shared/db';
import { addDays, cn, type DateStr, formatKo, weekStart } from '@/shared/lib';
import { duration as motion, Icon, Text, useColor, useOverlayShadow, useTabBarInset } from '@/shared/ui';

// 달력 접기·펼치기(CalendarPage)도 같은 시간으로 패널과 함께 움직인다
export const DURATION = 250;
// 핸들을 패널 높이의 30% 넘게 내리거나 빠르게 튕기면 닫는다
const CLOSE_RATIO = 0.3;
const CLOSE_VELOCITY = 800;
const MAX_DOTS = 5;
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
  const c = useColor();
  const shadow = useOverlayShadow();
  const tabBarInset = useTabBarInset();
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));

  // 그날 습관 수는 오늘 링과 같은 규칙(habitTally): 주 N회 습관이 그 주 목표를 이미 채웠고 그날 안 했으면 뺀다
  const ws = weekStart(date);
  const habits = useQuery<Habit>(HABIT_SQL.allHabits).filter((h) => isScheduled(h, date));
  const logs = useQuery<HabitLog>(HABIT_SQL.logsBetween, [ws, addDays(ws, 6)]);
  const days = habits.map((h) => ({
    doneToday: logs.some((l) => l.habit_id === h.id && l.log_date === date),
    weekly:
      h.frequency_type === 'weekly' ? { done: logs.filter((l) => l.habit_id === h.id).length, target: h.weekly_target ?? 1 } : undefined,
  }));
  const tally = habitTally(days);
  const counted = days.filter((d) => habitDayState(d) !== 'weekDone');
  const future = date > today;
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
            {tally.total > 0 &&
              (future ? (
                // 미래: 예정 수만
                <View className="h-[26px] flex-row items-center gap-1.5 rounded-full bg-default px-2.5">
                  <Icon name="habits" size={13} tint={c.accentInk} filled />
                  <Text className="text-[13px] font-semibold">습관 {tally.total}개 예정</Text>
                </View>
              ) : (
                // 지난 날·오늘: '습관 ●●○○ 2/4'. 점은 5개까지
                <View
                  accessible
                  accessibilityLabel={`습관 ${tally.total}개 중 ${tally.done}개 완료`}
                  className="h-[26px] flex-row items-center gap-1.5 rounded-full bg-default px-2.5"
                >
                  <Text className="text-[13px] font-semibold">습관</Text>
                  <View className="flex-row gap-[3px]">
                    {[...counted]
                      .sort((a, b) => Number(b.doneToday) - Number(a.doneToday))
                      .slice(0, MAX_DOTS)
                      .map((d, i) => (
                        <View key={i} className={cn('h-2 w-2 rounded-full', d.doneToday ? 'bg-accent' : 'bg-accent-soft')} />
                      ))}
                  </View>
                  <Text className="text-[13px] font-semibold tabular-nums">
                    {tally.done}/{tally.total}
                  </Text>
                </View>
              ))}
          </View>
        </View>
      </GestureDetector>
      {/* 패널이 이미 흰 면이라 카드 없이 행을 바로 그린다 */}
      <ScrollView className="flex-1" contentContainerClassName="px-5" contentContainerStyle={{ paddingBottom: tabBarInset }}>
        <Animated.View key={date} entering={SWAP}>
          <TaskList
            flat
            context="sameDay"
            tasks={tasks}
            today={today}
            onToggle={(e) => toggleTask(db, e, today)}
            onOpen={(e) => router.push({ pathname: '/event', params: { id: e.id } })}
            empty="이날은 할 일이 없어요."
          />
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}
