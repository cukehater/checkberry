import * as Haptics from 'expo-haptics';
import { Easing } from 'react-native-reanimated';

/** 움직임 시간(ms). 디자인 캔버스의 "인터랙션과 모션" 보드와 같은 값. */
export const duration = {
  press: 140, // 누름
  color: 200, // 색 바뀜
  check: 280, // 체크 그리기, 원 채움
  strike: 320, // 취소선
  sheet: 260, // 시트, 다이얼로그
  collapse: 220, // 묶음 접기
  move: 300, // 완료한 할 일 이동
  enter: 360, // 새 행 내려앉기
  ring: 600, // 진행 링
  burst: 900, // 모두 완료 베리 퍼짐
  settle: 900, // 체크 뒤 제자리에 머무는 시간
  undo: 5000, // 실행취소 토스트 유지
} as const;

/** 곡선 */
export const easing = {
  standard: Easing.bezier(0.2, 0.8, 0.2, 1),
  pop: Easing.bezier(0.2, 0.9, 0.3, 1.3),
  exit: Easing.bezier(0.4, 0, 1, 1),
  draw: Easing.bezier(0.3, 0.7, 0.3, 1),
  burst: Easing.bezier(0.15, 0.7, 0.3, 1),
} as const;

/** withSpring 설정 */
export const spring = {
  /** 시트, 스와이프 복귀 */
  gentle: { damping: 16, stiffness: 220 },
  /** 체크 원, 숫자 튐 */
  pop: { damping: 10, stiffness: 320 },
} as const;

/** 누름 배율 */
export const PRESS_SCALE = 0.96;

/** 햅틱. 실패해도 앱 흐름에 영향이 없도록 Promise 는 버린다. */
export const haptic = {
  /** 습관, 할 일 체크 */
  check: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  /** 오늘 할 것을 모두 끝낸 순간 */
  allDone: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  /** 스와이프 임계를 넘는 순간 */
  threshold: () => void Haptics.selectionAsync(),
  /** 길게 눌러 순서 바꾸기로 들어 올릴 때 */
  lift: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  /** 삭제 확정 */
  destructive: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};
