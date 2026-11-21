import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  type Habit,
  HABIT_SQL,
  HabitChip,
  type HabitLog,
  habitRate30,
  iconLabel,
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
  CARD_SHADOW,
  confirm,
  FormScreen,
  Icon,
  Input,
  ListGroup,
  Section,
  Segmented,
  SheetHeader,
  showToast,
  showUndo,
  Text,
  useColor,
  useSheetGuard,
} from '@/shared/ui';
import { habitSchema } from '../model/schema';
import { DateCard } from './DateCard';
import { IconPicker } from './IconPicker';

type Frequency = 'daily' | 'weekdays' | 'weekly';
const FREQUENCIES = [
  ['daily', '매일'],
  ['weekdays', '요일 지정'],
  ['weekly', '주 N회'],
] as const;
const TIMES = (['1', '2', '3', '4', '5', '6'] as const).map((n) => [n, `${n}회`] as const);
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
  // 저장을 누른 횟수. 0보다 크면 오류를 보여 주고, 바뀔 때마다 오류 칸이 다시 흔들린다
  const [attempts, setAttempts] = useState(0);
  const [loaded, setLoaded] = useState(!id);
  const [picking, setPicking] = useState(false);

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
  const shown = attempts ? errors : {};

  const save = async () => {
    setAttempts(attempts + 1);
    const first = Object.values(errors)[0];
    if (first) return showToast({ message: first, tone: 'error' });
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
      <ListGroup className="px-0">
        <View className="items-center gap-2.5 px-4 pt-5 pb-4" accessibilityLabel="미리보기">
          <HabitChip iconKey={icon} size={64} />
          <Text className={cn('text-center text-[20px] leading-7 font-semibold tracking-[-0.3px]', !trimmed && 'text-muted')}>
            {trimmed || '습관 이름'}
          </Text>
        </View>
        {stats && (
          <View className="flex-row border-t-[0.5px] border-separator">
            {stats.map(([label, value]) => (
              <View key={label} className="flex-1 items-center gap-0.5 px-1 pt-3 pb-3.5">
                <Text className="text-[22px] leading-7 font-bold tracking-[-0.4px] tabular-nums">{value}</Text>
                <Text className="text-[13px] leading-[18px] text-muted">{label}</Text>
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
          invalid={!!shown.name}
          shakeKey={attempts}
        />
      </Section>

      <Pressable
        onPress={() => setPicking(true)}
        className="h-14 flex-row items-center gap-3 rounded-[20px] bg-card px-4 active:opacity-70"
        style={c.raised ? CARD_SHADOW : undefined}
        accessibilityRole="button"
        accessibilityLabel={`아이콘 고르기, 지금 ${iconLabel(icon)}`}
      >
        <HabitChip iconKey={icon} size={32} />
        <Text className="flex-1 text-[16px] font-medium">아이콘 고르기</Text>
        <Text className="max-w-[45%] text-[15px] text-muted" numberOfLines={1}>
          {iconLabel(icon)}
        </Text>
        <Icon name="chevron-right" size={14} tint={c.sub} />
      </Pressable>
      <IconPicker visible={picking} value={icon} onPick={setIcon} onClose={() => setPicking(false)} />

      <Section title="주기">
        <Segmented options={FREQUENCIES} value={frequency} onChange={setFrequency} />
      </Section>

      {frequency === 'weekdays' && (
        <Section title="요일">
          <View className="flex-row gap-1.5">
            {WEEKDAY_KO.map((w, i) => {
              const on = weekdays.includes(i);
              return (
                <Pressable
                  key={w}
                  onPress={() => setWeekdays(on ? weekdays.filter((x) => x !== i) : [...weekdays, i])}
                  className={cn('h-11 flex-1 items-center justify-center rounded-full active:opacity-70', on ? 'bg-accent' : 'bg-card')}
                  style={!on && c.raised ? CARD_SHADOW : undefined}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${w}요일`}
                >
                  <Text
                    className={cn(
                      'text-[15px] font-semibold',
                      on && 'text-accent-foreground',
                      !on && i === 0 && 'text-danger-soft-foreground',
                    )}
                  >
                    {w}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>
      )}

      {frequency === 'weekly' && (
        <Section title="주당 횟수">
          <Segmented options={TIMES} value={String(weeklyTarget)} onChange={(n) => setWeeklyTarget(Number(n))} />
        </Section>
      )}

      <DateCard label="시작일" value={startDate} onChange={setStartDate} />

      {habit && (
        <View className="gap-2.5">
          <ActionButton label={habit.archived_on ? '보관 해제' : '보관'} tone="plain" icon="archive" onPress={toggleArchive} />
          <ActionButton label="습관 삭제" tone="danger" icon="trash" onPress={remove} />
        </View>
      )}
    </FormScreen>
  );
}
