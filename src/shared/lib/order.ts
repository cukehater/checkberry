/**
 * 보이는 목록(visible)에서 from 자리 항목을 to 자리로 옮긴 결과를, 필터·검색으로 숨은 항목까지 든 전체 목록(full)에 적용한다.
 * 끈 항목은 놓은 자리 옆 항목 바로 앞(위로 옮겼을 때) 또는 뒤(아래로)에 들어가고, 숨은 항목끼리의 순서는 그대로다
 */
export function reorderIds(full: string[], visible: string[], from: number, to: number): string[] {
  if (from === to) return full;
  const moved = visible[from];
  const anchor = visible[to];
  const rest = full.filter((id) => id !== moved);
  const at = rest.indexOf(anchor) + (to > from ? 1 : 0);
  return [...rest.slice(0, at), moved, ...rest.slice(at)];
}
