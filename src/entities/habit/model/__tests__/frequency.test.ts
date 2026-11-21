import { dailyRate, habitRate30, isScheduled, streak, weekCount } from '../habits';

// 2026-11-15(일) ~ 2026-11-21(토)
const base = { id: 'h', start_date: '2026-10-01', archived_on: null };
const mwf = { ...base, frequency_type: 'weekdays', weekdays: '1,3,5' };
const weekly3 = { ...base, frequency_type: 'weekly', weekly_target: 3 };
const set = (...d: string[]) => new Set(d);

describe('습관 주기: 요일 지정', () => {
  test('지정한 요일만 예정', () => {
    expect(isScheduled(mwf, '2026-11-16')).toBe(true); // 월
    expect(isScheduled(mwf, '2026-11-17')).toBe(false); // 화
  });
  test('예정 없는 요일은 연속을 끊지 않는다', () => {
    // 금(11-13), 월(11-16), 수(11-18) 연속 수행
    expect(streak(mwf, set('2026-11-13', '2026-11-16', '2026-11-18'), '2026-11-19')).toEqual({ current: 3, longest: 3 });
  });
  test('예정일을 빠뜨리면 끊긴다', () => {
    expect(streak(mwf, set('2026-11-13', '2026-11-18'), '2026-11-19')).toEqual({ current: 1, longest: 1 });
  });
  test('오늘이 예정일인데 아직 안 했으면 직전 예정일부터 센다', () => {
    expect(streak(mwf, set('2026-11-16', '2026-11-18'), '2026-11-20').current).toBe(2);
  });
});

describe('습관 주기: 주 N회', () => {
  test('매일 체크할 수 있다', () => {
    expect(isScheduled(weekly3, '2026-11-17')).toBe(true);
  });
  test('주간 완료 횟수', () => {
    expect(weekCount(set('2026-11-14', '2026-11-15', '2026-11-21'), '2026-11-18')).toBe(2);
  });
  test('일일 달성률 분모에서 빠진다', () => {
    expect(dailyRate([base, weekly3], (id) => id === 'h', '2026-11-18')).toBe(100);
    expect(dailyRate([weekly3], () => true, '2026-11-18')).toBeNull();
  });
  test('연속은 목표를 채운 주 단위로 센다. 이번 주를 아직 못 채웠으면 지난주부터', () => {
    const done = set(
      '2026-11-01',
      '2026-11-03',
      '2026-11-05', // 11/1 주: 3회
      '2026-11-08',
      '2026-11-09',
      '2026-11-10', // 11/8 주: 3회
      '2026-11-16', // 이번 주: 1회
    );
    expect(streak(weekly3, done, '2026-11-18')).toEqual({ current: 2, longest: 2 });
  });
});

describe('30일 달성률', () => {
  test('매일 습관: 예정일 중 완료 비율', () => {
    const h = { ...base, start_date: '2026-11-09' }; // 최근 30일 중 예정 10일(11-09~11-18)
    expect(habitRate30(h, set('2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'), '2026-11-18')).toBe(50);
  });
  test('예정일이 없으면 null', () => {
    expect(habitRate30({ ...base, start_date: '2026-12-01' }, set(), '2026-11-18')).toBeNull();
  });
  test('주 N회 습관: 최근 4주 완료 횟수 ÷ 목표', () => {
    const done = set('2026-10-25', '2026-11-01', '2026-11-03', '2026-11-08', '2026-11-16', '2026-11-17');
    // 4주(10-22~11-18) 동안 6회 / 12회
    expect(habitRate30(weekly3, done, '2026-11-18')).toBe(50);
  });
  test('주 N회 습관: 시작한 지 4주가 안 되면 지난 주 수로만 나눈다', () => {
    const weekly2 = { ...base, frequency_type: 'weekly', weekly_target: 2 };
    // 오늘 시작, 1회 / 1주 × 2회
    expect(habitRate30({ ...weekly2, start_date: '2026-11-18' }, set('2026-11-18'), '2026-11-18')).toBe(50);
    // 10일 전 시작(2주), 2회 / 2주 × 2회
    expect(habitRate30({ ...weekly2, start_date: '2026-11-09' }, set('2026-11-10', '2026-11-17'), '2026-11-18')).toBe(50);
  });
});
