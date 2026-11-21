import { isMilestone } from '../milestone';

test('이정표는 3·7·14·30·100', () => {
  expect([0, 1, 2, 3, 4, 7, 8, 14, 30, 31, 100, 101].filter(isMilestone)).toEqual([3, 7, 14, 30, 100]);
});
