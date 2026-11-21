import { useEffect, useId, useSyncExternalStore } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './components';
import { duration, easing, spring } from './motion';
import { Text } from './primitives';
import { useColor, useOverlayShadow } from './theme';

// 짧은 안내(저장 오류, 완료 알림). 화면 위쪽에서 내려와 2.4초 뒤 사라진다. 위로 밀면 바로 닫힌다.
// 시트(네이티브 모달) 위에서도 보여야 해서 DialogHost처럼 루트와 FormScreen 양쪽에 Host를 두고 가장 나중 Host만 그린다.
// 시트 콘텐츠는 네이티브 헤더 아래에서 시작하므로 FormScreen은 안전 영역이 아니라 헤더 바로 아래(top 8)에 띄운다.
// (FullWindowOverlay는 떠 있는 동안 VoiceOver가 아래 앱을 못 찾아 쓰지 않는다)
type Tone = 'error' | 'success' | 'info';
// leading: 왼쪽 칩 대신 그릴 요소(연속 기록 불꽃처럼 shared가 모르는 그림). 32pt 칸에 맞춰 넘긴다
type ToastInput = { message: string; tone: Tone; icon?: IconName; leading?: React.ReactNode };
type Toast = ToastInput & { id: number };

const SHOW_MS = 2400;
const HIDDEN_Y = -120;
// 왼쪽 아이콘 칩 바탕과 글리프 기본값. error 벽돌, success 잎, info 베리
const CHIP = {
  error: { bg: 'bg-danger-soft', icon: 'alert' },
  success: { bg: 'bg-success-soft', icon: 'check' },
  info: { bg: 'bg-accent-soft', icon: 'sparkles' },
} as const;

let current: Toast | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let hosts: string[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
const hide = (id: number) => {
  if (current?.id !== id) return;
  current = null;
  emit();
};

/** 토스트를 띄운다. 이미 떠 있으면 새 것으로 바꾼다 */
export function showToast(t: ToastInput) {
  clearTimeout(timer);
  const id = ++seq;
  current = { ...t, id };
  emit();
  AccessibilityInfo.announceForAccessibility(t.message);
  timer = setTimeout(() => hide(id), SHOW_MS);
}

function ToastCard({ toast }: { toast: Toast }) {
  const c = useColor();
  const shadow = useOverlayShadow();
  const reduce = useReducedMotion();
  const y = useSharedValue(reduce ? 0 : HIDDEN_Y);
  useEffect(() => {
    y.set(reduce ? 0 : withSpring(0, spring.gentle));
  }, [reduce, y]);

  // 위로만 끌리고(아래로는 고무줄), 30pt 넘게 올리거나 빠르게 튕기면 닫힌다
  const pan = usePanGesture({
    runOnJS: true,
    onUpdate: (e) => y.set(e.translationY < 0 ? e.translationY : e.translationY * 0.2),
    onDeactivate: (e) => {
      if (e.translationY < -30 || e.velocityY < -500) {
        y.set(withTiming(HIDDEN_Y, { duration: reduce ? 0 : duration.press, easing: easing.exit }));
        setTimeout(() => hide(toast.id), reduce ? 0 : duration.press);
      } else y.set(withSpring(0, spring.gentle));
    },
  });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const chip = CHIP[toast.tone];
  const tint = toast.tone === 'error' ? c.dangerInk : toast.tone === 'success' ? c.successInk : c.accentInk;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        className="flex-row items-center gap-3 self-center rounded-full bg-elevated py-2 pr-5 pl-2"
        style={[shadow, style]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        {toast.leading ?? (
          <View className={`h-8 w-8 items-center justify-center rounded-full ${chip.bg}`}>
            <Icon name={toast.icon ?? chip.icon} size={16} tint={tint} />
          </View>
        )}
        <Text className="shrink text-[15px] leading-5 font-medium" numberOfLines={1}>
          {toast.message}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

/** 루트(_layout)에 하나만 둔다 */
/** top: Host를 둔 화면 위에서 토스트 윗변까지. 없으면 안전 영역 아래 8pt(탭 화면) */
export function ToastHost({ top }: { top?: number }) {
  const id = useId();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    hosts = [...hosts, id];
    emit();
    return () => {
      hosts = hosts.filter((h) => h !== id);
      emit();
    };
  }, [id]);
  const toast = useSyncExternalStore(subscribe, () => current);
  const last = useSyncExternalStore(subscribe, () => hosts[hosts.length - 1]);
  if (!toast || last !== id) return null;
  return (
    // 카드 밖 터치는 아래 화면으로 넘긴다. 새 토스트는 key로 다시 내려오고, 사라질 때는 160ms 흐려진다
    <Animated.View
      key={toast.id}
      pointerEvents="box-none"
      exiting={FadeOut.duration(160).reduceMotion(ReduceMotion.System)}
      className="absolute right-4 left-4"
      style={{ top: top ?? insets.top + 8 }}
    >
      <ToastCard toast={toast} />
    </Animated.View>
  );
}
