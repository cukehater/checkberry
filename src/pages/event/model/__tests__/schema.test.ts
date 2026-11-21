import { fieldErrors } from '@/shared/lib';
import { eventSchema } from '../schema';

describe('eventSchema', () => {
  test('일정: 제목 필수, 종료일은 시작일 이후', () => {
    expect(fieldErrors(eventSchema, { title: ' ', start: '', end: '' })).toEqual({ title: '제목을 입력해 주세요.' });
    expect(fieldErrors(eventSchema, { title: 'a', start: '2026-11-20', end: '2026-11-19' })).toEqual({
      end: '종료일은 시작일보다 앞설 수 없어요.',
    });
    expect(fieldErrors(eventSchema, { title: 'a', start: '', end: '' })).toEqual({});
  });
});
