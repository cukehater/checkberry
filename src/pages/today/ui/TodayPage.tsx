import { router, useScrollToTop } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import {
  byTodayOrder,
  compareTasks,
  EVENT_SQL,
  type EventRow,
  matchesFilter,
  moveToToday,
  saveEvent,
  setOrder,
  TaskList,
  toggleTask,
  useHighlight,
} from '@/entities/event';
import {
  type Habit,
  habitDayState,
  type HabitForDay,
  HABIT_SQL,
  type HabitLog,
  habitTally,
  HabitTile,
  isMilestone,
  isScheduled,
  setHabitOrder,
  streak,
  STREAK_LOOKBACK_DAYS,
  StreakToastIcon,
  streakUnit,
  toggleHabitLog,
  weekCount,
  weeklyCaption,
} from '@/entities/habit';
import { useQuery } from '@/shared/db';
import { addDays, reorderIds, toDateStr, useSettledOrder, useToday, weekday, WEEKDAY_KO } from '@/shared/lib';
import {
  EmptyState,
  haptic,
  LargeTitle,
  ListGroup,
  ListHeader,
  Lozenge,
  showToast,
  SortableItem,
  sortActions,
  Text,
  useColor,
  useSortable,
  useTabBarInset,
} from '@/shared/ui';
import { QuickAddRow } from './QuickAddRow';
import { TodayProgressCard } from './TodayProgressCard';

const taskId = (e: EventRow) => e.id;
const taskDone = (e: EventRow) => !!e.completed_at;

// S01 오늘. 노션 대시보드 'JUST DO IT.' 대체(L-01)
// '11월 21일 토요일'
const longDate = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일 ${WEEKDAY_KO[weekday(d)]}요일`;

export function TodayPage() {
  const db = useSQLiteContext();
  const c = useColor();
  const today = useToday();
  // 순서를 옮길 때 보관한 습관까지 든 전체 순서에 적용한다(습관 탭과 같은 순서)
  const allHabits = useQuery<Habit>(HABIT_SQL.allHabits);
  const habits = allHabits.filter((h) => !h.archived_on && isScheduled(h, today));
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
  // 주 N회 습관은 이번 주 진행을 함께 본다. 목표를 채운 날은 오늘 분모에서 빠진다
  const dayOf = (h: Habit): HabitForDay => ({
    doneToday: isDone(h.id),
    weekly:
      h.frequency_type === 'weekly'
        ? { done: weekCount(doneByHabit.get(h.id) ?? new Set(), today), target: h.weekly_target ?? 1 }
        : undefined,
  });

  // 오늘 끝낸 할 일은 하루 동안 체크된 채로 목록에 남긴다. 잘못 체크해도 바로 되돌릴 수 있다
  const openOrDoneToday = (e: EventRow) => !e.completed_at || toDateStr(new Date(e.completed_at)) === today;
  // '오늘 할 일'·'날짜 없는 할 일'은 오늘 탭에서 끌어 정한 순서(today_order). 지연은 날짜·중요도 순
  const todays = events.filter((e) => matchesFilter(e, 'today', today)).sort(byTodayOrder);
  const overdue = events.filter((e) => !!e.start_date && (e.end_date ?? e.start_date) < today && openOrDoneToday(e)).sort(compareTasks);
  const overdueOpen = overdue.filter((e) => !e.completed_at);
  // 날짜 없는 할 일은 기한이 없으니 끝낼 때까지 대시보드에 둔다
  const undated = events.filter((e) => matchesFilter(e, 'nodate', today) && openOrDoneToday(e)).sort(byTodayOrder);
  // 방금 체크한 할 일은 0.9초 제자리에 머문 뒤 아래로 간다
  const settledTodays = useSettledOrder(todays, taskId, taskDone);
  const settledOverdue = useSettledOrder(overdue, taskId, taskDone);
  const settledUndated = useSettledOrder(undated, taskId, taskDone);

  const habitCount = habitTally(habits.map(dayOf));
  // FR-09: 할 일 진행률은 오늘 날짜에 걸친 할 일만 센다(지연·날짜 없는 할 일 제외)
  const tasksAll = todays.length;
  const tasksDone = todays.filter((e) => e.completed_at).length;
  const itemsDone = habitCount.done + tasksDone;
  const itemsAll = habitCount.total + tasksAll;

  // 지연된 할 일이 남아 있으면 '모두 완료'라고 하지 않는다(진행률 분모에는 지연이 없다)
  const allDone = itemsAll > 0 && itemsDone === itemsAll && overdueOpen.length === 0;
  // 마지막 하나를 이 화면에서 직접 끝낸 순간에만 베리가 퍼진다. 화면을 열 때 이미 다 끝나 있으면 연출 없이 보여 준다
  const [finishing, setFinishing] = useState(false);
  const finishesDay = itemsDone + 1 === itemsAll && overdueOpen.length === 0;
  const check = (h: Habit) => {
    // 이번 주 목표를 채운 습관은 분모에 없어서 오늘 체크해도 남은 개수가 줄지 않는다
    const finishes = habitDayState(dayOf(h)) === 'todo' && finishesDay;
    setFinishing(finishes);
    if (!isDone(h.id)) {
      // 이 체크로 연속 기록이 이정표(3·7·14·30·100)에 닿으면 축하. 모두 완료와 겹치면 햅틱은 모두 완료 쪽만
      const dates = doneByHabit.get(h.id) ?? new Set<string>();
      const before = streak(h, dates, today).current;
      const after = streak(h, new Set(dates).add(today), today).current;
      const unit = streakUnit(h);
      if (after > before && isMilestone(after)) {
        if (!finishes) haptic.milestone();
        showToast({
          message: `${h.name} ${after}${unit} 연속이에요`,
          tone: 'success',
          leading: <StreakToastIcon count={after} unit={unit} />,
        });
      }
    }
    toggleHabitLog(db, h.id, today);
  };
  const toggle = (e: EventRow, hold: (id: string) => void) => {
    setFinishing(!e.completed_at && !e.rrule && todays.includes(e) && finishesDay);
    hold(e.id);
    toggleTask(db, e, today);
  };
  const quickAdd = (title: string, priority: number) =>
    saveEvent(db, null, {
      title,
      description: null,
      start_date: today,
      end_date: today,
      priority,
      group_id: null,
      completed: false,
      rrule: null,
    });
  const habitSort = useSortable(
    habits.map((h) => h.id),
    habits.length - 1,
    (from, to) =>
      setHabitOrder(
        db,
        reorderIds(
          allHabits.map((h) => h.id),
          habits.map((h) => h.id),
          from,
          to,
        ),
      ),
  );
  const edit = (id: string) => router.push({ pathname: '/habits/[id]/edit', params: { id } });
  const openEvent = (e: EventRow) => router.push({ pathname: '/event', params: { id: e.id } });
  const list = (
    settled: ReturnType<typeof useSettledOrder<EventRow>>,
    empty: string | undefined,
    header: React.ReactNode,
    footer?: React.ReactNode,
    reorderable?: boolean,
  ) => (
    <View className="mt-3">
      <TaskList
        context="sameDay"
        header={header}
        footer={footer}
        tasks={settled.ordered}
        today={today}
        onToggle={(e) => toggle(e, settled.hold)}
        onOpen={openEvent}
        onReorder={
          reorderable
            ? (from, to) => {
                const ids = settled.ordered.map((e) => e.id);
                setOrder(db, reorderIds(ids, ids, from, to), 'today_order');
              }
            : undefined
        }
        empty={empty}
        highlight={highlight}
        scrollRef={scrollRef}
      />
    </View>
  );

  // 진행 카드 제목: 남은 개수, 다 하면 인사. 링이 다 찼어도 지연이 남으면 그것을 말한다
  const title = allDone
    ? '오늘 하루도 수고했어요'
    : itemsAll === 0
      ? '오늘 딸 체크베리가 아직 없어요'
      : itemsDone < itemsAll
        ? `체크베리 ${itemsAll - itemsDone}개 남았어요`
        : `지연된 할 일 ${overdueOpen.length}개가 남았어요`;
  // 오늘 할 습관도, 오늘·지연 할 일도 없으면 빈 상태 카드와 바로 추가 카드만
  const nothingToday = habits.length === 0 && todays.length === 0 && overdue.length === 0;

  const textLink = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={8} className="min-h-9 justify-center active:opacity-60" accessibilityRole="button">
      <Text className="text-[15px] font-semibold text-accent">{label}</Text>
    </Pressable>
  );

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
      <LargeTitle
        title="오늘"
        chips={
          <>
            <Lozenge size="lg" label={longDate(today)} />
            {overdueOpen.length > 0 && <Lozenge size="lg" tone="danger" label={`지연 ${overdueOpen.length}`} />}
          </>
        }
      />

      {nothingToday ? (
        <EmptyState
          art="today"
          title="오늘 딸 체크베리가 아직 없어요"
          body={'습관을 만들면 매일 여기서 체크해요.\n할 일은 아래에 바로 적을 수 있어요.'}
          action={{ label: '습관 추가', tone: 'habit', onPress: () => router.push('/habits/new') }}
        />
      ) : (
        <>
          <TodayProgressCard
            title={title}
            habitsDone={habitCount.done}
            habitsTotal={habitCount.total}
            tasksDone={tasksDone}
            tasksTotal={tasksAll}
            allDone={allDone}
            finishing={finishing}
          />

          {/* 바깥 여백은 감싼 뷰에 준다. ListGroup의 className은 안쪽 면에 붙어 다크의 바깥 윤곽선 안에 여백이 생긴다 */}
          <View className="mt-3">
            <ListGroup className="pb-4">
              <ListHeader inCard title="습관" count={habits.length ? `${habitCount.done}/${habitCount.total}` : undefined} />
              {habits.length === 0 ? (
                <View className="min-h-[44px] flex-row items-center justify-between">
                  <Text className="text-[15px] text-muted">오늘 할 습관이 없어요.</Text>
                  {textLink('습관 추가', () => router.push('/habits/new'))}
                </View>
              ) : (
                // 누르면 체크, 길게 눌러 끌면 순서 바꾸기, 길게 눌렀다 그냥 떼면 편집. 오른쪽 연속 기록 메달, 주 N회는 이번 주 진행 캡션
                <View className="gap-2">
                  {habitSort
                    .arrange(habits, (h) => h.id)
                    .map((h, i) => {
                      const day = dayOf(h);
                      return (
                        <SortableItem key={h.id} sort={habitSort} id={h.id} index={i} radius={18} onHold={() => edit(h.id)}>
                          <HabitTile
                            name={h.name}
                            iconKey={h.icon_key}
                            state={habitDayState(day)}
                            caption={day.weekly && weeklyCaption(day.weekly)}
                            streak={{ count: streak(h, doneByHabit.get(h.id) ?? new Set<string>(), today).current, unit: streakUnit(h) }}
                            onToggle={() => check(h)}
                            actions={[
                              { name: 'edit', label: '편집', onAction: () => edit(h.id) },
                              ...sortActions(i, habits.length - 1, habitSort.drop),
                            ]}
                          />
                        </SortableItem>
                      );
                    })}
                </View>
              )}
            </ListGroup>
          </View>
        </>
      )}

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
        true,
      )}

      {undated.length > 0 &&
        list(
          settledUndated,
          undefined,
          <ListHeader inCard title="날짜 없는 할 일" count={String(undated.filter((e) => !e.completed_at).length)} />,
          undefined,
          true,
        )}
    </KeyboardAwareScrollView>
  );
}
