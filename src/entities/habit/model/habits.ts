import { addDays, type DateStr, weekday, weekStart } from '@/shared/lib';

export type HabitLike = {
  id: string;
  start_date: DateStr;
  archived_on: DateStr | null;
  /** 'daily' | 'weekdays'(지정 요일) | 'weekly'(주 N회). 없으면 daily */
  frequency_type?: string;
  /** weekdays일 때 '0,3,5' 형식(0=일) */
  weekdays?: string | null;
  /** weekly일 때 주당 목표 횟수 */
  weekly_target?: number | null;
};

const isWeekly = (h: HabitLike) => h.frequency_type === 'weekly';
const target = (h: HabitLike) => h.weekly_target || 1;

const weekdaysCache = new Map<string, Set<number>>();
/** '1,3,5' → {1,3,5}. 연속 기록 계산 루프에서 매번 불리므로 캐시한다 */
export function parseWeekdays(s?: string | null): Set<number> {
  const key = s ?? '';
  let v = weekdaysCache.get(key);
  if (!v) weekdaysCache.set(key, (v = new Set(key.split(',').filter(Boolean).map(Number))));
  return v;
}

/** 시작일 ≤ 그날 < 보관일 */
const active = (h: HabitLike, date: DateStr) => h.start_date <= date && (!h.archived_on || date < h.archived_on);

/** H-07: 그날 체크할 수 있는 습관. 요일 지정 습관은 그 요일에만, 주 N회 습관은 매일 */
export function isScheduled(habit: HabitLike, date: DateStr): boolean {
  if (!active(habit, date)) return false;
  if (habit.frequency_type === 'weekdays') return parseWeekdays(habit.weekdays).has(weekday(date));
  return true;
}

/** H-07: 완료 수 ÷ 예정 수 × 100, 소수 1자리. 주 N회 습관은 주 단위로 보므로 빠진다. 예정 습관이 없으면 null */
export function dailyRate(habits: HabitLike[], isDone: (habitId: string) => boolean, date: DateStr): number | null {
  const scheduled = habits.filter((h) => !isWeekly(h) && isScheduled(h, date));
  if (!scheduled.length) return null;
  const done = scheduled.filter((h) => isDone(h.id)).length;
  return Math.round((done / scheduled.length) * 1000) / 10;
}

/** 그 날짜가 속한 주(일~토)에 완료한 횟수 */
export function weekCount(doneDates: Set<DateStr>, date: DateStr): number {
  const s = weekStart(date);
  let n = 0;
  for (let i = 0; i < 7; i++) if (doneDates.has(addDays(s, i))) n++;
  return n;
}

/** 연속 기록을 셀 마지막 날. 보관했으면 보관 전날 */
const lastDay = (h: HabitLike, today: DateStr) => (h.archived_on && today >= h.archived_on ? addDays(h.archived_on, -1) : today);

/**
 * H-08 streak. 매일·요일 지정은 예정일 기준 연속 일수, 주 N회는 목표를 채운 연속 주 수.
 * - 오늘(이번 주)을 아직 못 채웠으면 끊지 않고 직전부터 센다
 * - 시작일 이전은 세지 않고, 보관일 이후는 건너뛴다
 */
export function streak(habit: HabitLike, doneDates: Set<DateStr>, today: DateStr): { current: number; longest: number } {
  const end = lastDay(habit, today);
  if (isWeekly(habit)) {
    const met = (w: DateStr) => weekCount(doneDates, w) >= target(habit);
    const first = weekStart(habit.start_date);
    let w = weekStart(end);
    if (end === today && !met(w)) w = addDays(w, -7);
    let current = 0;
    for (; w >= first && met(w); w = addDays(w, -7)) current++;
    let longest = 0;
    let run = 0;
    for (let x = first; x <= weekStart(end); x = addDays(x, 7)) {
      run = met(x) ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    return { current, longest: Math.max(longest, current) };
  }

  let d = end;
  if (end === today && isScheduled(habit, d) && !doneDates.has(d)) d = addDays(d, -1);
  let current = 0;
  for (; d >= habit.start_date; d = addDays(d, -1)) {
    if (!isScheduled(habit, d)) continue;
    if (!doneDates.has(d)) break;
    current++;
  }
  let longest = 0;
  let run = 0;
  for (let x = habit.start_date; x <= end; x = addDays(x, 1)) {
    if (!isScheduled(habit, x)) continue;
    run = doneDates.has(x) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return { current, longest: Math.max(longest, current) };
}

/** 최근 30일 달성률(정수 %). 주 N회는 최근 4주 완료 횟수 ÷ (목표 × 4). 예정일이 없으면 null */
export function habitRate30(habit: HabitLike, doneDates: Set<DateStr>, today: DateStr): number | null {
  if (isWeekly(habit)) {
    if (habit.start_date > today) return null;
    let n = 0;
    for (let i = 0; i < 28; i++) if (doneDates.has(addDays(today, -i))) n++;
    return Math.min(100, Math.round((n / (target(habit) * 4)) * 100));
  }
  let scheduled = 0;
  let done = 0;
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i);
    if (!isScheduled(habit, d)) continue;
    scheduled++;
    if (doneDates.has(d)) done++;
  }
  return scheduled ? Math.round((done / scheduled) * 100) : null;
}
