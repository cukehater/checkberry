import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * 완료한 항목을 목록 아래로 보내되, 방금 체크한 항목은 잠깐(기본 0.9초) 제자리에 둔다.
 * 그 사이 잘못 누른 걸 알아채고 바로 다시 누를 수 있다.
 *
 * 행을 <Animated.View layout={LinearTransition.duration(duration.move)}> 로 감싸면
 * 0.9초 뒤 아래로 미끄러져 내려간다.
 */
export function useSettledOrder<T>(
  items: readonly T[],
  getId: (item: T) => string,
  isDone: (item: T) => boolean,
  // shared/ui의 duration.settle과 같은 값(lib은 ui를 부르지 않는다)
  delay: number = 900,
) {
  const [recentId, setRecentId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /** 체크(또는 체크 해제) 직후 호출한다. */
  const hold = useCallback(
    (id: string) => {
      if (timer.current) clearTimeout(timer.current);
      setRecentId(id);
      timer.current = setTimeout(() => setRecentId(null), delay);
    },
    [delay],
  );

  const ordered = useMemo(() => {
    const open: T[] = [];
    const closed: T[] = [];
    for (const item of items) {
      if (isDone(item) && getId(item) !== recentId) closed.push(item);
      else open.push(item);
    }
    return [...open, ...closed];
  }, [items, getId, isDone, recentId]);

  return { ordered, hold, recentId };
}
