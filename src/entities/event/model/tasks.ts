import { addDays, type DateStr, daysInMonth, diffDays } from '@/shared/lib';

export type DDay = { label: string; overdue: boolean };

/** E-08: 미래 D-n, 당일 D-Day, 지났고 미완료 D+n(지연), 완료·날짜 없음은 표시 안 함 */
export function dday(
  task: { start_date: DateStr | null; end_date?: DateStr | null; completed_at: string | null },
  today: DateStr,
): DDay | null {
  if (task.completed_at || !task.start_date) return null;
  const n = diffDays(today, task.start_date);
  if (n > 0) return { label: `D-${n}`, overdue: false };
  // 기간 일정은 종료일까지 진행 중으로 본다
  const due = task.end_date ?? task.start_date;
  if (n === 0 || diffDays(today, due) >= 0) return { label: 'D-Day', overdue: false };
  return { label: `D+${-diffDays(today, due)}`, overdue: true };
}

/**
 * 중요도 3단계. 저장 값은 1(낮음)·3(보통)·5(높음)이고, 예전 5단계 값(2·4)이나 옛 백업도 범위로 읽는다.
 * 정렬은 값 그대로 내림차순이라 바뀌지 않는다
 */
export type Priority = 'low' | 'normal' | 'high';
export const PRIORITY_VALUE: Record<Priority, number> = { low: 1, normal: 3, high: 5 };
export const PRIORITY_NAME: Record<Priority, string> = { low: '낮음', normal: '보통', high: '높음' };
export const priorityOf = (value: number): Priority => (value < 3 ? 'low' : value > 3 ? 'high' : 'normal');

export type TaskLike = {
  start_date: DateStr | null;
  end_date: DateStr | null;
  completed_at: string | null;
  priority: number;
  sort_order: number;
};

/** 할 일 탭 그룹: 미완료 먼저, 그다음 손으로 정한 순서(E-11) */
export const byManualOrder = (a: TaskLike, b: TaskLike) =>
  Number(!!a.completed_at) - Number(!!b.completed_at) || a.sort_order - b.sort_order;

/** 오늘 탭 '오늘 할 일'·'날짜 없는 할 일': 미완료 먼저, 그다음 오늘 탭에서 정한 순서. 옛 백업을 복원해 모두 0이면 sort_order */
export const byTodayOrder = (a: TaskLike & { today_order: number }, b: TaskLike & { today_order: number }) =>
  Number(!!a.completed_at) - Number(!!b.completed_at) || a.today_order - b.today_order || a.sort_order - b.sort_order;

/** E-10: 미완료 우선 → 날짜 오름차순(날짜 없음은 뒤) → 중요도 내림차순 → 수동 순서 */
export function compareTasks(a: TaskLike, b: TaskLike): number {
  const done = Number(!!a.completed_at) - Number(!!b.completed_at);
  if (done) return done;
  if (a.start_date !== b.start_date) {
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return a.start_date < b.start_date ? -1 : 1;
  }
  return b.priority - a.priority || a.sort_order - b.sort_order;
}

/**
 * FR-03: 예정 기간이 끝나기 전에 완료하면 기간을 완료일까지로 줄인다(시작 전이면 완료일 하루로).
 * 원래 기간은 planned_*에 남긴다. 줄일 게 없으면 null
 */
export function earlyCompletion(task: { start_date: DateStr | null; end_date: DateStr | null }, today: DateStr) {
  if (!task.start_date) return null;
  const end = task.end_date ?? task.start_date;
  if (end <= today) return null;
  return {
    start_date: task.start_date < today ? task.start_date : today,
    end_date: today,
    planned_start: task.start_date,
    planned_end: end,
  };
}

export type TaskFilter = 'all' | 'today' | 'overdue' | 'nodate' | 'done';

export function matchesFilter(task: TaskLike, filter: TaskFilter, today: DateStr): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'done':
      return !!task.completed_at;
    case 'nodate':
      return !task.start_date;
    case 'today':
      return !!task.start_date && task.start_date <= today && (task.end_date ?? task.start_date) >= today;
    case 'overdue':
      return !task.completed_at && !!task.start_date && (task.end_date ?? task.start_date) < today;
  }
}

/** 날짜 범위 [from, to]와 겹치는지 */
export function overlaps(task: { start_date: DateStr | null; end_date: DateStr | null }, from: DateStr, to: DateStr) {
  if (!task.start_date) return false;
  return task.start_date <= to && (task.end_date ?? task.start_date) >= from;
}

export type Repeat = 'daily' | 'weekly' | 'monthly';

/** 매월: 같은 날짜, 그 달에 없는 날이면 마지막 날 */
function addOneMonth(date: DateStr): DateStr {
  const [y, m, d] = date.split('-').map(Number);
  const first = `${m === 12 ? y + 1 : y}-${String((m % 12) + 1).padStart(2, '0')}-01`;
  return `${first.slice(0, 8)}${String(Math.min(d, daysInMonth(first))).padStart(2, '0')}`;
}

const step = (date: DateStr, rule: Repeat) =>
  rule === 'daily' ? addDays(date, 1) : rule === 'weekly' ? addDays(date, 7) : addOneMonth(date);

/** 반복 할 일을 완료했을 때 옮겨 갈 날짜. 최소 한 번 넘기고, 오늘보다 뒤가 될 때까지 넘긴다 */
export function nextOccurrence(start: DateStr, rule: Repeat, today: DateStr): DateStr {
  let d = step(start, rule);
  while (d <= today) d = step(d, rule);
  return d;
}
