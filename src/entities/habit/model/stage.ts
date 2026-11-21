import { iGa } from '@/shared/lib';

/** 연속 기록 단위. 주 N회 습관만 주, 나머지(매일·요일 지정)는 일 */
export type StreakUnit = '일' | '주';
export type StreakStage = 1 | 2 | 3 | 4 | 5;

export const streakUnit = (h: { frequency_type?: string }): StreakUnit => (h.frequency_type === 'weekly' ? '주' : '일');

// 다음 단계가 시작되는 값. 일: 1–2 / 3–6 / 7–13 / 14–29 / 30+, 주: 1 / 2–3 / 4–7 / 8–11 / 12+
const CUTS: Record<StreakUnit, readonly [number, number, number, number]> = {
  일: [3, 7, 14, 30],
  주: [2, 4, 8, 12],
};

/** 얼음 → 물방울 → 불씨 → 불꽃 → 활활. 0도 1단계(얼음)로 본다 */
export function streakStage(count: number, unit: StreakUnit): StreakStage {
  return (CUTS[unit].filter((c) => count >= c).length + 1) as StreakStage;
}

export const STAGE_NAME: Record<StreakStage, string> = { 1: '얼음', 2: '물방울', 3: '불씨', 4: '불꽃', 5: '활활' };

/** 습관 편집 단계 카드 문구: '7일 더 이어 가면 불꽃이 돼요' */
export function nextStageCopy(count: number, unit: StreakUnit): string {
  const stage = streakStage(count, unit);
  if (stage === 5) return '가장 높은 단계예요. 이대로 이어 가요';
  const head = `${CUTS[unit][stage - 1] - count}${unit} 더 이어 가면`;
  return stage === 4 ? `${head} 활활 타올라요` : `${head} ${iGa(STAGE_NAME[(stage + 1) as StreakStage])} 돼요`;
}
