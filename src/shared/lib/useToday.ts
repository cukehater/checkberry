import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { todayStr } from './dates';

/** 오늘 날짜. 앱이 다시 활성화되거나 자정이 지나면 갱신된다 */
export function useToday() {
  const [today, setToday] = useState(todayStr());
  useEffect(() => {
    const tick = () => setToday(todayStr());
    const id = setInterval(tick, 60_000);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && tick());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return today;
}
