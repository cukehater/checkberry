import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { createGroup, EVENT_SQL, type EventRow, type Group, type Repeat, restoreEvent, saveEvent, softDeleteEvent } from '@/entities/event';
import { useQuery } from '@/shared/db';
import { addDays, fieldErrors, formatDateTime, formatMD, useFocusAfterTransition, useToday } from '@/shared/lib';
import {
  ActionButton,
  confirm,
  Chip,
  DateField,
  FormScreen,
  Input,
  PriorityPicker,
  Section,
  SheetHeader,
  showUndo,
  Text,
  useColor,
  useSheetGuard,
} from '@/shared/ui';
import { eventSchema } from '../model/schema';

const REPEATS: [Repeat | null, string][] = [
  [null, '안 함'],
  ['daily', '매일'],
  ['weekly', '매주'],
  ['monthly', '매월'],
];

// S07 일정·할 일 편집 시트. 날짜를 비우면 '날짜 없는 할 일'(E-01)
export function EventPage() {
  const db = useSQLiteContext();
  const c = useColor();
  const today = useToday();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
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
  const [submitted, setSubmitted] = useState(false);
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
  const shown = submitted ? errors : {};

  const save = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return;
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
    confirm({ title: '할 일을 삭제할까요?', message: `'${ev.title}'`, confirmLabel: '삭제', destructive: true }).then(async (ok) => {
      if (!ok) return;
      await softDeleteEvent(db, ev.id);
      close();
      showUndo('할 일을 삭제했어요', () => restoreEvent(db, ev.id));
    });
  };

  return (
    <FormScreen>
      <SheetHeader onSave={save} />
      <Section title="제목">
        <Input
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          placeholder="무엇을 할까요?"
          ref={titleRef}
          accessibilityLabel="제목"
        />
        {shown.title && <Text className="px-4 text-[13px] text-danger">{shown.title}</Text>}
      </Section>

      <Section title="날짜">
        <View className="flex-row gap-2">
          <Chip label="없음" on={start === ''} onPress={() => (setStart(''), setEnd(''), setRrule(null))} />
          <Chip label="오늘" on={start === today} onPress={() => setStart(today)} />
          <Chip label="내일" on={start === addDays(today, 1)} onPress={() => setStart(addDays(today, 1))} />
        </View>
        <DateField
          label="시작일"
          value={start}
          fallback={today}
          onChange={(d) => {
            setStart(d);
            if (end && end < d) setEnd('');
          }}
        />
        {start !== '' && (
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <DateField label="종료일 (여러 날일 때)" value={end} fallback={start} min={start} onChange={setEnd} />
            </View>
            {end !== '' && <Chip label="지우기" on={false} onPress={() => setEnd('')} />}
          </View>
        )}
        {shown.start && <Text className="px-4 text-[13px] text-danger">{shown.start}</Text>}
        {shown.end && <Text className="px-4 text-[13px] text-danger">{shown.end}</Text>}
      </Section>

      {start !== '' && (
        <Section title="반복">
          <View className="flex-row flex-wrap gap-2">
            {REPEATS.map(([r, label]) => (
              <Chip key={label} label={label} on={rrule === r} onPress={() => setRrule(r)} />
            ))}
          </View>
        </Section>
      )}

      {/* FR-10: 중요도·그룹·메모는 처음부터 보인다 */}
      <Section title="중요도">
        <PriorityPicker value={priority} onChange={setPriority} />
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
          {!addingGroup && !newGroup && <Chip label="+ 새 그룹" on={false} onPress={() => setAddingGroup(true)} />}
        </View>
        {(addingGroup || !!newGroup) && (
          <Input value={newGroup} onChangeText={setNewGroup} placeholder="새 그룹 이름" autoFocus accessibilityLabel="새 그룹 이름" />
        )}
      </Section>

      <Section title="메모">
        <Input multiline value={description} onChangeText={setDescription} placeholder="메모를 남겨 보세요" accessibilityLabel="메모" />
      </Section>

      {ev && (
        <View className="gap-1.5">
          <View className="min-h-12 flex-row items-center rounded-lg border border-field-border bg-field px-4">
            <Text className="flex-1 text-[17px]">완료</Text>
            {/* RN Switch는 부모의 items-center를 따르지 않고 행 위에 붙어서(iOS 26+) 직접 가운데로 둔다 */}
            <Switch
              value={completed}
              onValueChange={setCompleted}
              trackColor={{ true: c.accent }}
              accessibilityLabel="완료"
              className="self-center"
            />
          </View>
          {/* FR-03: 완료 시각과, 일찍 끝내서 줄어든 경우 원래 예정 기간 */}
          {ev.completed_at && (
            <Text className="px-4 text-[13px] leading-[18px] text-muted">
              {formatDateTime(ev.completed_at, today)}에 완료했어요
              {ev.planned_start && ev.planned_end
                ? ` · 원래 기간 ${formatMD(ev.planned_start, today)} – ${formatMD(ev.planned_end, today)}`
                : ''}
            </Text>
          )}
        </View>
      )}

      {ev && (
        <View className="mt-4">
          <ActionButton label="할 일 삭제" tone="danger" onPress={remove} />
        </View>
      )}
    </FormScreen>
  );
}
