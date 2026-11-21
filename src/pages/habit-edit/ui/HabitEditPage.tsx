import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  type Habit,
  HABIT_SQL,
  HabitChip,
  HabitIcon,
  type HabitLog,
  habitRate30,
  ICON_KEYS,
  ICON_LABELS,
  parseWeekdays,
  restoreHabit,
  saveHabit,
  setHabitArchived,
  softDeleteHabit,
  streak,
} from '@/entities/habit';
import { useQuery } from '@/shared/db';
import { cn, fieldErrors, useFocusAfterTransition, useToday, WEEKDAY_KO } from '@/shared/lib';
import {
  ActionButton,
  confirm,
  Chip,
  DateField,
  FormScreen,
  Input,
  ListGroup,
  Section,
  SheetHeader,
  showUndo,
  Text,
  useColor,
  useSheetGuard,
} from '@/shared/ui';
import { habitSchema } from '../model/schema';

type Frequency = 'daily' | 'weekdays' | 'weekly';
const FREQUENCIES: [Frequency, string][] = [
  ['daily', '매일'],
  ['weekdays', '요일 지정'],
  ['weekly', '주 N회'],
];
const STREAK_UNIT: Record<Frequency, string> = { daily: '일', weekdays: '회', weekly: '주' };

// S06 습관 등록·편집(3-2-1). 완료 체크형, 주기는 매일·요일 지정·주 N회
export function HabitEditPage({ id }: { id?: string }) {
  const db = useSQLiteContext();
  const c = useColor();
  const today = useToday();
  const nameRef = useFocusAfterTransition(!id);
  const [habit, setHabit] = useState<Habit | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>('check');
  const [startDate, setStartDate] = useState(today);
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const logs = useQuery<HabitLog>(HABIT_SQL.logsOf, [id ?? '']);
  const [submitted, setSubmitted] = useState(false);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    if (!id) return;
    db.getFirstAsync<Habit>('SELECT * FROM habits WHERE id = ?', id).then((h) => {
      if (!h) return;
      setHabit(h);
      setName(h.name);
      setIcon(h.icon_key);
      setStartDate(h.start_date);
      setFrequency(h.frequency_type as Frequency);
      setWeekdays([...parseWeekdays(h.weekdays)]);
      setWeeklyTarget(h.weekly_target ?? 3);
      setLoaded(true);
    });
  }, [db, id]);

  const { close } = useSheetGuard(JSON.stringify([name, icon, startDate, frequency, weekdays, weeklyTarget]), loaded);
  // 통계는 저장된 습관 기준(편집 중인 값이 아니라)
  const stats = habit
    ? (() => {
        const done = new Set(logs.map((l) => l.log_date));
        const st = streak(habit, done, today);
        const unit = STREAK_UNIT[habit.frequency_type as Frequency] ?? '일';
        const rate = habitRate30(habit, done, today);
        return [
          ['현재 연속', `${st.current}${unit}`],
          ['최장 연속', `${st.longest}${unit}`],
          ['최근 30일', rate == null ? '-' : `${rate}%`],
        ] as const;
      })()
    : null;
  const trimmed = name.trim();
  const errors = fieldErrors(habitSchema, { name, startDate, frequency, weekdays, weeklyTarget });
  const shown = submitted ? errors : {};

  const save = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    await saveHabit(db, id ?? null, {
      name: trimmed,
      icon_key: icon,
      icon_manual: true,
      start_date: startDate,
      frequency_type: frequency,
      weekdays: frequency === 'weekdays' ? [...weekdays].sort().join(',') : null,
      weekly_target: frequency === 'weekly' ? weeklyTarget : null,
    });
    close();
  };

  const toggleArchive = () => {
    if (!habit) return;
    if (habit.archived_on) {
      setHabitArchived(db, habit.id, null).then(() => close());
      return;
    }
    confirm({
      title: '습관을 보관할까요?',
      message: '오늘부터 달성률 계산에서 빠져요. 지난 기록은 그대로 남아요.',
      confirmLabel: '보관',
    }).then((ok) => {
      if (ok) setHabitArchived(db, habit.id, today).then(() => close());
    });
  };

  const remove = () => {
    if (!habit) return;
    confirm({
      title: '습관을 삭제할까요?',
      message: `'${habit.name}' 습관과 기록이 목록에서 사라져요.`,
      confirmLabel: '삭제',
      destructive: true,
    }).then(async (ok) => {
      if (!ok) return;
      await softDeleteHabit(db, habit.id);
      close();
      showUndo('습관을 삭제했어요', () => restoreHabit(db, habit.id));
    });
  };

  return (
    <FormScreen>
      <SheetHeader onSave={save} />
      <ListGroup className="py-4">
        <View className="flex-row items-center gap-3" accessibilityLabel="미리보기">
          <HabitChip iconKey={icon} size={44} />
          <Text className={cn('flex-1 text-[22px] font-bold', !trimmed && 'text-muted')}>{trimmed || '습관 이름'}</Text>
        </View>
        {stats && (
          <View className="mt-4 flex-row border-t-[0.5px] border-separator pt-4">
            {stats.map(([label, value]) => (
              <View key={label} className="flex-1 gap-0.5">
                <Text className="text-[13px] text-muted">{label}</Text>
                <Text className="text-[20px] font-semibold tabular-nums">{value}</Text>
              </View>
            ))}
          </View>
        )}
      </ListGroup>

      <Section title="이름">
        <Input
          value={name}
          onChangeText={setName}
          maxLength={40}
          placeholder="예: 책 20쪽 읽기"
          ref={nameRef}
          accessibilityLabel="습관 이름"
        />
        {shown.name && <Text className="px-4 text-[13px] text-danger">{shown.name}</Text>}
      </Section>

      <Section title="아이콘">
        <View className="flex-row flex-wrap gap-2">
          {ICON_KEYS.map((k) => (
            <Pressable
              key={k}
              onPress={() => setIcon(k)}
              className={cn(
                'h-11 w-11 items-center justify-center rounded-lg border active:opacity-70',
                k === icon ? 'border-accent bg-accent-soft' : 'border-separator bg-card',
              )}
              accessibilityRole="button"
              accessibilityState={{ selected: k === icon }}
              accessibilityLabel={`${ICON_LABELS[k]} 아이콘`}
            >
              <HabitIcon iconKey={k} size={19} tint={k === icon ? c.accent : c.sub} filled={k === icon} />
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="주기">
        <View className="flex-row flex-wrap gap-2">
          {FREQUENCIES.map(([f, label]) => (
            <Chip key={f} label={label} on={frequency === f} onPress={() => setFrequency(f)} />
          ))}
        </View>
        {frequency === 'weekdays' && (
          <View className="flex-row justify-between">
            {WEEKDAY_KO.map((w, i) => {
              const on = weekdays.includes(i);
              return (
                <Pressable
                  key={w}
                  onPress={() => setWeekdays(on ? weekdays.filter((x) => x !== i) : [...weekdays, i])}
                  className={cn(
                    'h-11 w-11 items-center justify-center rounded-lg border active:opacity-70',
                    on ? 'border-accent bg-accent-soft' : 'border-separator bg-card',
                  )}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${w}요일`}
                >
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      on && 'font-semibold text-accent-soft-foreground',
                      !on && i === 0 && 'text-danger',
                    )}
                  >
                    {w}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {frequency === 'weekly' && (
          <View className="flex-row flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Chip key={n} label={`주 ${n}회`} on={weeklyTarget === n} onPress={() => setWeeklyTarget(n)} />
            ))}
          </View>
        )}
        {shown.weekdays && <Text className="px-4 text-[13px] text-danger">{shown.weekdays}</Text>}
      </Section>

      <Section title="시작일">
        <DateField label="시작일" value={startDate} fallback={today} onChange={setStartDate} />
        {shown.startDate && <Text className="px-4 text-[13px] text-danger">{shown.startDate}</Text>}
      </Section>

      {habit && (
        <View className="mt-4 gap-1">
          <ActionButton label={habit.archived_on ? '보관 해제' : '보관'} tone="plain" onPress={toggleArchive} />
          <ActionButton label="습관 삭제" tone="danger" onPress={remove} />
        </View>
      )}
    </FormScreen>
  );
}
