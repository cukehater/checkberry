import { reorderIds } from '../order';

describe('reorderIds', () => {
  const full = ['a', 'b', 'c', 'd', 'e'];
  test('전부 보일 때 맨 위·맨 아래로', () => {
    expect(reorderIds(full, full, 3, 0)).toEqual(['d', 'a', 'b', 'c', 'e']);
    expect(reorderIds(full, full, 0, 4)).toEqual(['b', 'c', 'd', 'e', 'a']);
  });
  test('제자리에 놓으면 그대로', () => {
    expect(reorderIds(full, full, 2, 2)).toEqual(full);
  });
  test('숨은 항목이 끼어 있으면 놓은 자리 옆 항목에 붙고 숨은 항목 순서는 그대로', () => {
    // 보이는 것: a c e. e를 맨 위로 → a 앞
    expect(reorderIds(full, ['a', 'c', 'e'], 2, 0)).toEqual(['e', 'a', 'b', 'c', 'd']);
    // a를 c 자리로(아래로) → c 바로 뒤
    expect(reorderIds(full, ['a', 'c', 'e'], 0, 1)).toEqual(['b', 'c', 'a', 'd', 'e']);
  });
});
