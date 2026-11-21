import { addDays, diffDays, formatDateTime, formatKo, formatMD, isDateStr, weekday, weekStart } from '../dates';

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
