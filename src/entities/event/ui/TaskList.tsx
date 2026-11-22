import { View } from 'react-native';
import { FadeIn, FadeOut, LayoutAnimationConfig, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { duration, ListGroup, Separator, SortableItem, sortActions, Text, useSortable } from '@/shared/ui';
import type { EventRow } from '../model/repo';
import { type RowContext, type ScrollRef, TaskRow } from './TaskRow';

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
  onReorder,
  empty,
  highlight,
  scrollRef,
  right,
  header,
  footer,
  flat,
  context,
}: {
  tasks: EventRow[];
  today: string;
  onToggle: (e: EventRow) => void;
  /** 행을 누르면 편집. 없으면 보기·완료만 한다 */
  onOpen?: (e: EventRow) => void;
  /** 길게 눌러 끌어 순서를 바꾼다(tasks 인덱스). 미완료 행끼리만 옮길 수 있다 */
  onReorder?: (from: number, to: number) => void;
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
  /** 날짜 줄 규칙(TaskRow). 오늘 탭·날짜 패널·'오늘' 필터는 sameDay */
  context?: RowContext;
}) {
  // 미완료 행은 앞에 모여 있다. 그 끝까지만 끌 수 있다
  const firstDone = tasks.findIndex((e) => e.completed_at);
  const max = onReorder ? (firstDone < 0 ? tasks.length : firstDone) - 1 : -1;
  const sort = useSortable(
    tasks.map((e) => e.id),
    max,
    (from, to) => onReorder?.(from, to),
  );
  const Box = flat ? View : ListGroup;
  // 빈 카드가 남지 않게 한다
  if (tasks.length === 0 && !empty && !footer) return null;
  return (
    <Box>
      {header}
      {tasks.length === 0 && empty && <Text className="py-4 text-[15px] text-muted">{empty}</Text>}
      <LayoutAnimationConfig skipEntering>
        {sort
          .arrange(tasks, (e) => e.id)
          .map((e, i) => (
            <SortableItem
              key={e.id}
              sort={sort}
              id={e.id}
              index={i}
              layout={sort.animateLayout ? LAYOUT : undefined}
              entering={ENTER}
              exiting={EXIT}
              // 체크 상자(24) 오른쪽 글자 시작점(36)에 맞춘다. 구분선은 제자리에 두고 행만 움직인다
              before={i > 0 && <Separator className="ml-[38px]" />}
              // 들어 올린 행의 카드 바탕이 체크 상자 바깥까지 덮도록 좌우로 넓힌다
              className="-mx-2 px-2"
            >
              <TaskRow
                task={e}
                today={today}
                onToggle={() => onToggle(e)}
                onPress={onOpen && (() => onOpen(e))}
                highlighted={e.id === highlight}
                scrollRef={scrollRef}
                right={right?.(e, i)}
                context={context}
                // 저장 중(놓은 순서를 그리는 동안)에는 인덱스가 데이터와 달라서 주지 않는다
                moveActions={onReorder && sort.animateLayout ? sortActions(i, max, onReorder) : undefined}
              />
            </SortableItem>
          ))}
      </LayoutAnimationConfig>
      {footer}
    </Box>
  );
}
