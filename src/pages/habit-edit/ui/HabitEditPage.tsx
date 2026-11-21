import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  type Habit,
  HABIT_SQL,
  HabitChip,
  type HabitLog,
  habitRate30,
  HabitTile,
  ICON_PREFIX,
  parseWeekdays,
  restoreHabit,
  saveHabit,
  saveHabitTrimmingLogs,
  setHabitArchived,
  softDeleteHabit,
  STAGE_NAME,
  streak,
  StreakArt,
  streakStage,
  nextStageCopy,
  streakUnit,
} from '@/entities/habit';
import { useQuery } from '@/shared/db';
import { cn, fieldErrors, gwaWa, useFocusAfterTransition, useToday, WEEKDAY_KO } from '@/shared/lib';
import {
  ActionButton,
  confirm,
  FieldError,
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
  useCardStyle,
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

// S06 습관 등록·편집(3-2-1). 완료 체크형, 주기는 매일·요일 지정·주 N회
export function HabitEditPage({ id }: { id?: string }) {
  const db = useSQLiteContext();
  const c = useColor();
  const card = useCardStyle();
  const today = useToday();
  const nameRef = useFocusAfterTransition(!id);
  const [habit, setHabit] = useState<Habit | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(`${ICON_PREFIX}sparkle`);
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
  // 통계는 저장된 습관 기준(편집 중인 값이 아니라). 단위는 배지와 같은 일·주
  const stats = habit
    ? (() => {
        const done = new Set(logs.map((l) => l.log_date));
        const st = streak(habit, done, today);
        const unit = streakUnit(habit);
        const rate = habitRate30(habit, done, today);
        return {
          current: st.current,
          unit,
          cells: [
            ['현재 연속', `${st.current}${unit}`],
            ['최장 연속', `${st.longest}${unit}`],
            ['최근 30일', rate == null ? '-' : `${rate}%`],
          ] as const,
        };
      })()
    : null;
  const trimmed = name.trim();
  const errors = fieldErrors(habitSchema, { name, startDate, frequency, weekdays, weeklyTarget });
  const shown = attempts ? errors : {};

  const save = async () => {
    setAttempts(attempts + 1);
    const first = Object.values(errors)[0];
    if (first) {
      // 이름 오류는 칸 아래 문구로 알린다. 칸이 없는 오류만 토스트
      if (!errors.name) showToast({ message: first, tone: 'error' });
      return;
    }
    const input = {
      name: trimmed,
      icon_key: icon,
      icon_manual: true,
      start_date: startDate,
      frequency_type: frequency,
      weekdays: frequency === 'weekdays' ? [...weekdays].sort().join(',') : null,
      weekly_target: frequency === 'weekly' ? weeklyTarget : null,
    };
    // 시작일을 뒤로 옮겨 그 전 체크 기록이 남게 되면, 확인을 받고 지운다(5초 실행취소)
    const before = habit ? logs.filter((l) => l.log_date < startDate).length : 0;
    if (habit && before > 0) {
      const ok = await confirm({
        title: '시작일 이전 기록을 지울까요?',
        message: `${before}개의 체크 기록이 지워져요.`,
        confirmLabel: '지우기',
        destructive: true,
      });
      if (!ok) return;
      const { restore } = await saveHabitTrimmingLogs(db, habit.id, input, habit.start_date);
      close();
      showUndo('시작일 이전 기록을 지웠어요', restore);
      return;
    }
    await saveHabit(db, id ?? null, input);
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
      message: `${gwaWa(`‘${habit.name}’`)} 지금까지의 기록이 모두 지워져요. 기록을 남기고 목록에서만 빼려면 보관을 고르세요.`,
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
    <FormScreen header={<SheetHeader title={id ? '습관 편집' : '습관 추가'} onSave={save} />}>
      {stats ? (
        // 편집: 습관 이름 줄 + 통계 세 칸 + 지금 연속 기록 단계 카드
        <ListGroup className="gap-3 py-4">
          <View className="flex-row items-center gap-2.5" accessibilityLabel="미리보기">
            <HabitChip iconKey={icon} size={32} />
            <Text className={cn('flex-1 text-[17px] leading-6 font-semibold', !trimmed && 'text-muted')} numberOfLines={1}>
              {trimmed || '습관 이름'}
            </Text>
          </View>
          <View className="flex-row">
            {stats.cells.map(([label, value]) => (
              <View key={label} className="flex-1 items-center gap-0.5 px-1">
                <Text className="text-[22px] leading-7 font-bold tracking-[-0.4px] tabular-nums">{value}</Text>
                <Text className="text-[13px] leading-[18px] text-muted">{label}</Text>
              </View>
            ))}
          </View>
          <View className="flex-row items-center gap-3 rounded-2xl bg-surface-secondary px-3 py-2.5">
            <StreakArt count={Math.max(stats.current, 1)} unit={stats.unit} size={48} loop />
            <View className="flex-1">
              <Text className="text-[15px] leading-5 font-semibold">{STAGE_NAME[streakStage(stats.current, stats.unit)]} 단계</Text>
              <Text className="mt-0.5 text-[13px] leading-[18px] text-muted">{nextStageCopy(stats.current, stats.unit)}</Text>
            </View>
          </View>
        </ListGroup>
      ) : (
        // 추가: 오늘 탭에 놓일 실제 타일 모양 그대로(키보드가 올라와도 아래 필드가 보이게 작게)
        // 화면 읽기 프로그램에는 체크 상자가 아니라 미리보기 한 덩어리로 읽힌다
        <View accessible accessibilityLabel={`미리보기, ${trimmed || '습관 이름'}. 오늘 탭에 이렇게 보여요`}>
          <ListGroup className="px-3 py-3">
            <HabitTile
              name={trimmed || '습관 이름'}
              iconKey={icon}
              state="todo"
              accessory={<Text className="text-[12px] text-muted">오늘 탭에 이렇게 보여요</Text>}
            />
          </ListGroup>
        </View>
      )}

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
        <FieldError message={shown.name} />
      </Section>

      <Pressable
        onPress={() => setPicking(true)}
        className="h-14 flex-row items-center gap-3 rounded-[20px] bg-card px-4 active:opacity-70"
        style={card}
        accessibilityRole="button"
        accessibilityLabel="아이콘 고르기"
      >
        <HabitChip iconKey={icon} size={32} />
        <Text className="flex-1 text-[16px] font-medium">아이콘 고르기</Text>
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
                  // 그룹 칩과 같은 회색(sunken) 원, 고르면 베리
                  className={cn('h-11 flex-1 items-center justify-center rounded-full active:opacity-70', on ? 'bg-accent' : 'bg-default')}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${w}요일`}
                >
                  <Text className={cn('text-[15px] font-semibold', on && 'text-accent-foreground')}>{w}</Text>
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
