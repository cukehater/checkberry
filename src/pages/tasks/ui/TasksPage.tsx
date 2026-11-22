import { router, useScrollToTop } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import {
  byManualOrder,
  deleteGroup,
  EVENT_SQL,
  type EventRow,
  type Group,
  matchesFilter,
  renameGroup,
  setOrder,
  type TaskFilter,
  TaskList,
  toggleTask,
  useHighlight,
} from '@/entities/event';
import { useQuery } from '@/shared/db';
import { reorderIds, useToday } from '@/shared/lib';
import {
  confirm,
  duration,
  EmptyState,
  haptic,
  Icon,
  LargeTitle,
  Lozenge,
  SearchField,
  Segmented,
  showMenu,
  showUndo,
  Text,
  useColor,
  useTabBarInset,
} from '@/shared/ui';
import { GroupCard } from './GroupCard';
import { RenameGroupDialog } from './RenameGroupDialog';

const FILTERS: (readonly [TaskFilter, string])[] = [
  ['all', '전체'],
  ['today', '오늘'],
  ['overdue', '지연'],
  ['nodate', '날짜 없음'],
  ['done', '완료'],
];

// 완료 탭은 최근에 끝낸 순서
const byCompletedDesc = (a: EventRow, b: EventRow) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '');

// 묶음 카드가 생기고 빠질 때(필터, 그룹 삭제) 흐려지고, 아래 카드는 자리를 옮긴다. 화면을 처음 열 때는 바로 그린다
const SECTION_LAYOUT = LinearTransition.duration(duration.move).reduceMotion(ReduceMotion.System);
const SECTION_ENTER = FadeIn.duration(duration.color).reduceMotion(ReduceMotion.System);
const SECTION_EXIT = FadeOut.duration(160).reduceMotion(ReduceMotion.System);

// S03 할 일
export function TasksPage() {
  const db = useSQLiteContext();
  const c = useColor();
  const tabBarInset = useTabBarInset();
  const today = useToday();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState<Group | null>(null);
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
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
  const allEvents = useQuery<EventRow>(EVENT_SQL.events);
  // 제목 아래 상태 요약: 남은 할 일, 지연
  const remaining = allEvents.filter((e) => !e.completed_at).length;
  const overdueCount = allEvents.filter((e) => !e.completed_at && matchesFilter(e, 'overdue', today)).length;
  const events = allEvents.filter(
    // 할 일 탭에서는 완료하면 '완료' 필터로만 옮겨 간다
    (e) =>
      matchesFilter(e, filter, today) &&
      (filter === 'done' || !e.completed_at) &&
      (!q || e.title.toLowerCase().includes(q) || !!e.description?.toLowerCase().includes(q)),
  );

  const sections = [
    {
      id: 'none',
      // 화면 제목 '할 일'과 겹치지 않게. 시트의 그룹 칩 '없음'과 같은 뜻
      name: '그룹 없음',
      items: events.filter((e) => !e.group_id).sort(filter === 'done' ? byCompletedDesc : byManualOrder),
    },
    ...groups.map((g) => ({
      id: g.id,
      name: g.name,
      items: events.filter((e) => e.group_id === g.id).sort(filter === 'done' ? byCompletedDesc : byManualOrder),
    })),
  ].filter((sec) => sec.items.length > 0);

  // 끌어 옮긴 결과를 그 그룹 전체(필터·검색으로 숨은 항목 포함)에 적용한다. 숨은 항목끼리의 순서는 그대로다(E-11)
  const reorderIn = (groupId: string | null, visible: EventRow[], from: number, to: number) => {
    const full = allEvents.filter((e) => e.group_id === groupId).sort(byManualOrder);
    const ids = reorderIds(
      full.map((e) => e.id),
      visible.map((e) => e.id),
      from,
      to,
    );
    setOrder(db, ids);
  };

  // 그룹 머리 길게 누르기: 목록형 메뉴(이름 바꾸기·그룹 삭제). 삭제는 확인을 한 번 더 받고, 할 일은 그룹 없음으로 옮겨 남긴다
  const manageGroup = (g: Group, count: number) => {
    haptic.lift();
    showMenu({
      title: `${g.name} 그룹`,
      subtitle: `할 일 ${count}개`,
      items: [
        { icon: 'pencil', label: '이름 바꾸기', onPress: () => setRenaming(g) },
        { icon: 'trash', label: '그룹 삭제', destructive: true, onPress: () => removeGroup(g) },
      ],
    });
  };
  const removeGroup = async (g: Group) => {
    const ok = await confirm({
      title: '그룹을 삭제할까요?',
      message: `‘${g.name}’ 안의 할 일은 지우지 않고 그룹 없음으로 옮겨요.`,
      confirmLabel: '삭제',
      destructive: true,
    });
    if (!ok) return;
    haptic.destructive();
    const { restore } = await deleteGroup(db, g.id);
    showUndo('그룹을 삭제했어요', restore);
  };

  return (
    <View className="flex-1">
      {/* 키보드가 열려도 검색 결과 끝까지 올려 볼 수 있다. KeyboardAwareScrollView는 className 대상이 아니라 style로 지정한다 */}
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabBarInset }}
        bottomOffset={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View className="px-1">
          <LargeTitle
            title="할 일"
            chips={
              remaining > 0 && (
                <>
                  <Lozenge size="lg" label={`남은 할 일 ${remaining}개`} />
                  {overdueCount > 0 && <Lozenge size="lg" tone="danger" label={`지연 ${overdueCount}`} />}
                </>
              )
            }
          />
        </View>
        {allEvents.length === 0 ? (
          // 할 일이 하나도 없으면 검색·필터를 숨기고 빈 상태 카드만
          <EmptyState
            art="tasks"
            title="할 일이 없어요"
            body={'할 일을 추가하면 그룹별로 모아\n오늘 해야 할 것부터 보여 줘요.'}
            action={{ label: '할 일 추가', tone: 'task', onPress: () => router.push('/event') }}
          />
        ) : (
          <>
            <SearchField value={query} onChangeText={setQuery} placeholder="검색" accessibilityLabel="할 일 검색" />
            <View className="mt-3">
              <Segmented options={FILTERS} value={filter} onChange={setFilter} />
            </View>
          </>
        )}

        {allEvents.length > 0 && sections.length === 0 && (
          <View className="items-center gap-2.5 px-6 py-10">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-default">
              <Icon name={q ? 'search' : 'tasks'} size={24} tint={c.sub} />
            </View>
            <Text className="text-center text-[17px] leading-6 font-semibold">
              {q ? '검색 결과가 없어요.' : filter === 'done' ? '아직 완료한 할 일이 없어요.' : '이 조건의 할 일이 없어요.'}
            </Text>
          </View>
        )}
        <LayoutAnimationConfig skipEntering>
          {sections.map((sec) => {
            const open = !closed[sec.id];
            const group = groups.find((g) => g.id === sec.id);
            return (
              <Animated.View key={sec.id} className="mt-3" layout={SECTION_LAYOUT} entering={SECTION_ENTER} exiting={SECTION_EXIT}>
                <GroupCard
                  title={sec.name}
                  count={sec.items.length}
                  open={open}
                  onToggle={() => setClosed({ ...closed, [sec.id]: open })}
                  onLongPress={group && (() => manageGroup(group, sec.items.length))}
                >
                  <TaskList
                    flat
                    context={filter === 'today' ? 'sameDay' : 'list'}
                    tasks={sec.items}
                    today={today}
                    onToggle={(e) => toggleTask(db, e, today)}
                    onOpen={(e) => router.push({ pathname: '/event', params: { id: e.id } })}
                    highlight={highlight}
                    scrollRef={scrollRef}
                    // 완료 필터는 끝낸 순서라 옮기지 않는다
                    onReorder={filter === 'done' ? undefined : (from, to) => reorderIn(group?.id ?? null, sec.items, from, to)}
                  />
                </GroupCard>
              </Animated.View>
            );
          })}
        </LayoutAnimationConfig>
      </KeyboardAwareScrollView>
      {renaming && (
        <RenameGroupDialog
          name={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={(name) => {
            setRenaming(null);
            renameGroup(db, renaming.id, name);
          }}
        />
      )}
    </View>
  );
}
