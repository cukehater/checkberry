import { dailyRate, streak } from '../habits';

describe('streak (H-08 규칙 1·2·5)', () => {
  const habit = { id: 'h', start_date: '2026-10-01', archived_on: null };
  const set = (...d: string[]) => new Set(d);

  test('오늘 미체크면 어제부터 센다', () => {
    const done = set('2026-11-16', '2026-11-17');
    expect(streak(habit, done, '2026-11-18').current).toBe(2);
    expect(streak(habit, set(...done, '2026-11-18'), '2026-11-18').current).toBe(3);
  });
  test('하루 빠지면 끊긴다', () => {
    expect(streak(habit, set('2026-11-15', '2026-11-17'), '2026-11-18')).toEqual({ current: 1, longest: 1 });
  });
  test('월 경계를 넘어 이어진다', () => {
    expect(streak(habit, set('2026-10-30', '2026-10-31', '2026-11-01'), '2026-11-01').current).toBe(3);
  });
  test('시작일 이전 기록은 세지 않는다', () => {
    const h = { ...habit, start_date: '2026-11-17' };
    expect(streak(h, set('2026-11-16', '2026-11-17', '2026-11-18'), '2026-11-18')).toEqual({ current: 2, longest: 2 });
  });
  test('보관 이후 날짜는 건너뛰고 보관 직전까지 센다', () => {
    const h = { ...habit, archived_on: '2026-11-10' };
    expect(streak(h, set('2026-11-08', '2026-11-09', '2026-11-12'), '2026-11-18')).toEqual({ current: 2, longest: 2 });
  });
  test('최장 streak', () => {
    const done = set('2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-17');
    expect(streak(habit, done, '2026-11-18')).toEqual({ current: 1, longest: 4 });
  });
});

describe('dailyRate (H-07, H-02)', () => {
  const habits = [
    { id: 'a', start_date: '2026-11-01', archived_on: null },
    { id: 'b', start_date: '2026-11-01', archived_on: '2026-11-10' },
    { id: 'c', start_date: '2026-11-15', archived_on: null },
  ];
  test('보관·시작일에 따라 분모가 바뀐다', () => {
    expect(dailyRate(habits, (id) => id === 'a', '2026-11-05')).toBe(50);
    expect(dailyRate(habits, (id) => id === 'a', '2026-11-12')).toBe(100);
    expect(dailyRate(habits, (id) => id === 'a', '2026-11-16')).toBe(50);
    expect(dailyRate([...habits, { id: 'd', start_date: '2026-11-01', archived_on: null }], (id) => id === 'a', '2026-11-16')).toBe(33.3);
    expect(dailyRate(habits, () => true, '2026-10-01')).toBeNull();
  });
});
