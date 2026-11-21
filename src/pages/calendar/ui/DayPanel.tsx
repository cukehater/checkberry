import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { type EventRow, TaskList, toggleTask } from '@/entities/event';
import { type Habit, HABIT_SQL, type HabitLog, isScheduled } from '@/entities/habit';
import { useQuery } from '@/shared/db';
import { type DateStr, formatKo } from '@/shared/lib';
import { Lozenge, Text } from '@/shared/ui';

// 달력 접기·펼치기(CalendarPage)도 같은 시간으로 패널과 함께 움직인다
export const DURATION = 250;
// 핸들을 패널 높이의 30% 넘게 내리거나 빠르게 튕기면 닫는다
const CLOSE_RATIO = 0.3;
const CLOSE_VELOCITY = 800;
// 그림자는 className으로 iOS·Android 값을 함께 정할 수 없어 style로 준다
const SHADOW = { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 8 };

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
      className="flex-1 rounded-t-3xl bg-background"
      style={[SHADOW, style]}
      role="region"
      accessibilityLabel={`${formatKo(date, today)} 할 일`}
    >
      {/* 머리(핸들·날짜·습관 링)는 고정하고, 끌어서 닫기도 여기서만 받는다. 목록의 세로 제스처는 스크롤로 쓴다 */}
      <GestureDetector gesture={drag}>
        <View className="px-5 pt-2 pb-3">
          <View className="mb-2 h-1.5 w-10 self-center rounded-full bg-separator" />
          <View className="min-h-9 flex-row items-center gap-3">
            <Text className="flex-1 text-[19px] font-bold" accessibilityRole="header">
              {label}
            </Text>
            {habits.length > 0 && (
              <View accessible accessibilityLabel={`습관 ${habits.length}개 중 ${done}개 완료`}>
                <Lozenge label={`습관 ${done}/${habits.length}`} tone={done === habits.length ? 'success' : 'default'} />
              </View>
            )}
          </View>
        </View>
      </GestureDetector>
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8">
        <TaskList tasks={tasks} today={today} onToggle={(e) => toggleTask(db, e, today)} empty="이날은 할 일이 없어요." />
      </ScrollView>
    </Animated.View>
  );
}
