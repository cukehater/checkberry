import { useNavigation } from 'expo-router';
import type { BottomTabNavigationProp } from 'expo-router/js-tabs';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { compareTasks, EVENT_SQL, type EventRow, overlaps, weekBars } from '@/entities/event';
import { useQuery } from '@/shared/db';
import {
  addDays,
  addMonths,
  cn,
  type DateStr,
  daysInMonth,
  formatKo,
  formatMD,
  monthStart,
  useToday,
  weekday,
  WEEKDAY_KO,
  weekStart,
} from '@/shared/lib';
import { CARD_SHADOW, Icon, LargeTitle, Segmented, Text, useColor } from '@/shared/ui';
import { DayPanel, DURATION } from './DayPanel';

const MAX_LANES = 2;
// 날짜 숫자(28pt) 아래부터 막대를 쌓는다. 막대 높이 16 + 간격 2
const BAR_TOP = 34;
const LANE_HEIGHT = 18;
// 주 행 높이. 접히면 날짜 숫자 원(28)만 남는다
const ROW_COMPACT = 36;
const ROW_MONTH = 90;
const ROW_WEEK = 260;
const VIEWS = [
  ['month', '월'],
  ['week', '주'],
] as const;

// S02 캘린더: 월간(E-04) / 주간(E-05). 주 시작은 일요일
export function CalendarPage() {
  const c = useColor();
  const today = useToday();
  const [view, setView] = useState<'month' | 'week'>('month');
  const [anchor, setAnchor] = useState<DateStr>(today);
  // 날짜를 누르면 그날 패널이 올라오고 달력은 날짜 숫자만 남긴 채 납작해진다. 같은 날짜를 다시 누르거나,
  // 핸들을 끌어내리거나, 달·주를 옮기면 닫힌다. closing은 패널이 내려가는 중(끝나면 선택을 지운다)
  const [selected, setSelected] = useState<DateStr | null>(null);
  const [closing, setClosing] = useState(false);
  const open = selected !== null;
  const close = () => open && setClosing(true);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const onClosed = useCallback(() => {
    setSelected(null);
    setClosing(false);
  }, []);
  // 닫는 중에 다른 날짜를 누르면 다시 연다(마지막 입력이 이긴다)
  const tapDay = (d: DateStr) => {
    if (d === selected && !closing) return setClosing(true);
    // 스크롤한 채로 열면 납작해진 달력이 위로 밀려 안 보이므로 맨 위로 올린다
    if (!open) scrollRef.current?.scrollTo({ y: 0, animated: true });
    setSelected(d);
    setClosing(false);
  };

  // 탭을 다시 누르면: 패널이 열려 있으면 닫고, 닫혀 있으면 오늘이 있는 달(주)로 돌아가 맨 위로
  const navigation = useNavigation<BottomTabNavigationProp<Record<string, object | undefined>>>();
  useEffect(
    () =>
      navigation.addListener('tabPress', () => {
        // 다른 탭에서 넘어오는 경우는 그냥 이동만 한다
        if (!navigation.isFocused()) return;
        if (open) return setClosing(true);
        setAnchor(today);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }),
    [navigation, open, today],
  );

  // 달력 접기·펼치기: 패널과 같은 시간·곡선으로 동시에 움직인다(1 = 펼침). 동작 줄이기면 즉시 바뀐다
  const expanded = !open || closing;
  const duration = useReducedMotion() ? 0 : DURATION;
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.set(withTiming(expanded ? 1 : 0, { duration }));
  }, [expanded, duration, progress]);
  const rowFull = view === 'month' ? ROW_MONTH : ROW_WEEK;
  const rowStyle = useAnimatedStyle(() => ({ height: interpolate(progress.get(), [0, 1], [ROW_COMPACT, rowFull]) }));
  // 막대와 '+n'은 접힐 때 앞 40% 동안 사라지고, 펼칠 때 뒤 40% 동안 나타난다
  const barStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.get(), [0.6, 1], [0, 1], Extrapolation.CLAMP) }));
  const events = useQuery<EventRow>(EVENT_SQL.events).filter((e) => e.start_date);

  const first = view === 'month' ? weekStart(monthStart(anchor)) : weekStart(anchor);
  const weeks = view === 'month' ? Math.ceil((weekday(monthStart(anchor)) + daysInMonth(anchor)) / 7) : 1;
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(first, i));
  const onDay = (d: DateStr) => events.filter((e) => overlaps(e, d, d)).sort(compareTasks);

  const move = (n: number) => {
    close();
    setAnchor(view === 'month' ? addMonths(anchor, n) : addDays(anchor, 7 * n));
  };
  const [y, m] = anchor.split('-').map(Number);
  const title = view === 'month' ? `${y}년 ${m}월` : `${formatMD(first, today)} – ${formatMD(addDays(first, 6), today)}`;

  return (
    <View className="flex-1 bg-background">
      <View className="px-5">
        {/* 주 보기 제목(11월 15일 – 11월 21일)은 길어서 세그먼트를 제목 줄에 두지 않고 이동 줄 오른쪽에 둔다 */}
        <LargeTitle title={title} />
        <View className="mb-2 flex-row items-center">
          <Pressable
            onPress={() => move(-1)}
            className="h-11 w-11 items-center justify-center"
            accessibilityLabel={view === 'month' ? '이전 달' : '이전 주'}
          >
            <Icon name="chevron-left" size={17} tint={c.accent} />
          </Pressable>
          <Pressable
            onPress={() => move(1)}
            className="h-11 w-11 items-center justify-center"
            accessibilityLabel={view === 'month' ? '다음 달' : '다음 주'}
          >
            <Icon name="chevron-right" size={17} tint={c.accent} />
          </Pressable>
          <View className="flex-1" />
          {!days.includes(today) && (
            <Pressable
              onPress={() => (close(), setAnchor(today))}
              hitSlop={8}
              className="min-h-9 justify-center active:opacity-60"
              accessibilityRole="button"
            >
              <Text className="text-[15px] font-semibold text-accent">오늘</Text>
            </Pressable>
          )}
          <View className="ml-3 w-28">
            <Segmented options={VIEWS} value={view} onChange={(v) => (close(), setView(v))} />
          </View>
        </View>
      </View>
      {/* 달력은 열림·닫힘 모두 같은 자리에 있어야 높이가 이어서 움직인다. 패널이 열리면 이 ScrollView는 달력 높이만 차지하고
          스크롤을 멈추며, 남은 자리를 패널이 채운다(패널 목록만 스크롤) */}
      <ScrollView
        ref={scrollRef}
        className={open ? 'grow-0' : 'flex-1'}
        contentContainerClassName={open ? undefined : 'pb-20'}
        scrollEnabled={!open}
      >
        {/* 달력은 좌우 여백 없이 칸을 채워야 해서 ListGroup 대신 같은 카드 모양을 직접 그린다 */}
        <View className="mx-3 rounded-xl bg-card" style={c.raised ? CARD_SHADOW : undefined}>
          <View className="flex-row py-2">
            {WEEKDAY_KO.map((w, i) => (
              <Text key={w} className={cn('flex-1 text-center text-[12px] font-semibold text-muted', i === 0 && 'text-danger')}>
                {w}
              </Text>
            ))}
          </View>

          {Array.from({ length: weeks }, (_, wi) => {
            const weekDays = days.slice(wi * 7, wi * 7 + 7);
            // 여러 날 할 일은 주 안에서 한 줄 막대로 잇는다. 줄 수를 넘는 막대는 날짜별 '+n'으로 센다
            const bars = weekBars(events, weekDays[0]);
            const maxLanes = view === 'month' ? MAX_LANES : 12;
            return (
              <Animated.View key={wi} className="flex-row overflow-hidden border-t-[0.5px] border-separator" style={rowStyle}>
                {weekDays.map((d, col) => {
                  const outside = view === 'month' && d.slice(0, 7) !== anchor.slice(0, 7);
                  const isToday = d === today;
                  const isSelected = d === selected;
                  const hidden = bars.filter((b) => b.lane >= maxLanes && b.startCol <= col && col <= b.endCol).length;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => tapDay(d)}
                      // 숫자 원은 접힘(36 안 가운데)과 펼침(위 4) 모두 위에서 4pt라 위치를 따로 움직이지 않는다
                      className={cn('flex-1 rounded-lg pt-1', outside && 'opacity-35')}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${formatKo(d)}, 할 일 ${onDay(d).length}개`}
                      accessibilityHint={isSelected ? '다시 누르면 패널을 닫아요' : undefined}
                    >
                      {/* 캘린더 앱처럼 오늘은 틴트 원, 고른 날은 글자색 원 */}
                      <View
                        className={cn(
                          'h-7 w-7 items-center justify-center self-center rounded-full',
                          isToday ? 'bg-accent' : isSelected ? 'bg-foreground' : 'bg-transparent',
                        )}
                      >
                        <Text
                          className={cn(
                            'text-[14px] tabular-nums',
                            isToday && 'font-semibold text-accent-foreground',
                            isSelected && !isToday && 'font-semibold text-background',
                          )}
                        >
                          {Number(d.slice(8))}
                        </Text>
                      </View>
                      {hidden > 0 && (
                        <Animated.View className="absolute right-0 bottom-1 left-0" style={barStyle}>
                          <Text className="text-center text-[11px] text-muted">+{hidden}</Text>
                        </Animated.View>
                      )}
                    </Pressable>
                  );
                })}
                {/* 막대는 표시만 한다(누르면 아래 날짜 칸이 눌린다). 할 일은 패널에서 본다. 접힌 동안은 읽어 주지 않는다 */}
                <Animated.View
                  pointerEvents="none"
                  className="absolute inset-0"
                  style={barStyle}
                  accessibilityElementsHidden={!expanded}
                  importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
                >
                  {bars
                    .filter((b) => b.lane < maxLanes)
                    .map(({ task: e, startCol, endCol, lane }) => {
                      const done = !!e.completed_at;
                      const late = !done && (e.end_date ?? e.start_date)! < today;
                      // 이 주에서 시작·끝나는 쪽만 둥글게 해서 주를 넘어 이어지는 막대처럼 보이게 한다
                      const starts = e.start_date! >= weekDays[0];
                      const ends = (e.end_date ?? e.start_date)! <= weekDays[6];
                      return (
                        <View
                          key={e.id}
                          // 위치·폭은 막대마다 계산된 값이라 style로 준다
                          style={{
                            position: 'absolute',
                            left: `${(startCol / 7) * 100}%`,
                            width: `${((endCol - startCol + 1) / 7) * 100}%`,
                            top: BAR_TOP + lane * LANE_HEIGHT,
                            height: LANE_HEIGHT - 2,
                            paddingLeft: starts ? 2 : 0,
                            paddingRight: ends ? 2 : 0,
                          }}
                        >
                          <View
                            className={cn(
                              'flex-1 justify-center px-1',
                              done ? 'bg-success-soft' : late ? 'bg-danger-soft' : 'bg-accent-soft',
                              starts && 'rounded-l',
                              ends && 'rounded-r',
                            )}
                          >
                            <Text
                              numberOfLines={1}
                              className={cn(
                                'text-[11px] leading-[14px] font-medium',
                                done
                                  ? 'text-success-soft-foreground line-through'
                                  : late
                                    ? 'text-danger-soft-foreground'
                                    : 'text-accent-soft-foreground',
                              )}
                            >
                              {e.title}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                </Animated.View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
      {open && (
        <View className="mt-2 flex-1">
          <DayPanel
            date={selected}
            today={today}
            tasks={onDay(selected)}
            closing={closing}
            onRequestClose={() => setClosing(true)}
            onClosed={onClosed}
          />
        </View>
      )}
    </View>
  );
}
