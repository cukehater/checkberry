import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { habitIconName } from '../icons';

// 생성 파일은 크고 jest 변환이 느려 이름 목록만 정규식으로 읽는다
const ALL = new Set(
  [...readFileSync(join(__dirname, '../../../../shared/ui/phosphor-icons.all.ts'), 'utf8').matchAll(/"([a-z0-9-]+)":"/g)].map((m) => m[1]),
);

describe('habitIconName', () => {
  it('ph: 값은 이름 그대로', () => {
    expect(habitIconName('ph:barbell')).toBe('barbell');
  });

  it('옛 키와 Gravity 이름을 Phosphor로 옮긴다', () => {
    expect(habitIconName('book')).toBe('book-open');
    expect(habitIconName('dumbbell')).toBe('barbell');
    expect(habitIconName('gi:droplet')).toBe('drop');
    expect(habitIconName('gi:heart')).toBe('heart');
  });

  it('모르는 옛 키와 빈 값은 기본 아이콘', () => {
    expect(habitIconName('nope')).toBe('sparkle');
    expect(habitIconName('gi:')).toBe('sparkle');
    expect(habitIconName('ph:')).toBe('sparkle');
  });

  it('매핑 결과는 모두 실제 Phosphor 이름이다', () => {
    const keys = ['book', 'dumbbell', 'scale', 'news', 'music', 'moon', 'water', 'activity', 'pencil', 'pill', 'leaf', 'sun', 'heart'];
    const gravity = ['pencil', 'droplet', 'cup', 'mug', 'heart-pulse', 'persons', 'thunderbolt', 'sparkles', 'broom-motion', 'face-smile'];
    const more = ['cherry', 'paintbrush', 'brush', 'tv', 'weight-hanging', 'square-article', 'smartphone', 'clock', 'gift', 'star'];
    for (const k of [...keys, 'coffee', 'sparkle', 'wallet', 'phone', 'check']) expect(ALL).toContain(habitIconName(k));
    for (const g of [...gravity, ...more, 'camera', 'palette', 'globe', 'medal', 'person', 'books'])
      expect(ALL).toContain(habitIconName(`gi:${g}`));
  });
});
