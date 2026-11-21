import { router, useScrollToTop } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { type ComponentRef, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, type PressableProps, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  dailyRate,
  type Habit,
  HABIT_SQL,
  HabitChip,
  type HabitLog,
  isScheduled,
  streak,
  StreakArt,
  STREAK_LOOKBACK_DAYS,
  StreakBadge,
  streakUnit,
  toggleHabitLog,
  weeklyCaption,
} from '@/entities/habit';
import { useQuery } from '@/shared/db';
import { addDays, cn, formatKo, formatMD, useToday, WEEKDAY_KO, weekOfMonthLabel, weekStart } from '@/shared/lib';
import {
  duration,
  easing,
  EmptyState,
  haptic,
  Icon,
  LargeTitle,
  ListGroup,
  Lozenge,
  PeriodNav,
  RollingNumber,
  spring,
  Text,
  useColor,
  useTabBarInset,
} from '@/shared/ui';

const FILL = FadeIn.duration(160).reduceMotion(ReduceMotion.System);

// S04 습관: 행 = 습관, 열 = 이번 주 일~토(H-06)
export function HabitsPage() {
  const db = useSQLiteContext();
  const c = useColor();
  const today = useToday();
  // 지금 보고 있는 탭을 다시 누르면 맨 위로
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef);
  const tabBarInset = useTabBarInset();
  const [start, setStart] = useState(weekStart(today));
  // 마지막으로 누른 칸(습관|날짜). 그 칸만 채움 연출을 한다
  const [pressed, setPressed] = useState<string | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const allHabits = useQuery<Habit>(HABIT_SQL.allHabits);
  const habits = allHabits.filter((h) => days.some((d) => isScheduled(h, d)));
  // 지난주와 견주려고 한 주 앞까지 읽는다
  const logs = useQuery<HabitLog>(HABIT_SQL.logsBetween, [addDays(start, -7), days[6]]);
  // 연속 기록은 보고 있는 주와 상관없이 오늘 기준. 전체 기록 대신 오늘 탭과 같은 기간만 읽는다
  const allLogs = useQuery<HabitLog>(HABIT_SQL.logsBetween, [addDays(today, -STREAK_LOOKBACK_DAYS), today]);
  // 습관별 기록 날짜. 습관마다 전체 기록을 다시 거르지 않게 한 번에 묶는다
  const datesByHabit = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of allLogs) {
      if (!m.has(l.habit_id)) m.set(l.habit_id, new Set());
      m.get(l.habit_id)!.add(l.log_date);
    }
    return m;
  }, [allLogs]);
  const datesOf = (habitId: string) => datesByHabit.get(habitId) ?? new Set<string>();
  // 제목 아래 상태 요약: 보관하지 않은 습관 수, 일 단위 습관 중 가장 긴 현재 연속
  const active = allHabits.filter((h) => !h.archived_on);
  const activeCount = active.length;
  const bestStreak = Math.max(
    0,
    ...active.filter((h) => h.frequency_type !== 'weekly').map((h) => streak(h, datesOf(h.id), today).current),
  );

  const done = new Set(logs.map((l) => `${l.habit_id}|${l.log_date}`));
  const isDone = (habitId: string, d: string) => done.has(`${habitId}|${d}`);

  // 오늘까지의 날마다 달성률 평균. 예정 습관이 없으면 null
  const avgRate = (ds: string[]) => {
    const rates = ds
      .filter((d) => d <= today)
      .map((d) => dailyRate(allHabits, (id) => isDone(id, d), d))
      .filter((r): r is number => r != null);
    return rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
  };
  const weekRate = avgRate(days);
  const prevRate = avgRate(days.map((d) => addDays(d, -7)));
  const thisWeek = start === weekStart(today);

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-background"
      contentContainerClassName="gap-3 px-4"
      contentContainerStyle={{ paddingBottom: tabBarInset }}
    >
      {/* 주 평균은 아래 요약 카드(WeekSummary)가 크게 보여 준다 */}
      <View className="px-1">
        <LargeTitle
          title="습관"
          chips={
            activeCount > 0 && (
              <>
                <Lozenge size="lg" label={`${activeCount}개 진행 중`} />
                {bestStreak > 0 && (
                  // 최고 연속의 단계 그림(정지)을 칩 앞에
                  <Lozenge size="lg" label={`최고 연속 ${bestStreak}일`} leading={<StreakArt count={bestStreak} unit="일" size={22} />} />
                )}
              </>
            )
          }
          accessory={
            !thisWeek &&
            allHabits.length > 0 && (
              <Pressable
                onPress={() => setStart(weekStart(today))}
                hitSlop={4}
                className="h-9 justify-center rounded-full bg-default px-3.5 active:opacity-60"
                accessibilityRole="button"
              >
                <Text className="text-[14px] font-semibold">이번 주</Text>
              </Pressable>
            )
          }
        />
      </View>

      {allHabits.length === 0 ? (
        // 습관이 아예 없으면 기간 이동을 숨기고, 1단계 얼음으로 연속 기록 규칙을 미리 보여 준다
        <EmptyState
          art="habits"
          title="아직 습관이 없어요"
          body={'습관을 만들어 이어 가면\n얼음이 녹고 불꽃이 커져요.'}
          action={{ label: '습관 추가', tone: 'habit', onPress: () => router.push('/habits/new') }}
        />
      ) : (
        // 주차만 보인다. 날짜 범위는 화면 읽기 프로그램이 함께 읽는다
        <PeriodNav
          label={weekOfMonthLabel(start)}
          readLabel={`${weekOfMonthLabel(start)}, ${formatMD(days[0], today)}부터 ${formatMD(days[6], today)}까지`}
          onPrev={() => setStart(addDays(start, -7))}
          onNext={() => setStart(addDays(start, 7))}
          prevLabel="이전 주"
          nextLabel="다음 주"
        />
      )}

      {weekRate != null && (
        <WeekSummary
          rate={weekRate}
          delta={prevRate == null ? null : weekRate - prevRate}
          thisWeek={thisWeek}
          dayRates={days.map((d) => (d > today ? undefined : dailyRate(allHabits, (id) => isDone(id, d), d)))}
        />
      )}

      {allHabits.length > 0 && habits.length === 0 && (
        <ListGroup className="items-center py-8">
          <Text className="text-[15px] text-muted">이 주에는 예정된 습관이 없어요.</Text>
        </ListGroup>
      )}

      {habits.length > 0 && (
        <ListGroup className="px-3 pt-3 pb-1.5">
          {/* 요일·날짜는 카드 맨 위에 한 번만. 아래 칸들은 이 열에 맞춰 선다. 오늘은 베리 채움(벽돌색은 지연에만 쓰니 일요일도 같은 색) */}
          <View className="flex-row gap-1 pb-1.5">
            {days.map((d, i) => {
              const isToday = d === today;
              const tone = isToday ? 'text-accent-foreground' : undefined;
              return (
                <View key={d} className={cn('flex-1 items-center gap-0.5 rounded-xl py-1.5', isToday && 'bg-accent')}>
                  <Text className={cn('text-[12px] leading-[14px] font-semibold', tone ?? 'text-muted')}>{WEEKDAY_KO[i]}</Text>
                  <Text className={cn('text-[16px] leading-5 tabular-nums', isToday ? 'font-bold' : 'font-medium', tone)}>
                    {Number(d.slice(8))}
                  </Text>
                </View>
              );
            })}
          </View>
          {habits.map((h) => {
            const doneCount = days.filter((d) => isDone(h.id, d)).length;
            const target = h.weekly_target ?? 1;
            const weekly = h.frequency_type === 'weekly';
            const current = streak(h, datesOf(h.id), today).current;
            return (
              <View key={h.id} className={cn('gap-1 border-t border-separator pt-2.5 pb-1.5', h.archived_on && 'opacity-50')}>
                <Pressable
                  className="min-h-11 flex-row items-center gap-2.5 px-1 active:opacity-60"
                  onPress={() => router.push({ pathname: '/habits/[id]/edit', params: { id: h.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${h.name} 편집`}
                >
                  <HabitChip iconKey={h.icon_key} size={32} />
                  <View className="flex-1">
                    <Text className="text-[16px] leading-[22px] font-medium" numberOfLines={1}>
                      {h.name}
                    </Text>
                    {/* 주 N회는 점 대신 '이번 주 3/3 완료' */}
                    {weekly && (
                      <Text className="text-[13px] leading-[18px] font-medium text-muted">
                        {weeklyCaption({ done: doneCount, target })}
                      </Text>
                    )}
                  </View>
                  {h.archived_on && <Lozenge label="보관" />}
                  {/* 흰 카드 위라 메달 원 바탕은 card */}
                  <StreakBadge count={current} unit={streakUnit(h)} surface="card" />
                </Pressable>
                <View className="flex-row gap-1">
                  {days.map((d) => {
                    const on = isDone(h.id, d);
                    const scheduled = isScheduled(h, d);
                    const future = d > today;
                    const isToday = d === today;
                    return (
                      <Cell
                        key={d}
                        disabled={!scheduled || future}
                        onPress={() => {
                          setPressed(`${h.id}|${d}`);
                          if (on) haptic.uncheck();
                          else haptic.checkStrong();
                          toggleHabitLog(db, h.id, d);
                        }}
                        className={cn('h-11 flex-1 items-center justify-center rounded-[14px]', isToday && 'bg-accent-soft')}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on, disabled: !scheduled || future }}
                        accessibilityLabel={`${h.name} ${formatKo(d)}`}
                      >
                        {on ? (
                          // 누른 칸만 160ms 동안 베리로 찬다(화면을 처음 열 때는 연출하지 않는다)
                          <Animated.View
                            key="on"
                            entering={pressed === `${h.id}|${d}` ? FILL : undefined}
                            className="h-[30px] w-[30px] items-center justify-center rounded-full bg-accent"
                          >
                            <Icon name="check" size={16} tint={c.onAccent} />
                          </Animated.View>
                        ) : scheduled ? (
                          // 할 날인데 안 한 칸: 빈 원. 오늘은 베리 테두리
                          <View
                            key="off"
                            className={cn(
                              'h-[30px] w-[30px] rounded-full',
                              isToday ? 'border-2 border-accent' : 'border-[1.75px] border-track',
                            )}
                          />
                        ) : (
                          // 예정 아닌 날: 작은 점
                          <View key="rest" className="h-[5px] w-[5px] rounded-full bg-track" />
                        )}
                      </Cell>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ListGroup>
      )}
    </ScrollView>
  );
}

type CellProps = Omit<PressableProps, 'children'> & { children: ReactNode; onPress: () => void };

// 칸을 누르면 원이 0.8배로 눌렸다가 spring으로 살짝 넘쳐(약 1.1배) 돌아온다. 동작 줄이기면 튀지 않는다
function Cell({ children, onPress, ...rest }: CellProps) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Pressable
      {...rest}
      onPress={() => {
        if (!reduce) scale.set(withSequence(withTiming(0.8, { duration: 80 }), withSpring(1, spring.pop)));
        onPress();
      }}
    >
      <Animated.View style={style}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * 주 요약 카드: 큰 평균 % + 지난주 대비(▲ 잎 / ▼ 벽돌) + 요일마다 베리 한 알.
 * 베리는 그날 달성률만큼 아래에서부터 익는다(베리), 덜 익은 부분은 잎 soft. 아래 습관 카드의 요일 열과 같은 폭으로 선다
 */
function WeekSummary({
  rate,
  delta,
  thisWeek,
  dayRates,
}: {
  rate: number;
  delta: number | null;
  thisWeek: boolean;
  /** 날마다 달성률. undefined = 아직 안 온 날, null = 예정 습관 없음 */
  dayRates: (number | null | undefined)[];
}) {
  const up = delta != null && delta >= 1;
  const down = delta != null && delta <= -1;
  return (
    <ListGroup className="gap-3 px-3 py-3.5">
      <View
        className="flex-row items-end gap-2 px-1"
        accessible
        accessibilityLabel={`${thisWeek ? '이번 주 ' : ''}평균 달성률 ${rate}%${up ? `, 지난주보다 ${delta}%p 올랐어요` : down ? `, 지난주보다 ${-delta!}%p 내렸어요` : ''}`}
      >
        <RollingNumber value={`${rate}%`} className="text-[34px] leading-[40px] font-bold" />
        <View className="pb-1.5">
          {(up || down) && (
            <Text className={cn('text-[13px] leading-4 font-semibold', up ? 'text-success-soft-foreground' : 'text-danger')}>
              {up ? '▲' : '▼'} {Math.abs(delta!)}%p
            </Text>
          )}
          <Text className="text-[13px] leading-4 text-muted">{up || down ? '지난주보다' : thisWeek ? '이번 주 평균' : '주 평균'}</Text>
        </View>
      </View>
      <View className="flex-row gap-1" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {dayRates.map((r, i) => (
          <View key={i} className="h-[34px] flex-1 items-center justify-end">
            <Berry rate={r} />
          </View>
        ))}
      </View>
    </ListGroup>
  );
}

// 베리 한 알. 달성률만큼 아래에서부터 베리로 찬다(값이 바뀌면 부드럽게, 동작 줄이기면 즉시)
function Berry({ rate }: { rate: number | null | undefined }) {
  const fill = useSharedValue(rate ?? 0);
  useEffect(() => {
    fill.set(withTiming(rate ?? 0, { duration: duration.collapse, easing: easing.standard, reduceMotion: ReduceMotion.System }));
  }, [rate, fill]);
  const style = useAnimatedStyle(() => ({ height: `${fill.get()}%` }));
  // 예정 습관이 없던 날: 작은 점
  if (rate === null) return <View className="mb-[11px] h-[5px] w-[5px] rounded-full bg-track" />;
  return (
    <View className="items-center">
      {/* 꼭지 잎. 아직 안 온 날은 흐린 track */}
      <View className={cn('-mb-0.5 h-1.5 w-2.5 rounded-full', rate === undefined ? 'bg-track' : 'bg-success')} />
      <View
        className={cn(
          'h-[26px] w-[26px] justify-end overflow-hidden rounded-full',
          rate === undefined ? 'border-[1.75px] border-track' : 'bg-success-soft',
        )}
      >
        <Animated.View className="w-full bg-accent" style={style} />
      </View>
    </View>
  );
}
