import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { ScrollView, type TextLayoutEvent, View } from 'react-native';
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
import { dday } from '../model/tasks';
import { removeTask } from './toggleTask';

type TextLayoutLine = TextLayoutEvent['nativeEvent']['lines'][number];

const REPEAT_LABEL = { daily: '매일', weekly: '매주', monthly: '매월' } as const;
// 목록에서는 높음 이상만 보여 준다
const PRIORITY_LABEL: Record<number, string> = { 4: '높음', 5: '매우 높음' };

export type ScrollRef = React.RefObject<ComponentRef<typeof ScrollView> | null>;

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
}: {
  task: EventRow;
  today: string;
  onToggle: () => void;
  /** 길게 누르면 편집. 없으면 보기·완료만 하는 목록 */
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
  // 마감 칩은 지남(D+n), 오늘(D-Day), 7일 안, 그 뒤 네 단계로 색을 바꾼다
  const overdue = !done && !!d?.overdue;
  // 화면 시안(Tasks·Main) 기준: 지남은 벽돌, 당일(기간 중 포함)은 옅은 베리, 나머지는 회색
  const dTone = overdue ? 'danger' : d?.label === 'D-Day' ? 'accent' : 'default';
  const range =
    task.start_date &&
    (task.end_date && task.end_date !== task.start_date
      ? `${formatMD(task.start_date, today)} – ${formatMD(task.end_date, today)}`
      : formatMD(task.start_date, today));
  const priority = PRIORITY_LABEL[task.priority];
  return (
    <Animated.View layout={LAYOUT} exiting={EXIT}>
      {/* 왼쪽으로 끌면 삭제(확인 후). 카드 안쪽 여백(16)까지 차도록 -mx-4 */}
      <SwipeRow className="-mx-4" left={{ icon: 'trash', label: '삭제', tone: 'danger', onAction: () => removeTask(db, task) }}>
        <Animated.View ref={ref} className={cn('min-h-[50px] flex-row items-center px-4', className)} style={glowStyle}>
          {/* FR-05: 행을 누르면 완료 토글, 길게 누르면 편집 */}
          <Check
            done={done}
            onPress={onToggle}
            onLongPress={onPress}
            label={`${task.title} 완료`}
            hint={onPress ? '길게 누르면 편집해요' : undefined}
            className="-ml-3 h-auto min-h-[50px] flex-1 flex-row items-start justify-start gap-3 self-stretch py-3 pl-3"
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
                  {d && <Lozenge label={d.label} tone={dTone} size="sm" />}
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
            {!done && priority && (
              <View>
                <Lozenge label={priority} tone="warning" />
              </View>
            )}
          </Check>
          {right}
        </Animated.View>
      </SwipeRow>
    </Animated.View>
  );
}
