/**
 * 오늘 진행 집계. 주 N회 습관이 이번 주 목표를 이미 채웠고 오늘은 안 했으면 오늘 분모에서 빼고 '이번 주 완료'로 보여 준다.
 * 오늘 링과 캘린더 날짜 패널이 같은 함수를 써서 숫자가 어긋나지 않는다
 */
export type HabitForDay = {
  doneToday: boolean;
  /** 주 N회 습관만. 그 주에 한 횟수와 목표 */
  weekly?: { done: number; target: number };
};

export type HabitDayState = 'done' | 'todo' | 'weekDone';

export function habitDayState(h: HabitForDay): HabitDayState {
  if (h.doneToday) return 'done';
  if (h.weekly && h.weekly.done >= h.weekly.target) return 'weekDone';
  return 'todo';
}

/** 주 N회 습관의 캡션: '이번 주 2/3', 채우면 '이번 주 3/3 완료' */
export function weeklyCaption(weekly: { done: number; target: number }): string {
  return `이번 주 ${weekly.done}/${weekly.target}${weekly.done >= weekly.target ? ' 완료' : ''}`;
}

export type Tally = { done: number; total: number };

export function habitTally(habits: HabitForDay[]): Tally {
  let done = 0;
  let total = 0;
  for (const h of habits) {
    const s = habitDayState(h);
    if (s === 'weekDone') continue;
    total++;
    if (s === 'done') done++;
  }
  return { done, total };
}
