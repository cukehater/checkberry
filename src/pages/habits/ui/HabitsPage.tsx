import * as Haptics from 'expo-haptics';
import { router, useScrollToTop } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { type ComponentRef, Fragment, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { dailyRate, type Habit, HABIT_SQL, HabitIcon, type HabitLog, isScheduled, toggleHabitLog } from '@/entities/habit';
import { useQuery } from '@/shared/db';
import { addDays, cn, formatKo, formatMD, useToday, WEEKDAY_KO, weekStart } from '@/shared/lib';
import { Icon, LargeTitle, ListGroup, Lozenge, Separator, Text, useColor } from '@/shared/ui';

const FILL = FadeIn.duration(160).reduceMotion(ReduceMotion.System);

// S04 습관: 행 = 습관, 열 = 이번 주 일~토(H-06)
export function HabitsPage() {
  const db = useSQLiteContext();
  const c = useColor();
  const today = useToday();
  // 지금 보고 있는 탭을 다시 누르면 맨 위로
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef);
  const [start, setStart] = useState(weekStart(today));
  // 마지막으로 누른 칸(습관|날짜). 그 칸만 채움 연출을 한다
  const [pressed, setPressed] = useState<string | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const habits = useQuery<Habit>(HABIT_SQL.allHabits).filter((h) => days.some((d) => isScheduled(h, d)));
  const logs = useQuery<HabitLog>(HABIT_SQL.logsBetween, [days[0], days[6]]);

  const done = new Set(logs.map((l) => `${l.habit_id}|${l.log_date}`));
  const isDone = (habitId: string, d: string) => done.has(`${habitId}|${d}`);

  const past = days.filter((d) => d <= today);
  const rates = past.map((d) => dailyRate(habits, (id) => isDone(id, d), d)).filter((r): r is number => r != null);
  const weekRate = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
  const thisWeek = start === weekStart(today);

  return (
    <ScrollView ref={scrollRef} className="flex-1 bg-background" contentContainerClassName="px-5 pb-20">
      <LargeTitle title="습관" subtitle={weekRate == null ? undefined : `${thisWeek ? '이번 주 ' : ''}평균 달성률 ${weekRate}%`} />

      <View className="mb-3 flex-row items-center">
        <Pressable
          onPress={() => setStart(addDays(start, -7))}
          className="h-11 w-11 items-center justify-center"
          accessibilityLabel="이전 주"
        >
          <Icon name="chevron-left" size={17} tint={c.accent} />
        </Pressable>
        <Text className="text-[15px] font-semibold tabular-nums">
          {formatMD(days[0], today)} – {formatMD(days[6], today)}
        </Text>
        <Pressable
          onPress={() => setStart(addDays(start, 7))}
          className="h-11 w-11 items-center justify-center"
          accessibilityLabel="다음 주"
        >
          <Icon name="chevron-right" size={17} tint={c.accent} />
        </Pressable>
        <View className="flex-1" />
        {!thisWeek && (
          <Pressable
            onPress={() => setStart(weekStart(today))}
            hitSlop={8}
            className="min-h-9 justify-center active:opacity-60"
            accessibilityRole="button"
          >
            <Text className="text-[15px] font-semibold text-accent">이번 주</Text>
          </Pressable>
        )}
      </View>

      {habits.length === 0 && (
        <ListGroup className="items-center gap-2 py-12">
          <Text className="text-[17px] font-semibold">아직 습관이 없어요</Text>
          <Text className="text-center text-[15px] text-muted">매일, 원하는 요일, 주 몇 회처럼{'\n'}주기를 골라 만들어 보세요.</Text>
          <Pressable
            onPress={() => router.push('/habits/new')}
            hitSlop={8}
            className="mt-2 min-h-11 justify-center active:opacity-60"
            accessibilityRole="button"
          >
            <Text className="text-[15px] font-semibold text-accent">습관 추가</Text>
          </Pressable>
        </ListGroup>
      )}

      {habits.length > 0 && (
        <ListGroup>
          {/* 요일은 카드 맨 위에 한 번만. 아래 칸들은 이 열에 맞춰 선다. 오늘은 파랑 */}
          <View className="flex-row justify-between border-b-[0.5px] border-separator pt-3 pb-2">
            {days.map((d, i) => (
              <Text
                key={d}
                className={cn(
                  'w-9 text-center text-[12px] font-semibold',
                  d === today ? 'text-accent' : i === 0 ? 'text-danger' : 'text-muted',
                )}
              >
                {WEEKDAY_KO[i]}
              </Text>
            ))}
          </View>
          {habits.map((h, hi) => {
            const doneCount = days.filter((d) => isDone(h.id, d)).length;
            return (
              <Fragment key={h.id}>
                {hi > 0 && <Separator />}
                <View className={cn('py-3', h.archived_on && 'opacity-50')}>
                  <Pressable
                    className="min-h-10 flex-row items-center gap-3 active:opacity-60"
                    onPress={() => router.push({ pathname: '/habits/[id]/edit', params: { id: h.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${h.name} 편집`}
                  >
                    <HabitIcon iconKey={h.icon_key} size={17} tint={c.sub} filled />
                    <Text className="flex-1 text-[16px] font-semibold" numberOfLines={1}>
                      {h.name}
                    </Text>
                    {h.archived_on && <Lozenge label="보관" />}
                    {h.frequency_type === 'weekly' ? (
                      <Text
                        className={cn(
                          'text-[13px] tabular-nums',
                          doneCount >= (h.weekly_target ?? 1) ? 'font-semibold text-success' : 'text-muted',
                        )}
                      >
                        {doneCount}/{h.weekly_target ?? 1}회
                      </Text>
                    ) : (
                      <Text className="text-[13px] text-muted tabular-nums">{doneCount}일</Text>
                    )}
                  </Pressable>
                  <View className="mt-2 flex-row justify-between">
                    {days.map((d, i) => {
                      const on = isDone(h.id, d);
                      const scheduled = isScheduled(h, d);
                      const future = d > today;
                      return (
                        <Pressable
                          key={d}
                          disabled={!scheduled || future}
                          onPress={() => {
                            setPressed(`${h.id}|${d}`);
                            Haptics.impactAsync(on ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
                            toggleHabitLog(db, h.id, d);
                          }}
                          hitSlop={4}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on, disabled: !scheduled || future }}
                          accessibilityLabel={`${h.name} ${formatKo(d)}`}
                        >
                          {on ? (
                            // 누른 칸만 160ms 동안 파랑으로 찬다(화면을 처음 열 때는 연출하지 않는다)
                            <Animated.View
                              key="on"
                              entering={pressed === `${h.id}|${d}` ? FILL : undefined}
                              className="h-9 w-9 items-center justify-center rounded-lg bg-accent"
                            >
                              <Icon name="check" size={14} tint={c.onAccent} />
                            </Animated.View>
                          ) : (
                            // 빈 칸: 할 날은 회색 칸, 쉬는 날·앞날은 옅은 테두리만, 오늘은 파란 테두리
                            <View
                              key="off"
                              className={cn(
                                'h-9 w-9 rounded-lg',
                                scheduled && !future ? 'bg-surface' : 'border border-dashed border-separator',
                                d === today && 'border-2 border-solid border-accent',
                              )}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </Fragment>
            );
          })}
        </ListGroup>
      )}
    </ScrollView>
  );
}
