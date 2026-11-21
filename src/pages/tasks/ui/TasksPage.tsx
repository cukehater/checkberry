import { router, useScrollToTop } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  compareTasks,
  EVENT_SQL,
  type EventRow,
  type Group,
  matchesFilter,
  setOrder,
  type TaskFilter,
  TaskList,
  toggleTask,
  useHighlight,
} from '@/entities/event';
import { useQuery } from '@/shared/db';
import { useToday } from '@/shared/lib';
import { Badge, Icon, LargeTitle, SearchField, Segmented, Text, useColor } from '@/shared/ui';

const FILTERS: (readonly [TaskFilter, string])[] = [
  ['all', '전체'],
  ['today', '오늘'],
  ['overdue', '지연'],
  ['nodate', '날짜 없음'],
  ['done', '완료'],
];

// 그룹은 노션 체크리스트처럼 손으로 정한 순서(E-11), 그룹 없는 항목은 E-10 정렬
const byManualOrder = (a: EventRow, b: EventRow) => Number(!!a.completed_at) - Number(!!b.completed_at) || a.sort_order - b.sort_order;
// 완료 탭은 최근에 끝낸 순서
const byCompletedDesc = (a: EventRow, b: EventRow) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '');

// S03 할 일
export function TasksPage() {
  const db = useSQLiteContext();
  const c = useColor();
  const today = useToday();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [reorder, setReorder] = useState(false);
  const [query, setQuery] = useState('');
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  // 지금 보고 있는 탭을 다시 누르면 맨 위로(검색어·필터는 그대로 둔다)
  useScrollToTop(scrollRef);
  // FR-01: 방금 저장한 할 일이 보이도록 필터·검색·접힘을 풀어 둔다(렌더 중 상태 조정)
  const highlight = useHighlight();
  const [seen, setSeen] = useState<string | undefined>();
  if (highlight && highlight !== seen) {
    setSeen(highlight);
    setFilter('all');
    setQuery('');
    setClosed({});
  }
  const groups = useQuery<Group>(EVENT_SQL.groups);
  const q = query.trim().toLowerCase();
  const events = useQuery<EventRow>(EVENT_SQL.events).filter(
    // 할 일 탭에서는 완료하면 '완료' 필터로만 옮겨 간다
    (e) =>
      matchesFilter(e, filter, today) &&
      (filter === 'done' || !e.completed_at) &&
      (!q || e.title.toLowerCase().includes(q) || !!e.description?.toLowerCase().includes(q)),
  );

  const sections = [
    {
      id: 'none',
      name: '할 일',
      items: events.filter((e) => !e.group_id).sort(filter === 'done' ? byCompletedDesc : compareTasks),
      manual: false,
    },
    ...groups.map((g) => ({
      id: g.id,
      name: g.name,
      items: events.filter((e) => e.group_id === g.id).sort(filter === 'done' ? byCompletedDesc : byManualOrder),
      manual: true,
    })),
  ].filter((sec) => sec.items.length > 0);

  // 필터나 검색으로 일부만 보일 때 순서를 매기면 숨은 항목과 겹치므로 '전체'이고 검색어가 없을 때만 허용
  const canReorder = filter === 'all' && !q && sections.some((sec) => sec.manual && sec.items.length > 1);
  const reordering = reorder && canReorder;

  const move = (items: EventRow[], i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const ids = items.map((e) => e.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setOrder(db, ids);
  };

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-background"
      contentContainerClassName="px-5 pb-20"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View className="flex-row items-end justify-between">
        <LargeTitle title="할 일" />
        {canReorder && (
          <Pressable
            onPress={() => setReorder(!reorder)}
            hitSlop={8}
            className="mb-3 min-h-9 justify-center active:opacity-60"
            accessibilityRole="button"
          >
            <Text className="text-[15px] font-semibold text-accent">{reordering ? '완료' : '순서 바꾸기'}</Text>
          </Pressable>
        )}
      </View>
      <SearchField value={query} onChangeText={setQuery} placeholder="검색" accessibilityLabel="할 일 검색" />
      <View className="mt-3">
        <Segmented options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {sections.length === 0 && (
        <Text className="py-16 text-center text-[15px] text-muted">
          {q
            ? '검색 결과가 없어요.'
            : filter === 'done'
              ? '아직 완료한 할 일이 없어요.'
              : '할 일이 없어요.\n오른쪽 위 +를 눌러 추가해 보세요.'}
        </Text>
      )}
      {sections.map((sec) => {
        return (
          <View key={sec.id}>
            <Pressable
              className="mt-7 mb-2 min-h-8 flex-row items-center gap-2 px-1 active:opacity-60"
              onPress={() => setClosed({ ...closed, [sec.id]: !closed[sec.id] })}
              accessibilityRole="button"
              accessibilityState={{ expanded: !closed[sec.id] }}
            >
              <Text className="text-[15px] font-semibold">{sec.name}</Text>
              <Badge label={String(sec.items.length)} />
              <View className="flex-1" />
              <Icon name={closed[sec.id] ? 'chevron-right' : 'chevron-down'} size={13} tint={c.sub} />
            </Pressable>
            {!closed[sec.id] && (
              <TaskList
                tasks={sec.items}
                today={today}
                onToggle={(e) => toggleTask(db, e, today)}
                onOpen={(e) => router.push({ pathname: '/event', params: { id: e.id } })}
                highlight={highlight}
                scrollRef={scrollRef}
                right={(e, i) =>
                  reordering && sec.manual ? (
                    <View className="flex-row">
                      <Pressable
                        onPress={() => move(sec.items, i, -1)}
                        className="h-11 w-9 items-center justify-center"
                        accessibilityLabel={`${e.title} 위로`}
                      >
                        <Icon name="arrow-up" size={15} tint={c.accent} />
                      </Pressable>
                      <Pressable
                        onPress={() => move(sec.items, i, 1)}
                        className="h-11 w-9 items-center justify-center"
                        accessibilityLabel={`${e.title} 아래로`}
                      >
                        <Icon name="arrow-down" size={15} tint={c.accent} />
                      </Pressable>
                    </View>
                  ) : undefined
                }
              />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
