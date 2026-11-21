import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { createGroup, EVENT_SQL, type EventRow, type Group, type Repeat, restoreEvent, saveEvent, softDeleteEvent } from '@/entities/event';
import { useQuery } from '@/shared/db';
import { addDays, fieldErrors, formatDateTime, formatMD, iGa, useFocusAfterTransition, useToday } from '@/shared/lib';
import {
  ActionButton,
  confirm,
  Chip,
  FieldError,
  FormScreen,
  Icon,
  Input,
  Section,
  Segmented,
  SheetHeader,
  showToast,
  showUndo,
  Text,
  useCardStyle,
  useColor,
  useSheetGuard,
} from '@/shared/ui';
import { eventSchema } from '../model/schema';
import { DateRow } from './DateRow';

const REPEATS = [
  ['none', '안 함'],
  ['daily', '매일'],
  ['weekly', '매주'],
  ['monthly', '매월'],
] as const;
const QUICK = [
  ['none', '없음'],
  ['today', '오늘'],
  ['tomorrow', '내일'],
] as const;
const PRIORITIES = [
  ['1', '1'],
  ['2', '2'],
  ['3', '3'],
  ['4', '4'],
  ['5', '5'],
] as const;
const PRIORITY_NAME = ['', '매우 낮음', '낮음', '보통', '높음', '매우 높음'];

// S07 일정·할 일 편집 시트. 날짜를 비우면 '날짜 없는 할 일'(E-01)
export function EventPage() {
  const db = useSQLiteContext();
  const c = useColor();
  const card = useCardStyle();
  const today = useToday();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const tomorrow = addDays(today, 1);
  const titleRef = useFocusAfterTransition(!params.id);
  const groups = useQuery<Group>(EVENT_SQL.groups);

  const [ev, setEv] = useState<EventRow | null>(null);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(params.date ?? '');
  const [end, setEnd] = useState('');
  const [priority, setPriority] = useState(3);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState('');
  const [description, setDescription] = useState('');
  const [completed, setCompleted] = useState(false);
  const [rrule, setRrule] = useState<Repeat | null>(null);
  // 저장을 누른 횟수. 0보다 크면 오류를 보여 주고, 바뀔 때마다 오류 칸이 다시 흔들린다
  const [attempts, setAttempts] = useState(0);
  const [loaded, setLoaded] = useState(!params.id);
  const [addingGroup, setAddingGroup] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    db.getFirstAsync<EventRow>('SELECT * FROM events WHERE id = ?', params.id).then((e) => {
      if (!e) return;
      setEv(e);
      setTitle(e.title);
      setStart(e.start_date ?? '');
      setEnd(e.end_date && e.end_date !== e.start_date ? e.end_date : '');
      setPriority(e.priority);
      setGroupId(e.group_id);
      setDescription(e.description ?? '');
      setCompleted(!!e.completed_at);
      setRrule(e.rrule);
      setLoaded(true);
    });
  }, [db, params.id]);

  const { close } = useSheetGuard(JSON.stringify([title, start, end, priority, groupId, newGroup, description, completed, rrule]), loaded);

  const errors = fieldErrors(eventSchema, { title, start, end });
  const shown = attempts ? errors : {};

  const save = async () => {
    setAttempts(attempts + 1);
    const first = Object.values(errors)[0];
    if (first) {
      // 제목 오류는 칸 아래 문구로 알린다. 칸이 없는 오류만 토스트
      if (!errors.title) showToast({ message: first, tone: 'error' });
      return;
    }
    const gid = newGroup.trim() ? await createGroup(db, newGroup.trim()) : groupId;
    const savedId = await saveEvent(
      db,
      ev?.id ?? null,
      {
        title: title.trim(),
        description: description.trim() || null,
        start_date: start || null,
        end_date: start && end ? end : null,
        priority,
        group_id: gid,
        completed,
        rrule,
      },
      ev?.completed_at ?? null,
      today,
    );
    if (ev) return close();
    // FR-01: 새 할 일은 그 할 일이 보이는 탭으로 옮겨 잠시 강조한다. 오늘에 걸치면 오늘 탭, 아니면 할 일 탭
    const onToday = !!start && start <= today && (end || start) >= today;
    close({ pathname: onToday ? '/' : '/tasks', params: { highlight: savedId } });
  };

  const remove = () => {
    if (!ev) return;
    confirm({
      title: '할 일을 삭제할까요?',
      message: `${iGa(`‘${ev.title}’`)} 목록에서 지워져요.`,
      confirmLabel: '삭제',
      destructive: true,
    }).then(async (ok) => {
      if (!ok) return;
      await softDeleteEvent(db, ev.id);
      close();
      showUndo('할 일을 삭제했어요', () => restoreEvent(db, ev.id));
    });
  };

  return (
    <FormScreen header={<SheetHeader title={params.id ? '할 일 편집' : '할 일 추가'} onSave={save} />}>
      <Section title="제목">
        <Input
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          placeholder="무엇을 할까요?"
          ref={titleRef}
          accessibilityLabel="제목"
          invalid={!!shown.title}
          shakeKey={attempts}
        />
        <FieldError message={shown.title} />
      </Section>

      <Section title="날짜">
        <Segmented
          options={QUICK}
          // 오늘·내일이 아닌 날짜면 고른 칸을 두지 않는다(실제 날짜와 다른 칸이 선택돼 보이지 않게)
          value={start === '' ? 'none' : start === today ? 'today' : start === tomorrow ? 'tomorrow' : null}
          onChange={(q) => {
            if (q === 'none') return (setStart(''), setEnd(''), setRrule(null));
            const d = q === 'today' ? today : tomorrow;
            setStart(d);
            if (end && end < d) setEnd('');
          }}
        />
      </Section>

      <View className="gap-1.5">
        <View className="rounded-[20px] bg-card" style={card}>
          <DateRow
            label="시작일"
            value={start}
            empty="없음"
            fallback={today}
            range={end ? { start, end } : undefined}
            onChange={(d) => {
              setStart(d);
              if (end && end < d) setEnd('');
            }}
          />
          {start !== '' && (
            <DateRow
              label="종료일"
              value={end}
              empty="여러 날일 때"
              fallback={start}
              min={start}
              range={end ? { start, end } : undefined}
              onChange={setEnd}
              onClear={end !== '' ? () => setEnd('') : undefined}
              divider
            />
          )}
        </View>
      </View>

      {start !== '' && (
        <Section title="반복">
          <Segmented options={REPEATS} value={rrule ?? 'none'} onChange={(r) => setRrule(r === 'none' ? null : r)} />
        </Section>
      )}

      {/* FR-10: 중요도·그룹·메모는 처음부터 보인다 */}
      <Section title="중요도" value={PRIORITY_NAME[priority]}>
        <Segmented
          options={PRIORITIES}
          value={String(priority)}
          onChange={(v) => setPriority(Number(v))}
          captions={['낮음', '매우 높음']}
        />
      </Section>

      <Section title="그룹">
        <View className="flex-row flex-wrap gap-2">
          <Chip label="없음" on={!groupId && !newGroup} onPress={() => (setGroupId(null), setNewGroup(''), setAddingGroup(false))} />
          {groups.map((g) => (
            <Chip
              key={g.id}
              label={g.name}
              on={groupId === g.id && !newGroup}
              onPress={() => (setGroupId(g.id), setNewGroup(''), setAddingGroup(false))}
            />
          ))}
          {!addingGroup && !newGroup && (
            <Chip
              label="새 그룹"
              on={false}
              outline
              icon={<Icon name="plus" size={12} tint={c.text} />}
              onPress={() => setAddingGroup(true)}
            />
          )}
        </View>
        {(addingGroup || !!newGroup) && (
          <Input value={newGroup} onChangeText={setNewGroup} placeholder="새 그룹 이름" autoFocus accessibilityLabel="새 그룹 이름" />
        )}
      </Section>

      <Section title="메모">
        <Input multiline value={description} onChangeText={setDescription} placeholder="메모를 남겨 보세요" accessibilityLabel="메모" />
      </Section>

      {ev && (
        <View className="min-h-14 flex-row items-center rounded-[20px] bg-card px-4 py-2" style={card}>
          <View className="flex-1">
            <Text className="text-[16px] leading-[22px] font-medium">완료</Text>
            {/* FR-03: 완료 시각과, 일찍 끝내서 줄어든 경우 원래 예정 기간 */}
            {ev.completed_at && (
              <Text className="text-[13px] leading-[18px] text-muted">
                {formatDateTime(ev.completed_at, today)}에 완료했어요
                {ev.planned_start && ev.planned_end
                  ? ` · 원래 기간 ${formatMD(ev.planned_start, today)} – ${formatMD(ev.planned_end, today)}`
                  : ''}
              </Text>
            )}
          </View>
          {/* RN Switch는 부모의 items-center를 따르지 않고 행 위에 붙어서(iOS 26+) 직접 가운데로 둔다 */}
          <Switch
            value={completed}
            onValueChange={setCompleted}
            trackColor={{ true: c.accent }}
            accessibilityLabel="완료"
            className="self-center"
          />
        </View>
      )}

      {ev && <ActionButton label="할 일 삭제" tone="danger" icon="trash" onPress={remove} />}
    </FormScreen>
  );
}
