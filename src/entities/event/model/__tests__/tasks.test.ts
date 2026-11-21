import { compareTasks, dday, earlyCompletion, matchesFilter, nextOccurrence, weekBars } from '../tasks';

describe('dday (E-08)', () => {
  const today = '2026-11-18';
  test('미래·당일·지연·완료', () => {
    expect(dday({ start_date: '2026-11-21', completed_at: null }, today)).toEqual({ label: 'D-3', overdue: false });
    expect(dday({ start_date: today, completed_at: null }, today)).toEqual({ label: 'D-Day', overdue: false });
    expect(dday({ start_date: '2026-11-11', completed_at: null }, today)).toEqual({ label: 'D+7', overdue: true });
    expect(dday({ start_date: '2026-11-11', completed_at: '2026-11-12T00:00:00Z' }, today)).toBeNull();
    expect(dday({ start_date: null, completed_at: null }, today)).toBeNull();
  });
  test('기간 일정은 종료일까지 D-Day, 이후 종료일 기준 지연', () => {
    expect(dday({ start_date: '2026-11-16', end_date: '2026-11-19', completed_at: null }, today)?.label).toBe('D-Day');
    expect(dday({ start_date: '2026-11-10', end_date: '2026-11-15', completed_at: null }, today)?.label).toBe('D+3');
  });
});

describe('할 일 정렬·필터 (E-10)', () => {
  const t = (o: Partial<Parameters<typeof compareTasks>[0]>) => ({
    start_date: null,
    end_date: null,
    completed_at: null,
    priority: 3,
    sort_order: 0,
    ...o,
  });
  test('미완료 → 날짜 → 중요도', () => {
    const list = [
      t({ start_date: '2026-11-20', completed_at: 'x' }),
      t({ start_date: null }),
      t({ start_date: '2026-11-20', priority: 1 }),
      t({ start_date: '2026-11-20', priority: 5 }),
      t({ start_date: '2026-11-19' }),
    ].sort(compareTasks);
    expect(list.map((x) => [x.start_date, x.priority, !!x.completed_at])).toEqual([
      ['2026-11-19', 3, false],
      ['2026-11-20', 5, false],
      ['2026-11-20', 1, false],
      [null, 3, false],
      ['2026-11-20', 3, true],
    ]);
  });
  test('필터', () => {
    expect(matchesFilter(t({ start_date: '2026-11-11' }), 'overdue', '2026-11-18')).toBe(true);
    expect(matchesFilter(t({ start_date: '2026-11-11', completed_at: 'x' }), 'overdue', '2026-11-18')).toBe(false);
    expect(matchesFilter(t({ start_date: '2026-11-17', end_date: '2026-11-19' }), 'today', '2026-11-18')).toBe(true);
    expect(matchesFilter(t({}), 'nodate', '2026-11-18')).toBe(true);
  });
});

describe('반복 할 일 다음 날짜', () => {
  test('매일·매주는 오늘 이후 첫 날짜로 넘어간다', () => {
    expect(nextOccurrence('2026-11-18', 'daily', '2026-11-18')).toBe('2026-11-19');
    expect(nextOccurrence('2026-11-10', 'daily', '2026-11-18')).toBe('2026-11-19');
    expect(nextOccurrence('2026-11-04', 'weekly', '2026-11-18')).toBe('2026-11-25');
    expect(nextOccurrence('2026-11-20', 'weekly', '2026-11-18')).toBe('2026-11-27');
  });
  test('매월은 같은 날짜, 없는 날이면 그 달 마지막 날', () => {
    expect(nextOccurrence('2026-11-18', 'monthly', '2026-11-18')).toBe('2026-12-18');
    expect(nextOccurrence('2027-01-31', 'monthly', '2027-01-31')).toBe('2027-02-28');
  });
});

describe('earlyCompletion (FR-03)', () => {
  const today = '2026-11-18';
  test('기간 도중 완료하면 종료일을 오늘로 줄이고 원래 기간을 남긴다', () => {
    expect(earlyCompletion({ start_date: '2026-11-16', end_date: '2026-11-20' }, today)).toEqual({
      start_date: '2026-11-16',
      end_date: today,
      planned_start: '2026-11-16',
      planned_end: '2026-11-20',
    });
  });
  test('시작 전에 완료하면 오늘 하루로', () => {
    expect(earlyCompletion({ start_date: '2026-11-25', end_date: null }, today)).toMatchObject({ start_date: today, end_date: today });
  });
  test('이미 끝났거나 오늘 끝나거나 날짜가 없으면 그대로', () => {
    expect(earlyCompletion({ start_date: '2026-11-10', end_date: '2026-11-18' }, today)).toBeNull();
    expect(earlyCompletion({ start_date: '2026-11-10', end_date: null }, today)).toBeNull();
    expect(earlyCompletion({ start_date: null, end_date: null }, today)).toBeNull();
  });
});

describe('weekBars (캘린더 이어진 막대)', () => {
  const t = (id: string, start: string, end: string | null = null) => ({
    id,
    start_date: start,
    end_date: end,
    completed_at: null,
    priority: 3,
    sort_order: 0,
  });
  const week = '2026-11-15'; // 일요일
  test('주 경계에서 잘라 시작·끝 칸을 정한다', () => {
    const [bar] = weekBars([t('a', '2026-11-12', '2026-11-17')], week);
    expect(bar).toMatchObject({ startCol: 0, endCol: 2, lane: 0 });
  });
  test('겹치는 할 일은 다른 줄, 안 겹치면 같은 줄을 쓴다', () => {
    const bars = weekBars([t('long', '2026-11-16', '2026-11-19'), t('mid', '2026-11-18'), t('late', '2026-11-20')], week);
    const lane = (id: string) => bars.find((b) => b.task.id === id)!.lane;
    expect(lane('long')).toBe(0);
    expect(lane('mid')).toBe(1);
    expect(lane('late')).toBe(0);
  });
  test('주 밖이거나 날짜 없는 할 일은 빠진다', () => {
    expect(weekBars([t('x', '2026-11-25'), { ...t('y', '2026-11-16'), start_date: null }], week)).toEqual([]);
  });
});
