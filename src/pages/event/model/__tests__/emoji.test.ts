import { joinEmoji, splitEmoji } from '../emoji';

describe('제목 이모지', () => {
  test('맨 앞 이모지를 떼어 낸다', () => {
    expect(splitEmoji('🍎 장보기')).toEqual({ emoji: '🍎', rest: '장보기' });
    expect(splitEmoji('👍🏽장보기')).toEqual({ emoji: '👍🏽', rest: '장보기' });
    expect(splitEmoji('👨‍👩‍👧 가족 모임')).toEqual({ emoji: '👨‍👩‍👧', rest: '가족 모임' });
    expect(splitEmoji('🇰🇷 여행')).toEqual({ emoji: '🇰🇷', rest: '여행' });
    expect(splitEmoji('✈️ 출장')).toEqual({ emoji: '✈️', rest: '출장' });
  });
  test('이모지가 없거나 중간에 있으면 그대로 둔다', () => {
    expect(splitEmoji('장보기')).toEqual({ emoji: '', rest: '장보기' });
    expect(splitEmoji('장보기 🍎')).toEqual({ emoji: '', rest: '장보기 🍎' });
  });
  test('저장할 때 다시 붙인다', () => {
    expect(joinEmoji('🍎', '장보기')).toBe('🍎 장보기');
    expect(joinEmoji('', '장보기')).toBe('장보기');
  });
});
