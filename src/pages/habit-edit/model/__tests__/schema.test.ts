import { fieldErrors } from '@/shared/lib';
import { habitSchema } from '../schema';

describe('habitSchema', () => {
  const ok = { name: '독서', startDate: '2026-11-20', frequency: 'daily' as const, weekdays: [], weeklyTarget: 3 };

  test('습관: 이름 필수, 시작일 형식', () => {
    expect(fieldErrors(habitSchema, { ...ok, name: '', startDate: '2026-02-30' })).toEqual({
      name: '습관 이름을 적어 주세요.',
      startDate: '날짜 형식이 맞지 않아요.',
    });
    expect(fieldErrors(habitSchema, ok)).toEqual({});
  });

  test('요일 지정은 요일이 하나 이상 필요', () => {
    expect(fieldErrors(habitSchema, { ...ok, frequency: 'weekdays' })).toEqual({ weekdays: '요일을 하나 이상 골라 주세요.' });
    expect(fieldErrors(habitSchema, { ...ok, frequency: 'weekdays', weekdays: [1, 3] })).toEqual({});
  });
});
