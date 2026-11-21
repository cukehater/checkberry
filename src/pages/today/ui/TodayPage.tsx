import { Button } from 'heroui-native';
import { router, useScrollToTop } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import {
  compareTasks,
  EVENT_SQL,
  type EventRow,
  matchesFilter,
  moveToToday,
  saveEvent,
  TaskList,
  toggleTask,
  useHighlight,
} from '@/entities/event';
import {
  type Habit,
  HABIT_SQL,
  type HabitLog,
  HabitTile,
  isMilestone,
  isScheduled,
  streak,
  STREAK_LOOKBACK_DAYS,
  StreakToastIcon,
  toggleHabitLog,
  weekCount,
} from '@/entities/habit';
import { useQuery } from '@/shared/db';
import { addDays, toDateStr, useSettledOrder, useToday, weekday, WEEKDAY_KO } from '@/shared/lib';
import { haptic, ListGroup, ListHeader, Lozenge, showToast, Text, useColor, useTabBarInset } from '@/shared/ui';
import { QuickAddRow } from './QuickAddRow';
import { TodayProgressCard } from './TodayProgressCard';

const taskId = (e: EventRow) => e.id;
const taskDone = (e: EventRow) => !!e.completed_at;
const unitOf = (h: Habit) => (h.frequency_type === 'weekly' ? '주' : h.frequency_type === 'weekdays' ? '회' : '일');

// S01 오늘. 노션 대시보드 'JUST DO IT.' 대체(L-01)
// '11월 21일 토요일'
const longDate = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일 ${WEEKDAY_KO[weekday(d)]}요일`;

export function TodayPage() {
  const db = useSQLiteContext();
  const c = useColor();
  const today = useToday();
  const habits = useQuery<Habit>(HABIT_SQL.activeHabits).filter((h) => isScheduled(h, today));
  // streak 계산용 최근 1년치(3-2 규칙 6)
  const logs = useQuery<HabitLog>(HABIT_SQL.logsBetween, [addDays(today, -STREAK_LOOKBACK_DAYS), today]);
  const events = useQuery<EventRow>(EVENT_SQL.events);
  const highlight = useHighlight();
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const tabBarInset = useTabBarInset();
  // 지금 보고 있는 탭을 다시 누르면 맨 위로
  useScrollToTop(scrollRef);

  const doneByHabit = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of logs) {
      if (!m.has(l.habit_id)) m.set(l.habit_id, new Set());
      m.get(l.habit_id)!.add(l.log_date);
    }
    return m;
  }, [logs]);
  const isDone = (id: string) => !!doneByHabit.get(id)?.has(today);

  // 오늘 끝낸 할 일은 하루 동안 체크된 채로 목록에 남긴다. 잘못 체크해도 바로 되돌릴 수 있다
  const openOrDoneToday = (e: EventRow) => !e.completed_at || toDateStr(new Date(e.completed_at)) === today;
  const todays = events.filter((e) => matchesFilter(e, 'today', today)).sort(compareTasks);
  const overdue = events.filter((e) => !!e.start_date && (e.end_date ?? e.start_date) < today && openOrDoneToday(e)).sort(compareTasks);
  const overdueOpen = overdue.filter((e) => !e.completed_at);
  // 날짜 없는 할 일은 기한이 없으니 끝낼 때까지 대시보드에 둔다
  const undated = events.filter((e) => matchesFilter(e, 'nodate', today) && openOrDoneToday(e)).sort(compareTasks);
  // 방금 체크한 할 일은 0.9초 제자리에 머문 뒤 아래로 간다
  const settledTodays = useSettledOrder(todays, taskId, taskDone);
  const settledOverdue = useSettledOrder(overdue, taskId, taskDone);
  const settledUndated = useSettledOrder(undated, taskId, taskDone);

  const habitsDone = habits.filter((h) => isDone(h.id)).length;
  // FR-09: 할 일 진행률은 오늘 날짜에 걸친 할 일만 센다(지연·날짜 없는 할 일 제외)
  const tasksAll = todays.length;
  const tasksDone = todays.filter((e) => e.completed_at).length;
  const itemsDone = habitsDone + tasksDone;
  const itemsAll = habits.length + tasksAll;

  // 지연된 할 일이 남아 있으면 '모두 완료'라고 하지 않는다(진행률 분모에는 지연이 없다)
  const allDone = itemsAll > 0 && itemsDone === itemsAll && overdueOpen.length === 0;
  // 마지막 하나를 이 화면에서 직접 끝낸 순간에만 베리가 퍼진다. 화면을 열 때 이미 다 끝나 있으면 연출 없이 보여 준다
  const [finishing, setFinishing] = useState(false);
  const finishesDay = itemsDone + 1 === itemsAll && overdueOpen.length === 0;
  const check = (h: Habit) => {
    const finishes = !isDone(h.id) && finishesDay;
    setFinishing(finishes);
    if (!isDone(h.id)) {
      // 이 체크로 연속 기록이 이정표(3·7·14·30·100)에 닿으면 축하. 모두 완료와 겹치면 햅틱은 모두 완료 쪽만
      const dates = doneByHabit.get(h.id) ?? new Set<string>();
      const before = streak(h, dates, today).current;
      const after = streak(h, new Set(dates).add(today), today).current;
      if (after > before && isMilestone(after)) {
        if (!finishes) haptic.milestone();
        showToast({ message: `${h.name} ${after}${unitOf(h)} 연속이에요!`, tone: 'success', leading: <StreakToastIcon count={after} /> });
      }
    }
    toggleHabitLog(db, h.id, today);
  };
  const toggle = (e: EventRow, hold: (id: string) => void) => {
    setFinishing(!e.completed_at && !e.rrule && todays.includes(e) && finishesDay);
    hold(e.id);
    toggleTask(db, e, today);
  };
  const quickAdd = (title: string) =>
    saveEvent(db, null, {
      title,
      description: null,
      start_date: today,
      end_date: today,
      priority: 3,
      group_id: null,
      completed: false,
      rrule: null,
    });
  const edit = (id: string) => router.push({ pathname: '/habits/[id]/edit', params: { id } });
  const openEvent = (e: EventRow) => router.push({ pathname: '/event', params: { id: e.id } });
  const list = (
    settled: ReturnType<typeof useSettledOrder<EventRow>>,
    empty: string | undefined,
    header: React.ReactNode,
    footer?: React.ReactNode,
  ) => (
    <View className="mt-4">
      <TaskList
        header={header}
        footer={footer}
        tasks={settled.ordered}
        today={today}
        onToggle={(e) => toggle(e, settled.hold)}
        onOpen={openEvent}
        empty={empty}
        highlight={highlight}
        scrollRef={scrollRef}
      />
    </View>
  );

  const hour = new Date().getHours();
  // 카드 맨 위 한 줄 배너. 넘치면 글자를 줄여 한 줄을 지킨다
  const greeting =
    itemsAll === 0
      ? '오늘 딸 체크베리가 아직 없어요'
      : allDone
        ? '체크베리를 모두 수확했어요'
        : hour < 12
          ? '좋은 아침이에요'
          : hour < 18
            ? '오후도 힘내요'
            : '오늘 하루도 수고했어요';

  const textLink = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={8} className="min-h-9 justify-center active:opacity-60" accessibilityRole="button">
      <Text className="text-[15px] font-semibold text-accent">{label}</Text>
    </Pressable>
  );

  // 2열 타일. 홀수면 마지막 줄 오른쪽을 빈 칸으로 채워 너비를 맞춘다

  return (
    // 바로 추가 칸에 포커스하면 키보드 위 16pt로 올라온다. KeyboardAwareScrollView는 className 대상이 아니라 style로 지정한다
    <KeyboardAwareScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: c.bg }}
      // 떠 있는 탭 바 뒤에 마지막 카드가 가리지 않게 한다
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabBarInset }}
      bottomOffset={16}
      // 키보드가 열린 채로 '추가' 버튼이 한 번에 눌리게 한다
      keyboardShouldPersistTaps="handled"
    >
      {/* 날짜를 베리 soft 알약으로 제목 위에 둔다(오늘이 며칠인지가 이 화면의 첫 정보) */}
      <View className="mt-1 h-7 justify-center self-start rounded-full bg-accent-soft px-3">
        <Text className="text-[14px] leading-5 font-semibold text-accent-soft-foreground" maxFontSizeMultiplier={1.3}>
          {longDate(today)}
        </Text>
      </View>
      <Text
        className="mt-1.5 mb-4 text-[34px] leading-10 font-bold tracking-[-0.8px]"
        accessibilityRole="header"
        maxFontSizeMultiplier={1.3}
      >
        오늘
      </Text>

      <TodayProgressCard
        greeting={greeting}
        habitsDone={habitsDone}
        habitsTotal={habits.length}
        tasksDone={tasksDone}
        tasksTotal={tasksAll}
        allDone={allDone}
        finishing={finishing}
      >
        {overdueOpen.length > 0 && (
          <View className="flex-row">
            <Lozenge label={`지연 ${overdueOpen.length}`} tone="danger" />
          </View>
        )}
      </TodayProgressCard>

      {itemsAll === 0 && (
        // 오늘 할 것이 없으면 카드 아래 바로 첫 동작 두 개
        <View className="mt-3 flex-row justify-center gap-2">
          <Button size="sm" variant="secondary" onPress={() => router.push('/habits/new')}>
            <Button.Label>습관 추가</Button.Label>
          </Button>
          <Button size="sm" variant="secondary" onPress={() => router.push({ pathname: '/event', params: { date: today } })}>
            <Button.Label>할 일 추가</Button.Label>
          </Button>
        </View>
      )}

      <ListGroup className="mt-4 pb-4">
        <ListHeader inCard title="습관" count={habits.length ? `${habitsDone}/${habits.length}` : undefined} />
        {habits.length === 0 ? (
          <View className="min-h-[44px] flex-row items-center justify-between">
            <Text className="text-[15px] text-muted">오늘 할 습관이 없어요.</Text>
            {textLink('습관 추가', () => router.push('/habits/new'))}
          </View>
        ) : (
          // 누르면 체크, 길게 누르면 편집. 타일 아래 연속 기록 알약(3 이상이면 초록 불꽃), 주 N회는 이번 주 점
          <View className="gap-2">
            {habits.map((h) => {
              const dates = doneByHabit.get(h.id) ?? new Set<string>();
              const weekly = h.frequency_type === 'weekly';
              return (
                <HabitTile
                  key={h.id}
                  name={h.name}
                  iconKey={h.icon_key}
                  done={isDone(h.id)}
                  streak={{ count: streak(h, dates, today).current, unit: unitOf(h) }}
                  week={weekly ? { done: weekCount(dates, today), target: h.weekly_target ?? 1 } : undefined}
                  onToggle={() => check(h)}
                  onLongPress={() => edit(h.id)}
                />
              );
            })}
          </View>
        )}
      </ListGroup>

      {overdue.length > 0 &&
        list(
          settledOverdue,
          undefined,
          <ListHeader
            inCard
            title="지연"
            count={String(overdueOpen.length)}
            tint={c.danger}
            action={overdueOpen.length > 1 ? textLink('모두 오늘로 옮기기', () => moveToToday(db, overdueOpen, today)) : undefined}
          />,
        )}

      {list(
        settledTodays,
        undefined,
        <ListHeader inCard title="오늘 할 일" count={todays.length ? `${tasksDone}/${tasksAll}` : undefined} />,
        <QuickAddRow onAdd={quickAdd} />,
      )}

      {undated.length > 0 &&
        list(
          settledUndated,
          undefined,
          <ListHeader inCard title="날짜 없는 할 일" count={String(undated.filter((e) => !e.completed_at).length)} />,
        )}
    </KeyboardAwareScrollView>
  );
}
