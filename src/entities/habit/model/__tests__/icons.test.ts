import { iconLabel, parseIconKey } from '../icons';

describe('parseIconKey', () => {
  it('gi: 접두사는 Gravity 아이콘 이름', () => {
    expect(parseIconKey('gi:book-open')).toEqual({ kind: 'gravity', name: 'book-open' });
  });

  it('접두사 없는 옛 키는 그대로 읽는다', () => {
    expect(parseIconKey('book')).toEqual({ kind: 'legacy', key: 'book' });
    expect(parseIconKey('water')).toEqual({ kind: 'legacy', key: 'water' });
  });

  it('모르는 값과 빈 이름은 기본 아이콘', () => {
    expect(parseIconKey('nope')).toEqual({ kind: 'legacy', key: 'check' });
    expect(parseIconKey('gi:')).toEqual({ kind: 'legacy', key: 'check' });
    expect(parseIconKey('')).toEqual({ kind: 'legacy', key: 'check' });
  });

  it('라벨은 옛 키면 한국어, gi:면 영문 이름', () => {
    expect(iconLabel('book')).toBe('책');
    expect(iconLabel('gi:flame')).toBe('flame');
  });
});
