import { useNavigation } from 'expo-router';
import type { BottomTabNavigationProp } from 'expo-router/js-tabs';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
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
import { compareTasks, EVENT_SQL, type EventRow, overlaps } from '@/entities/event';
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
  weekStart,
} from '@/shared/lib';
import { duration as motion, easing, LargeTitle, PeriodNav, spring, Text, useCardStyle, useTabBarInset } from '@/shared/ui';
import { DayPanel, DURATION } from './DayPanel';

// 주 행 높이. 숫자 원(위 6 + 28) 아래 4pt에 할 일 점(5). 접히면 날짜 숫자 칸(40)만 남는다
const ROW_COMPACT = 50;
const ROW_MONTH = 84;
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

// S02 캘린더: 월간(E-04). 주 시작은 일요일. 칸에는 그날 할 일 수만, 목록은 날짜 패널에서 본다
export function CalendarPage() {
  const card = useCardStyle();
  const today = useToday();
  const [anchor, setAnchor] = useState<DateStr>(today);
  // 날짜를 누르면 그날 패널이 올라오고 달력은 날짜 숫자만 남긴 채 납작해진다. 같은 날짜를 다시 누르거나,
  // 핸들을 끌어내리거나, 달을 옮기면 닫힌다. closing은 패널이 내려가는 중(끝나면 선택을 지운다)
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

  // 탭을 다시 누르면: 패널이 열려 있으면 닫고, 닫혀 있으면 오늘이 있는 달로 돌아가 맨 위로
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
  const tabBarInset = useTabBarInset();

  // 달력 접기·펼치기: 패널과 같은 시간·곡선으로 동시에 움직인다(1 = 펼침). 동작 줄이기면 즉시 바뀐다
  const expanded = !open || closing;
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : DURATION;
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.set(withTiming(expanded ? 1 : 0, { duration }));
  }, [expanded, duration, progress]);
  const rowStyle = useAnimatedStyle(() => ({ height: interpolate(progress.get(), [0, 1], [ROW_COMPACT, ROW_MONTH]) }));
  const events = useQuery<EventRow>(EVENT_SQL.events).filter((e) => e.start_date);

  const first = weekStart(monthStart(anchor));
  const weeks = Math.ceil((weekday(monthStart(anchor)) + daysInMonth(anchor)) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(first, i));
  const onDay = (d: DateStr) => events.filter((e) => overlaps(e, d, d)).sort(compareTasks);

  const move = (n: number) => {
    close();
    setAnchor(addMonths(anchor, n));
  };
  const [y, m] = anchor.split('-').map(Number);

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
  }, [anchor, width, pageX]);
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
      {/* 제목은 다른 탭처럼 '캘린더' 34pt(보이는 달에 오늘이 없으면 오른쪽에 '오늘' 알약), 아래에 기간 이동 줄 */}
      <View className="mb-3 px-4">
        <View className="px-1">
          <LargeTitle
            title="캘린더"
            accessory={
              !days.includes(today) && (
                <Pressable
                  onPress={() => (close(), setAnchor(today))}
                  hitSlop={4}
                  className="h-9 justify-center rounded-full bg-default px-3.5 active:opacity-60"
                  accessibilityRole="button"
                  accessibilityLabel="이번 달로"
                >
                  <Text className="text-[14px] font-semibold">오늘</Text>
                </Pressable>
              )
            }
          />
        </View>
        <View className="-mt-1">
          <PeriodNav label={`${y}년 ${m}월`} onPrev={() => move(-1)} onNext={() => move(1)} prevLabel="이전 달" nextLabel="다음 달" />
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
          <Animated.View className="mx-4 rounded-3xl bg-card px-2 pt-2 pb-1.5" style={[card, pageStyle]}>
            {/* 요일 머리. 벽돌색은 지연에만 쓰니 일요일도 같은 색 */}
            <View className="h-[26px] flex-row items-center">
              {WEEKDAY_KO.map((w) => (
                <Text key={w} className="flex-1 text-center text-[12px] font-semibold text-muted">
                  {w}
                </Text>
              ))}
            </View>

            {Array.from({ length: weeks }, (_, wi) => {
              const weekDays = days.slice(wi * 7, wi * 7 + 7);
              return (
                <Animated.View
                  key={wi}
                  className={cn('flex-row overflow-hidden border-t', wi === 0 ? 'border-transparent' : 'border-separator')}
                  style={rowStyle}
                >
                  {weekDays.map((d) => {
                    const outside = d.slice(0, 7) !== anchor.slice(0, 7);
                    const isToday = d === today;
                    const isSelected = d === selected;
                    // 완료 포함 그날 걸친 할 일 수(여러 날 할 일은 걸친 날마다 하나)
                    const count = onDay(d).length;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => tapDay(d)}
                        // 숫자 원은 접힘과 펼침 모두 위에서 6pt라 위치를 따로 움직이지 않는다
                        className={cn('flex-1 items-center pt-1.5', outside && 'opacity-35')}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`${formatKo(d)}, 할 일 ${count}개`}
                        accessibilityHint={isSelected ? '다시 누르면 패널을 닫아요' : undefined}
                      >
                        {/* 고른 날은 베리 원(튀며 나타남), 오늘은 옅은 베리 원 */}
                        <View
                          className={cn(
                            'h-7 w-7 items-center justify-center rounded-full',
                            isToday && !isSelected ? 'bg-accent-soft' : 'bg-transparent',
                          )}
                        >
                          {isSelected && <Animated.View entering={POP} className="absolute inset-0 rounded-full bg-accent" />}
                          <Text
                            className={cn(
                              'text-[14px] font-medium tabular-nums',
                              isSelected ? 'font-bold text-accent-foreground' : isToday && 'font-bold text-accent-soft-foreground',
                            )}
                          >
                            {Number(d.slice(8))}
                          </Text>
                        </View>
                        {/* 할 일이 있는 날: 숫자 원 아래 5pt 잎 초록 점(펼침·접힘 같은 자리). 개수와 목록은 날짜 패널에서 본다 */}
                        {count > 0 && (
                          <View
                            className="absolute top-[38px] h-[5px] w-[5px] rounded-full bg-success"
                            accessibilityElementsHidden
                            importantForAccessibility="no-hide-descendants"
                          />
                        )}
                      </Pressable>
                    );
                  })}
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
