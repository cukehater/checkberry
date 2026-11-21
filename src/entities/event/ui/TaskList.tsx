import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { duration, ListGroup, Separator, Text } from '@/shared/ui';
import type { EventRow } from '../model/repo';
import { type ScrollRef, TaskRow } from './TaskRow';

// 행과 그 위 구분선을 한 덩어리로 움직인다. 새 행은 흐려졌다 나타나고(처음 그릴 때는 바로), 빠지는 행은 흐려지며, 나머지는 자리를 옮긴다
const LAYOUT = LinearTransition.duration(duration.move).reduceMotion(ReduceMotion.System);
const ENTER = FadeIn.duration(duration.enter).reduceMotion(ReduceMotion.System);
const EXIT = FadeOut.duration(160).reduceMotion(ReduceMotion.System);

/** 할 일 목록. 흰 카드 안에 행을 담고, 행 사이에는 글자 시작점부터 머리카락 선을 긋는다. 받은 할 일을 그대로(완료 항목은 체크된 채로) 보여 준다. right에는 tasks 배열의 인덱스를 넘긴다 */
export function TaskList({
  tasks,
  today,
  onToggle,
  onOpen,
  empty,
  highlight,
  scrollRef,
  right,
  header,
  footer,
  flat,
}: {
  tasks: EventRow[];
  today: string;
  onToggle: (e: EventRow) => void;
  /** 길게 누르면 편집. 없으면 보기·완료만 한다 */
  onOpen?: (e: EventRow) => void;
  empty?: string;
  highlight?: string;
  scrollRef?: ScrollRef;
  right?: (e: EventRow, i: number) => React.ReactNode;
  /** 카드 안 첫 줄(묶음 제목) */
  header?: React.ReactNode;
  /** 카드 안 마지막 줄(바로 추가 입력칸) */
  footer?: React.ReactNode;
  /** 카드 없이 행만 그린다(이미 흰 면 위인 캘린더 하루 패널) */
  flat?: boolean;
}) {
  const Box = flat ? View : ListGroup;
  // 빈 카드가 남지 않게 한다
  if (tasks.length === 0 && !empty && !footer) return null;
  return (
    <Box>
      {header}
      {tasks.length === 0 && empty && <Text className="py-4 text-[15px] text-muted">{empty}</Text>}
      <LayoutAnimationConfig skipEntering>
        {tasks.map((e, i) => (
          <Animated.View key={e.id} layout={LAYOUT} entering={ENTER} exiting={EXIT}>
            {/* 체크 상자(24) 오른쪽 글자 시작점(36)에 맞춘다 */}
            {i > 0 && <Separator className="ml-9" />}
            <TaskRow
              task={e}
              today={today}
              onToggle={() => onToggle(e)}
              onPress={onOpen && (() => onOpen(e))}
              highlighted={e.id === highlight}
              scrollRef={scrollRef}
              right={right?.(e, i)}
            />
          </Animated.View>
        ))}
      </LayoutAnimationConfig>
      {footer}
    </Box>
  );
}
