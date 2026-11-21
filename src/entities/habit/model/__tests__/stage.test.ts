import { nextStageCopy, streakStage, streakUnit } from '../stage';
import { habitTally, weeklyCaption } from '../today';

describe('streakStage', () => {
  it('일 단위 1–2 / 3–6 / 7–13 / 14–29 / 30+', () => {
    expect([0, 1, 2, 3, 6, 7, 13, 14, 29, 30, 100].map((n) => streakStage(n, '일'))).toEqual([1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it('주 단위 1 / 2–3 / 4–7 / 8–11 / 12+', () => {
    expect([1, 2, 3, 4, 7, 8, 11, 12].map((n) => streakStage(n, '주'))).toEqual([1, 2, 2, 3, 3, 4, 4, 5]);
  });
  it('주 N회만 주 단위', () => {
    expect(streakUnit({ frequency_type: 'weekly' })).toBe('주');
    expect(streakUnit({ frequency_type: 'weekdays' })).toBe('일');
    expect(streakUnit({})).toBe('일');
  });
});

describe('nextStageCopy', () => {
  it('다음 단계까지 남은 수와 조사', () => {
    expect(nextStageCopy(1, '일')).toBe('2일 더 이어 가면 물방울이 돼요');
    expect(nextStageCopy(5, '일')).toBe('2일 더 이어 가면 불씨가 돼요');
    expect(nextStageCopy(7, '일')).toBe('7일 더 이어 가면 불꽃이 돼요');
    expect(nextStageCopy(20, '일')).toBe('10일 더 이어 가면 활활 타올라요');
    expect(nextStageCopy(30, '일')).toBe('가장 높은 단계예요. 이대로 이어 가요');
    expect(nextStageCopy(3, '주')).toBe('1주 더 이어 가면 불씨가 돼요');
  });
});

describe('habitTally', () => {
  it('주간 목표를 채우고 오늘 안 한 습관은 분모에서 뺀다', () => {
    const t = habitTally([
      { doneToday: true },
      { doneToday: false },
      { doneToday: false, weekly: { done: 3, target: 3 } },
      { doneToday: true, weekly: { done: 3, target: 3 } },
      { doneToday: false, weekly: { done: 1, target: 3 } },
    ]);
    expect(t).toEqual({ done: 2, total: 4 });
  });
  it('주간 캡션', () => {
    expect(weeklyCaption({ done: 2, target: 3 })).toBe('이번 주 2/3');
    expect(weeklyCaption({ done: 3, target: 3 })).toBe('이번 주 3/3 완료');
  });
});
