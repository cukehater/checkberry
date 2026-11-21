import * as Haptics from 'expo-haptics';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { cn } from '../lib/utils';
import { EASE, Icon, type IconName, useMotion } from './components';
import { useColor } from './theme';

// 행 너비의 이만큼 끌면 실행된다(넓은 화면에서도 엄지 한 번이면 되게 최대 120pt)
const RATIO = 0.3;
const MAX_THRESHOLD = 120;

// 드러난 아이콘: 끈 거리만큼 보이고, 기준선을 넘으면 1.2배
function revealIcon(d: number, w: number) {
  'worklet';
  const t = Math.min(w * RATIO, MAX_THRESHOLD);
  return {
    opacity: d > 1 ? 1 : 0,
    transform: [{ scale: interpolate(d, [0, t * 0.6, t, t + 1], [0.6, 0.9, 1, 1.2], Extrapolation.CLAMP) }],
  };
}

type Action = { icon: IconName; label: string; tone: 'accent' | 'danger' | 'neutral'; onAction: () => void };

/**
 * 끌어서 실행하는 행(Mail·Things식 전체 스와이프). 오른쪽으로 끌면 right, 왼쪽으로 끌면 left 동작.
 * 끄는 동안 뒤에서 동작 색 면과 아이콘이 드러나고, 기준선을 넘는 순간 햅틱과 함께 아이콘이 커진다.
 * 놓으면 제자리로 돌아온 뒤 동작을 실행한다. 세로 스크롤이 먼저 움직이면(10pt) 포기하고, 탭 사이 가로 스와이프보다 먼저(12pt) 잡는다.
 * VoiceOver는 같은 동작을 accessibilityActions로 쓴다
 */
export function SwipeRow({
  children,
  right,
  left,
  className,
}: {
  children: React.ReactNode;
  right?: Action;
  left?: Action;
  className?: string;
}) {
  const c = useColor();
  const backMs = useMotion(250);
  const x = useSharedValue(0);
  const width = useSharedValue(360);
  const armed = useSharedValue(0);
  const threshold = () => Math.min(width.get() * RATIO, MAX_THRESHOLD);

  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-10, 10],
    runOnJS: true,
    onUpdate: (e) => {
      // 동작이 없는 쪽으로는 고무줄처럼 조금만 끌린다
      const dx = e.translationX;
      const next = (dx > 0 && !right) || (dx < 0 && !left) ? dx * 0.15 : dx;
      x.set(next);
      const over = Math.abs(next) >= threshold() ? Math.sign(next) : 0;
      if (over !== armed.get()) {
        armed.set(over);
        if (over) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else Haptics.selectionAsync();
      }
    },
    onDeactivate: () => {
      const fire = armed.get() > 0 ? right : armed.get() < 0 ? left : undefined;
      armed.set(0);
      x.set(withTiming(0, { duration: backMs, easing: EASE }));
      fire?.onAction();
    },
  });

  // 앞면은 쉬는 동안 투명(유리 카드가 비치게), 끄는 동안만 카드 색으로 뒤의 동작 면을 가린다
  const front = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
    backgroundColor: Math.abs(x.get()) > 0.5 ? c.card : 'transparent',
  }));
  const rightIcon = useAnimatedStyle(() => revealIcon(x.get(), width.get()));
  const leftIcon = useAnimatedStyle(() => revealIcon(-x.get(), width.get()));
  const rightBg = useAnimatedStyle(() => ({ opacity: x.get() > 1 ? 1 : 0 }));
  const leftBg = useAnimatedStyle(() => ({ opacity: x.get() < -1 ? 1 : 0 }));
  const toneColor = (t: Action['tone']) => (t === 'danger' ? c.danger : t === 'neutral' ? c.sub : c.accent);

  const actions = [right, left].filter((a): a is Action => !!a);
  return (
    <View
      className={cn('overflow-hidden', className)}
      onLayout={(e) => width.set(e.nativeEvent.layout.width)}
      accessibilityActions={actions.map((a) => ({ name: a.label, label: a.label }))}
      onAccessibilityAction={(e) => actions.find((a) => a.label === e.nativeEvent.actionName)?.onAction()}
    >
      {right && (
        // 동작 색 면은 끄는 쪽에 따라 하나만 보인다. 색은 동작마다 계산되는 값이라 style로 준다
        <Animated.View className="absolute inset-0 justify-center pl-6" style={[{ backgroundColor: toneColor(right.tone) }, rightBg]}>
          <Animated.View style={rightIcon}>
            <Icon name={right.icon} size={22} tint={c.onAccent} />
          </Animated.View>
        </Animated.View>
      )}
      {left && (
        <Animated.View
          className="absolute inset-0 items-end justify-center pr-6"
          style={[{ backgroundColor: toneColor(left.tone) }, leftBg]}
        >
          <Animated.View style={leftIcon}>
            <Icon name={left.icon} size={22} tint={c.onAccent} />
          </Animated.View>
        </Animated.View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View style={front}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}
