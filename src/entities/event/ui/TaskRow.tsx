import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, type TextLayoutEvent, View } from 'react-native';
import Animated, {
  FadeOut,
  interpolateColor,
  LinearTransition,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { cn, formatMD } from '@/shared/lib';
import { Check, duration, EASE, easing, Icon, Lozenge, SwipeRow, Text, useColor, useMotion } from '@/shared/ui';
import type { EventRow } from '../model/repo';
import { dday, PRIORITY_NAME, priorityOf } from '../model/tasks';
import { removeTask } from './toggleTask';

type TextLayoutLine = TextLayoutEvent['nativeEvent']['lines'][number];

const REPEAT_LABEL = { daily: '매일', weekly: '매주', monthly: '매월' } as const;
// 중요도 배지(지라식 화살표): 높음 ↑ 베리, 보통 = 호박, 낮음 ↓ 서리(파랑). 벽돌은 지연 전용이라 쓰지 않는다
const PRIORITY_BADGE = {
  high: { tone: 'accent', icon: 'arrow-up' },
  normal: { tone: 'warning', icon: 'equal' },
  low: { tone: 'frost', icon: 'arrow-down' },
} as const;

export type ScrollRef = React.RefObject<ComponentRef<typeof ScrollView> | null>;

/**
 * 날짜 줄을 보여 줄 범위. sameDay: 화면이 이미 그 날짜를 말하는 곳(오늘 탭, 캘린더 날짜 패널, 할 일 '오늘' 필터)이라
 * 지연(D+n)과 여러 날 범위만 보인다. list: 할 일 탭의 나머지 필터. 다 보인다
 */
export type RowContext = 'sameDay' | 'list';

// FR-12: 완료한 할 일이 아래로 가는 자리 이동(300ms, 바운스 없음). 기기의 동작 줄이기 설정을 따른다
const LAYOUT = LinearTransition.duration(duration.move).reduceMotion(ReduceMotion.System);
// 목록에서 빠지는 행(할 일 탭에서 완료)은 160ms 동안 흐려지고, 아래 행이 자리를 메운다
const EXIT = FadeOut.duration(160).reduceMotion(ReduceMotion.System);

/** 줄마다 왼쪽부터 그어지는 취소선. 두 줄이면 첫 줄 다음 둘째 줄 순서로 긋는다 */
function StrikeLine({
  line,
  index,
  count,
  progress,
  color,
}: {
  line: TextLayoutLine;
  index: number;
  count: number;
  progress: SharedValue<number>;
  color: string;
}) {
  const style = useAnimatedStyle(() => ({ width: line.width * Math.min(Math.max(progress.get() * count - index, 0), 1) }));
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute h-[1.5px] rounded-sm"
      style={[{ left: line.x, top: line.y + line.height * 0.55 - 0.75, backgroundColor: color }, style]}
    />
  );
}

/** FR-01: 방금 저장한 할 일 id. 화면 파라미터 highlight로 받고 잠시 뒤 지운다 */
export function useHighlight() {
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => router.setParams({ highlight: undefined }), 2500);
    return () => clearTimeout(t);
  }, [highlight]);
  return highlight;
}

export function TaskRow({
  task,
  today,
  onToggle,
  onPress,
  right,
  className,
  highlighted,
  scrollRef,
  context = 'list',
}: {
  task: EventRow;
  today: string;
  context?: RowContext;
  onToggle: () => void;
  /** 행(체크 상자 밖)을 누르면 편집 */
  onPress?: () => void;
  right?: React.ReactNode;
  className?: string;
  /** 방금 저장한 항목이면 옅은 강조색 바탕으로 잠시 표시하고 화면 안으로 스크롤한다 */
  highlighted?: boolean;
  scrollRef?: ScrollRef;
}) {
  const c = useColor();
  const db = useSQLiteContext();
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    const scroll = scrollRef?.current;
    // 스크롤 내용(inner view) 기준 위치를 재서 항목이 화면 위쪽에 보이게 한다
    const content = scroll?.getInnerViewRef();
    if (!highlighted || !scroll || !content || !ref.current) return;
    ref.current.measureLayout(content, (_x: number, y: number) => scroll.scrollTo({ y: Math.max(0, y - 160), animated: true }));
  }, [highlighted, scrollRef]);

  // 방금 저장한 행의 옅은 강조색 바탕은 바로 켜고, 꺼질 때는 400ms 동안 걷힌다
  const fadeMs = useMotion(400);
  const glow = useSharedValue(highlighted ? 1 : 0);
  useEffect(() => {
    glow.set(highlighted ? 1 : withTiming(0, { duration: fadeMs, easing: EASE }));
  }, [highlighted, fadeMs, glow]);
  const glowStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(glow.get(), [0, 1], [`${c.accent}00`, `${c.accent}1F`]) }));

  const d = dday(task, today);
  const done = !!task.completed_at;
  // 체크하면 취소선이 그어지고 행이 흐려진다(320ms)
  const reduce = useReducedMotion();
  const [lines, setLines] = useState<TextLayoutLine[]>([]);
  const strike = useSharedValue(done ? 1 : 0);
  useEffect(() => {
    strike.set(reduce ? (done ? 1 : 0) : withTiming(done ? 1 : 0, { duration: duration.strike, easing: easing.standard }));
  }, [done, reduce, strike]);
  const bodyStyle = useAnimatedStyle(() => ({ opacity: 1 - 0.55 * strike.get() }));
  // 마감 칩은 중립 회색, 지남(D+n)만 벽돌색
  const overdue = !done && !!d?.overdue;
  const multiDay = !!task.end_date && task.end_date !== task.start_date;
  const showDate = context === 'list' || overdue || multiDay;
  const range =
    showDate &&
    task.start_date &&
    (task.end_date && task.end_date !== task.start_date
      ? `${formatMD(task.start_date, today)} – ${formatMD(task.end_date, today)}`
      : formatMD(task.start_date, today));
  const level = priorityOf(task.priority);
  const badge = PRIORITY_BADGE[level];
  return (
    <Animated.View layout={LAYOUT} exiting={EXIT}>
      {/* 오른쪽으로 끌면 완료 토글(햅틱은 toggleTask), 왼쪽으로 끌면 삭제(확인 후). 카드 안쪽 여백(16)까지 차도록 -mx-4 */}
      <SwipeRow
        className="-mx-4"
        right={{ icon: 'check', label: done ? '완료 해제' : '완료', tone: 'task', onAction: onToggle }}
        left={{ icon: 'trash', label: '삭제', tone: 'danger', onAction: () => removeTask(db, task) }}
      >
        <Animated.View ref={ref} className={cn('min-h-12 flex-row items-start px-4', className)} style={glowStyle}>
          {/* 체크 상자(44pt)를 누르면 완료 토글, 나머지를 누르면 편집 */}
          <Check done={done} onPress={onToggle} label={`${task.title} 완료`} className="-ml-3 h-12 w-11 pl-1" />
          <Pressable
            onPress={onPress}
            disabled={!onPress}
            className="min-h-12 flex-1 flex-row items-start gap-3.5 py-3 pl-1.5"
            accessibilityRole={onPress ? 'button' : undefined}
            accessibilityHint={onPress ? '편집해요' : undefined}
          >
            <Animated.View className="flex-1" style={bodyStyle}>
              <View>
                <Text
                  className="text-[16px] leading-[22px] font-medium"
                  numberOfLines={2}
                  onTextLayout={(e) => setLines(e.nativeEvent.lines)}
                >
                  {task.title}
                </Text>
                {done &&
                  lines.map((line, i) => (
                    <StrikeLine key={i} line={line} index={i} count={lines.length} progress={strike} color={c.text} />
                  ))}
              </View>
              {/* 끝낸 할 일은 날짜·반복·중요도를 숨긴다 */}
              {!done && (range || task.rrule) && (
                <View className="mt-1 flex-row flex-wrap items-center gap-1.5">
                  {d && showDate && <Lozenge label={d.label} tone={overdue ? 'danger' : 'default'} size="sm" />}
                  {range && (
                    <Text className={cn('text-[14px] leading-5', overdue ? 'text-danger-soft-foreground' : 'text-muted')}>{range}</Text>
                  )}
                  {task.rrule && (
                    <View className="flex-row items-center gap-[3px]">
                      <Icon name="repeat" size={12} tint={c.sub} />
                      <Text className="text-[14px] leading-5 text-muted">{REPEAT_LABEL[task.rrule]}</Text>
                    </View>
                  )}
                </View>
              )}
            </Animated.View>
            {/* 제목 첫 줄 높이(22)에 맞춘 중요도 로젠지 */}
            {!done && (
              <View>
                <Lozenge label={PRIORITY_NAME[level]} tone={badge.tone} icon={badge.icon} />
              </View>
            )}
          </Pressable>
          {right}
        </Animated.View>
      </SwipeRow>
    </Animated.View>
  );
}
