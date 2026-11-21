import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

type Data = { PHOSPHOR_PATHS: Record<string, string | readonly string[]>; PHOSPHOR_TAGS: Record<string, string> };

// 전체 아이콘(약 1500개, 약 680KB)은 처음 그릴 때 모듈을 평가한다
let data: Data | undefined;
/** Phosphor 전체 데이터: 이름 → 경로, 이름 → 검색 태그 */
export function allPhosphorIcons(): Data {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- import는 앱 시작 때 평가돼서 require로 미룬다
  return (data ??= require('./phosphor-icons.all'));
}

/** 없는 이름이면 그리는 기본 아이콘 */
const PHOSPHOR_FALLBACK = 'sparkle';

/** Phosphor Icons fill 두께(256 격자). 습관 아이콘에 쓴다. 색은 부모가 넘긴다 */
export const PhosphorIcon = memo(function PhosphorIcon({ name, size = 16, color }: { name: string; size?: number; color: string }) {
  const { PHOSPHOR_PATHS } = allPhosphorIcons();
  const d = PHOSPHOR_PATHS[name] ?? PHOSPHOR_PATHS[PHOSPHOR_FALLBACK];
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {(typeof d === 'string' ? [d] : d).map((p, i) => (
        <Path key={i} d={p} fill={color} />
      ))}
    </Svg>
  );
});
