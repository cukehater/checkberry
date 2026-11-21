import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

type Paths = Record<string, string | readonly string[]>;

// 전체 아이콘 경로(약 1500개, 약 550KB)는 처음 그릴 때, 검색 태그(약 110KB)는 아이콘 피커를 열 때 모듈을 평가한다
let paths: Paths | undefined;
let tags: Record<string, string> | undefined;
function allPaths(): Paths {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- import는 앱 시작 때 평가돼서 require로 미룬다
  return (paths ??= require('./phosphor-icons.all').PHOSPHOR_PATHS);
}
/** Phosphor 아이콘 이름 → 검색 태그(영문). 이름 목록도 이것으로 얻는다 */
export function allPhosphorTags(): Record<string, string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- 아이콘 피커에서만 필요해서 require로 미룬다
  return (tags ??= require('./phosphor-tags').PHOSPHOR_TAGS);
}

/** 없는 이름이면 그리는 기본 아이콘 */
const PHOSPHOR_FALLBACK = 'sparkle';

/** Phosphor Icons fill 두께(256 격자). 습관 아이콘에 쓴다. 색은 부모가 넘긴다 */
export const PhosphorIcon = memo(function PhosphorIcon({ name, size = 16, color }: { name: string; size?: number; color: string }) {
  const all = allPaths();
  const d = all[name] ?? all[PHOSPHOR_FALLBACK];
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {(typeof d === 'string' ? [d] : d).map((p, i) => (
        <Path key={i} d={p} fill={color} />
      ))}
    </Svg>
  );
});
