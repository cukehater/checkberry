import { useNavigation } from 'expo-router';
import type { BottomTabNavigationProp } from 'expo-router/js-tabs';
import { type ComponentRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  Keyframe,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { compareTasks, EVENT_SQL, type EventRow, overlaps, weekBars } from '@/entities/event';
import { useQuery } from '@/shared/db';
import {
  addDays,
  addMonths,
  cn,
  type DateStr,
  daysInMonth,
  formatKo,
  monthStart,
  useToday,
  weekday,
  WEEKDAY_KO,
  weekOfMonthLabel,
  weekStart,
} from '@/shared/lib';
import {
  CARD_SHADOW,
  CHIP_EDGE,
  CHIP_GAP,
  duration as motion,
  easing,
  IconButton,
  Segmented,
  spring,
  Text,
  useColor,
  useTabBarInset,
} from '@/shared/ui';
import { DayPanel, DURATION } from './DayPanel';

const MAX_LANES = 2;
// 행 위 여백 4 + 숫자 칸 32 + 간격 3 아래부터 막대(18)를 3pt 간격으로 쌓는다
const BAR_TOP = 39;
const BAR_HEIGHT = 18;
const LANE_HEIGHT = 21;
// 주 행 높이(위 4·아래 6 여백 포함). 접히면 날짜 숫자 칸(40)만 남는다
const ROW_COMPACT = 50;
const ROW_MONTH = 101;
// 주 보기는 막대 12줄 + '+n' 줄까지 들어가는 높이
const ROW_WEEK = BAR_TOP + 12 * LANE_HEIGHT + 20;
const VIEWS = [
  ['month', '월'],
  ['week', '주'],
] as const;
// 달력을 폭의 25% 넘게 밀거나 빠르게 튕기면 이전/다음 달(주)로 넘긴다
const PAGE_RATIO = 0.25;
const PAGE_VELOCITY = 600;
// 고른 날 원은 0.85배에서 160ms 동안 튀지 않고 커지며 나타난다(동작 줄이기면 즉시). 날짜를 자주 바꾸는 곳이라 조용하게
const POP = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.85 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: easing.standard },
})
  .duration(160)
  .reduceMotion(ReduceMotion.System);

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
  // 월/주 전환은 헤더 왼쪽(+·설정과 같은 줄)에 둔다. 헤더는 탭 레이아웃이 그리므로 이 화면 옵션으로 덮어쓴다
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <View className="w-[132px] pl-4">
          <Segmented
            options={VIEWS}
            value={view}
            onChange={(v) => {
              if (open) setClosing(true);
              setView(v);
            }}
          />
        </View>
      ),
    });
  }, [navigation, view, open]);
  const tabBarInset = useTabBarInset();

  // 달력 접기·펼치기: 패널과 같은 시간·곡선으로 동시에 움직인다(1 = 펼침). 동작 줄이기면 즉시 바뀐다
  const expanded = !open || closing;
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : DURATION;
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
  // 주 보기는 'N월 N주차'(목요일 기준, 습관 탭과 같은 표기)
  const title = view === 'month' ? `${y}년 ${m}월` : weekOfMonthLabel(first);

  // 달력 카드를 좌우로 밀면 손가락을 따라 움직이고, 넘기면 밀어낸 쪽으로 나간 뒤 새 달이 반대쪽에서 들어온다.
  // 세로로 먼저 움직이면(14pt) 스크롤에 양보한다
  const { width } = useWindowDimensions();
  const pageX = useSharedValue(0);
  const slideIn = useRef(0);
  const turn = (dir: number) => {
    slideIn.current = dir;
    move(dir);
  };
  // 새 달이 화면 밖(나간 쪽)에 그려진 다음 반대쪽으로 옮겨 미끄러져 들어오게 한다
  useEffect(() => {
    const dir = slideIn.current;
    if (!dir) return;
    slideIn.current = 0;
    pageX.set(dir * width);
    pageX.set(withTiming(0, { duration: motion.collapse, easing: easing.standard }));
  }, [anchor, view, width, pageX]);
  const pan = usePanGesture({
    activeOffsetX: [-20, 20],
    failOffsetY: [-14, 14],
    runOnJS: true,
    onUpdate: (e) => {
      pageX.set(e.translationX);
    },
    onDeactivate: (e) => {
      // 왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전
      const dir =
        e.translationX < -width * PAGE_RATIO || e.velocityX < -PAGE_VELOCITY
          ? 1
          : e.translationX > width * PAGE_RATIO || e.velocityX > PAGE_VELOCITY
            ? -1
            : 0;
      if (e.canceled || !dir) return pageX.set(reduceMotion ? 0 : withSpring(0, spring.gentle));
      if (reduceMotion) {
        pageX.set(0);
        return move(dir);
      }
      pageX.set(
        withTiming(-dir * width, { duration: motion.press, easing: easing.exit }, (finished) => {
          if (finished) scheduleOnRN(turn, dir);
        }),
      );
    },
  });
  const pageStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pageX.get() }] }));

  return (
    <View className="flex-1 bg-background">
      {/* 이전/다음 칩은 헤더 +·설정 칩과 같은 간격(CHIP_GAP)과 가장자리(CHIP_EDGE). IconButton은 44 영역 안 40 칩이라 2pt씩 뺀다 */}
      <View className="mt-3 mb-3 flex-row items-center gap-1 pl-4" style={{ paddingRight: CHIP_EDGE - 2 }}>
        <Text
          // 주 보기 제목('2026년 11월 3주차')은 길어서 한 단계 작게
          className={cn(
            'flex-1 pl-1 font-bold',
            view === 'month' ? 'text-[28px] leading-[34px] tracking-[-0.6px]' : 'text-[22px] leading-7 tracking-[-0.4px]',
          )}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
        >
          {title}
        </Text>
        {!days.includes(today) && (
          <Pressable
            onPress={() => (close(), setAnchor(today))}
            hitSlop={4}
            className="mr-1 h-9 justify-center rounded-full bg-accent-soft px-3.5 active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel={view === 'month' ? '이번 달로' : '이번 주로'}
          >
            <Text className="text-[14px] font-semibold text-accent-soft-foreground">오늘</Text>
          </Pressable>
        )}
        <View className="flex-row" style={{ gap: CHIP_GAP - 4 }}>
          <IconButton
            name="chevron-left"
            size={16}
            onPress={() => move(-1)}
            accessibilityLabel={view === 'month' ? '이전 달' : '이전 주'}
          />
          <IconButton
            name="chevron-right"
            size={16}
            onPress={() => move(1)}
            accessibilityLabel={view === 'month' ? '다음 달' : '다음 주'}
          />
        </View>
      </View>
      {/* 달력은 열림·닫힘 모두 같은 자리에 있어야 높이가 이어서 움직인다. 패널이 열리면 이 ScrollView는 달력 높이만 차지하고
          스크롤을 멈추며, 남은 자리를 패널이 채운다(패널 목록만 스크롤) */}
      <ScrollView
        ref={scrollRef}
        className={open ? 'grow-0' : 'flex-1'}
        contentContainerStyle={open ? undefined : { paddingBottom: tabBarInset }}
        scrollEnabled={!open}
      >
        {/* 달력은 좌우 여백 없이 칸을 채워야 해서 ListGroup 대신 같은 카드 모양을 직접 그린다 */}
        <GestureDetector gesture={pan}>
          <Animated.View className="mx-4 rounded-3xl bg-card px-2 pt-2 pb-1.5" style={[c.raised ? CARD_SHADOW : undefined, pageStyle]}>
            <View className="h-6 flex-row items-center">
              {WEEKDAY_KO.map((w, i) => (
                <Text
                  key={w}
                  className={cn('flex-1 text-center text-[12px] font-semibold', i === 0 ? 'text-danger-soft-foreground' : 'text-muted')}
                >
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
                <Animated.View
                  key={wi}
                  className={cn('flex-row overflow-hidden border-t', wi === 0 ? 'border-transparent' : 'border-separator')}
                  style={rowStyle}
                >
                  {weekDays.map((d, col) => {
                    const outside = view === 'month' && d.slice(0, 7) !== anchor.slice(0, 7);
                    const isToday = d === today;
                    const isSelected = d === selected;
                    const hidden = bars.filter((b) => b.lane >= maxLanes && b.startCol <= col && col <= b.endCol).length;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => tapDay(d)}
                        // 숫자 원은 접힘과 펼침 모두 위에서 6pt라 위치를 따로 움직이지 않는다
                        className={cn('flex-1 pt-1.5', outside && 'opacity-35')}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`${formatKo(d)}, 할 일 ${onDay(d).length}개`}
                        accessibilityHint={isSelected ? '다시 누르면 패널을 닫아요' : undefined}
                      >
                        {/* 고른 날은 베리 원(튀며 나타남), 오늘은 옅은 베리 원. 일요일 숫자는 빨강 */}
                        <View
                          className={cn(
                            'h-7 w-7 items-center justify-center self-center rounded-full',
                            isToday && !isSelected ? 'bg-accent-soft' : 'bg-transparent',
                          )}
                        >
                          {isSelected && <Animated.View entering={POP} className="absolute inset-0 rounded-full bg-accent" />}
                          <Text
                            className={cn(
                              'text-[14px] font-medium tabular-nums',
                              isSelected
                                ? 'font-bold text-accent-foreground'
                                : isToday
                                  ? 'font-bold text-accent-soft-foreground'
                                  : col === 0 && 'text-danger-soft-foreground',
                            )}
                          >
                            {Number(d.slice(8))}
                          </Text>
                        </View>
                        {hidden > 0 && (
                          <Animated.View className="absolute right-0 bottom-1.5 left-0" style={barStyle}>
                            <Text className="text-center text-[11px] leading-[14px] font-semibold text-muted">+{hidden}</Text>
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
                              height: BAR_HEIGHT,
                              paddingLeft: starts ? 2 : 0,
                              paddingRight: ends ? 2 : 0,
                            }}
                          >
                            <View
                              className={cn(
                                'flex-1 justify-center px-1.5',
                                done ? 'bg-default' : late ? 'bg-danger-soft' : 'bg-accent-soft',
                                starts && 'rounded-l-md',
                                ends && 'rounded-r-md',
                              )}
                            >
                              <Text
                                numberOfLines={1}
                                className={cn(
                                  'text-[11px] leading-[18px] font-medium',
                                  done ? 'text-muted line-through' : late ? 'text-danger-soft-foreground' : 'text-accent-soft-foreground',
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
          </Animated.View>
        </GestureDetector>
      </ScrollView>
      {open && (
        <View className="mt-3 flex-1">
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
