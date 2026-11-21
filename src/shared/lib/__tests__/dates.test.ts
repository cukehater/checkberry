import {
  addDays,
  diffDays,
  formatAgo,
  formatDateTime,
  formatKo,
  formatMD,
  isDateStr,
  weekday,
  weekOfMonthLabel,
  weekStart,
} from '../dates';

describe('dates', () => {
  test('월·연 경계와 요일', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(diffDays('2026-11-11', '2026-11-18')).toBe(7);
    expect(weekday('2026-11-15')).toBe(0); // 일요일
    expect(weekStart('2026-11-18')).toBe('2026-11-15');
    expect(isDateStr('2026-02-30')).toBe(false);
  });
});

describe('날짜 표기 (FR-06)', () => {
  const today = '2026-11-20';
  test('올해면 연도를 빼고, 다른 해면 붙인다', () => {
    expect(formatMD('2026-03-05', today)).toBe('3월 5일');
    expect(formatMD('2025-12-31', today)).toBe('2025년 12월 31일');
    expect(formatKo('2026-11-20', today)).toBe('11월 20일 (금)');
  });
  test('시각은 오전·오후 12시간제', () => {
    expect(formatDateTime(new Date(2026, 10, 20, 15, 5).toISOString(), today)).toBe('11월 20일 오후 3:05');
    expect(formatDateTime(new Date(2026, 10, 20, 0, 30).toISOString(), today)).toBe('11월 20일 오전 12:30');
  });
});

describe('주차 (목요일 기준)', () => {
  test('일반 주', () => {
    expect(weekOfMonthLabel('2026-11-18')).toBe('2026년 11월 3주차'); // 목 11/19
  });
  test('월 경계 주: 목요일이 있는 달을 따른다', () => {
    expect(weekOfMonthLabel('2026-09-29')).toBe('2026년 10월 1주차'); // 9/27~10/3, 목 10/1
    expect(weekOfMonthLabel('2026-11-29')).toBe('2026년 12월 1주차'); // 11/29~12/5, 목 12/3
    expect(weekOfMonthLabel('2026-11-28')).toBe('2026년 11월 4주차'); // 11/22~11/28, 목 11/26
  });
  test('1일이 금요일인 달의 첫 주는 전달 주차', () => {
    expect(weekOfMonthLabel('2027-01-01')).toBe('2026년 12월 5주차'); // 2027-01-01 금, 목 2026-12-31
    expect(weekOfMonthLabel('2027-01-03')).toBe('2027년 1월 1주차'); // 1/3~1/9, 목 1/7
  });
});

describe('formatAgo', () => {
  const now = new Date(2026, 10, 20, 15, 0);
  const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).toISOString();
  test('분·시간은 경과 시간, 하루 넘으면 달력 날짜 차이', () => {
    expect(formatAgo(at(20, 14, 59), now)).toBe('1분 전');
    expect(formatAgo(at(20, 15), now)).toBe('방금 전');
    expect(formatAgo(at(20, 9), now)).toBe('6시간 전');
    expect(formatAgo(at(19, 23), now)).toBe('1일 전');
    expect(formatAgo(at(17, 15), now)).toBe('3일 전');
    expect(formatAgo(new Date(2026, 8, 1).toISOString(), now)).toBe('9월 1일');
  });
});
