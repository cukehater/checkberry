import * as Haptics from 'expo-haptics';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { AccessibilityActionEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  type LayoutAnimationFunction,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { EASE, useMotion } from './components';
import { duration, haptic } from './motion';
import { useColor, useOverlayShadow } from './theme';

// 길게 눌러 들어 올리기까지. 이보다 짧은 탭과 가로 스와이프(12pt)는 원래 동작으로 간다
const LIFT_MS = 300;
// 들어 올린 뒤 이만큼도 안 움직이고 떼면 '그냥 길게 누름'(onHold)
const HOLD_SLOP = 8;
// worklet은 이 JS 함수를 scheduleOnRN으로 부른다. 모듈 객체(Haptics, haptic)를 worklet에 통째로 넘기면 직렬화하다 앱이 죽는다
const lift = () => haptic.lift();
const tick = () => void Haptics.selectionAsync();

type Box = { y: number; h: number };

/**
 * 놓은 순서로 다시 그리는 커밋에 쓰는 레이아웃 전환. Reanimated는 React 커밋마다 직전 애니메이션 값(끌 때 비켜선 거리)을 다시 입히고
 * 0으로 되돌리는 건 다음 프레임이라, 새 자리 + 옛 거리로 한 프레임 깜박인다. 레이아웃 전환은 커밋과 같은 프레임에 돌므로 여기서 거리를 0으로 둔다
 */
const SETTLE_MS = 120;
const SETTLE: LayoutAnimationFunction = (v) => {
  'worklet';
  return {
    initialValues: {
      originX: v.targetOriginX,
      originY: v.targetOriginY,
      width: v.targetWidth,
      height: v.targetHeight,
      transform: [{ translateY: 0 }],
    },
    // 0에 머무는 짧은 전환. 바로 끝나면 직전 값(옛 거리)이 다시 입혀질 수 있어서, 거리를 지우는 다음 프레임까지 붙잡아 둔다
    animations: {
      originY: withTiming(v.targetOriginY, { duration: SETTLE_MS }),
      transform: [{ translateY: withTiming(0, { duration: SETTLE_MS }) }],
    },
  };
};
type Drag = { id: string; from: number; to: number; slot: number };

export type Sortable = {
  ids: SharedValue<string[]>;
  boxes: SharedValue<Record<string, Box>>;
  drag: SharedValue<Drag | null>;
  dy: SharedValue<number>;
  /** 놓은 뒤 저장해서 다시 그려질 때까지 새로 들지 못한다 */
  busy: SharedValue<boolean>;
  /** 끌 수 있는 마지막 인덱스. 제스처 콜백은 처음 만든 클로저를 계속 쓸 수 있어서 렌더 값 대신 shared value로 읽는다 */
  limit: SharedValue<number>;
  /** 놓은 뒤 새 순서로 다시 그릴 때 비켜선 자리를 애니메이션 없이 0으로 되돌린다. 다음에 들어 올리면 꺼진다 */
  snap: SharedValue<boolean>;
  max: number;
  /** 놓은 순서를 저장하는 동안은 목록의 자리 이동(LinearTransition)을 끈다. 이미 제자리에 닿은 행이 한 번 더 움직이지 않게 */
  animateLayout: boolean;
  drop: (from: number, to: number) => void;
  /** 화면에 그릴 순서. 놓은 직후에는 저장이 끝나기 전이라도 놓은 순서다 */
  arrange: <T>(items: T[], idOf: (item: T) => string) => T[];
};

const sameSet = (a: string, b: string) => a.split('\n').sort().join('\n') === b.split('\n').sort().join('\n');

/**
 * 길게 눌러 끌어 순서 바꾸기(할 일 목록, 습관 타일·행). ids는 화면 순서, max는 끌 수 있는 마지막 인덱스(완료한 할 일처럼 뒤에 고정된 행 앞까지).
 * onReorder(from, to)는 손을 놓고 행이 제자리에 닿은 뒤 한 번 불린다. 저장해서 ids가 바뀌면 상태를 지운다
 */
export function useSortable(ids: string[], max: number, onReorder: (from: number, to: number) => void): Sortable {
  const key = ids.join('\n');
  const order = useSharedValue<string[]>([]);
  const boxes = useSharedValue<Record<string, Box>>({});
  const drag = useSharedValue<Drag | null>(null);
  const dy = useSharedValue(0);
  const busy = useSharedValue(false);
  const snap = useSharedValue(false);
  const limit = useSharedValue(max);
  // 놓은 순서(낙관적). 저장은 행마다 UPDATE라 useQuery가 중간 순서를 잠깐씩 그리며 깜박이므로, DB가 이 순서를 따라올 때까지 이것을 그린다
  const [pending, setPending] = useState<string | null>(null);
  let shown = key;
  if (pending !== null) {
    // 저장이 끝났거나 목록 자체가 바뀌면(추가·삭제) 거둔다
    if (pending === key || !sameSet(pending, key)) setPending(null);
    else shown = pending;
  }
  useLayoutEffect(() => {
    limit.set(max);
  }, [max, limit]);
  useLayoutEffect(() => {
    order.set(shown ? shown.split('\n') : []);
    drag.set(null);
    dy.set(0);
  }, [shown, order, drag, dy]);
  // 저장이 끝나 화면 순서와 데이터 순서가 같아진 뒤에야 다시 들 수 있다(onReorder 인덱스는 데이터 순서 기준)
  useLayoutEffect(() => {
    busy.set(pending !== null);
  }, [pending, busy]);
  const latest = useRef<(from: number, to: number) => void>(null);
  useLayoutEffect(() => {
    latest.current = (from, to) => {
      const next = shown.split('\n');
      next.splice(to, 0, ...next.splice(from, 1));
      setPending(next.join('\n'));
      onReorder(from, to);
    };
  });
  // 제스처 worklet이 옛 클로저를 들고 있어도 늘 마지막 렌더의 목록·저장 함수로 처리한다
  const drop = useCallback((from: number, to: number) => latest.current?.(from, to), []);
  const arrange = <T,>(items: T[], idOf: (item: T) => string) => {
    if (shown === key) return items;
    const at = new Map(shown.split('\n').map((id, i) => [id, i]));
    return [...items].sort((a, b) => (at.get(idOf(a)) ?? 0) - (at.get(idOf(b)) ?? 0));
  };
  return { ids: order, boxes, drag, dy, busy, snap, limit, max, animateLayout: pending === null, drop, arrange };
}

/** 끄는 행의 가운데가 다른 행의 가운데를 넘으면 그 자리 */
function targetIndex(ids: string[], boxes: Record<string, Box>, d: Drag, dy: number, max: number) {
  'worklet';
  const me = boxes[d.id];
  if (!me) return d.from;
  const mid = me.y + dy + me.h / 2;
  let to = 0;
  for (let i = 0; i <= max && i < ids.length; i++) {
    const b = boxes[ids[i]];
    if (ids[i] !== d.id && b && mid > b.y + b.h / 2) to++;
  }
  return Math.min(to, max);
}

export type A11yAction = { name: string; label: string; onAction: () => void };

/** VoiceOver로 한 칸씩 옮기기. 끌 수 있는 행에만 위·아래 동작을 준다 */
export function sortActions(index: number, max: number, onReorder: (from: number, to: number) => void): A11yAction[] {
  if (index > max) return [];
  return [
    ...(index > 0 ? [{ name: 'up', label: '위로 옮기기', onAction: () => onReorder(index, index - 1) }] : []),
    ...(index < max ? [{ name: 'down', label: '아래로 옮기기', onAction: () => onReorder(index, index + 1) }] : []),
  ];
}

/** 동작 목록을 접근성 props로 */
export function a11yActionProps(actions: A11yAction[]) {
  return {
    accessibilityActions: actions.map((a) => ({ name: a.name, label: a.label })),
    onAccessibilityAction: (e: AccessibilityActionEvent) => actions.find((a) => a.name === e.nativeEvent.actionName)?.onAction(),
  };
}

/**
 * 끌 수 있는 한 행. 바깥 뷰가 목록 안 위치를 재고 자리 이동과 레이아웃 애니메이션을 맡는다(entering·exiting·layout).
 * before(구분선 등)는 행과 함께 움직이고, 끄는 동안만 숨긴다. 들어 올린 행은 1.02배, 떠 있는 면 그림자와 카드 바탕, radius 모서리
 */
export function SortableItem({
  sort,
  id,
  index,
  onHold,
  before,
  radius = 14,
  className,
  children,
  ...anim
}: {
  sort: Sortable;
  id: string;
  index: number;
  /** 들어 올린 뒤 움직이지 않고 뗐을 때(길게 눌러 편집) */
  onHold?: () => void;
  before?: React.ReactNode;
  radius?: number;
  className?: string;
  children: React.ReactNode;
} & Pick<React.ComponentProps<typeof Animated.View>, 'entering' | 'exiting' | 'layout'>) {
  const c = useColor();
  const shadow = useOverlayShadow();
  const moveMs = useMotion(duration.move);
  const { ids, boxes, drag, dy, busy, snap, limit, max, drop } = sort;

  // 콜백은 UI 스레드 worklet이다. 명시하지 않으면 JS 스레드에서 돌고, 거기서 만든 withTiming 완료 콜백을 UI 스레드가 부르다 앱이 죽는다
  const pan = usePanGesture({
    enabled: index <= max,
    activateAfterLongPress: LIFT_MS,
    onActivate: () => {
      'worklet';
      if (busy.get() || drag.get()) return;
      const all = boxes.get();
      const order = ids.get();
      // 자리는 렌더 때의 index가 아니라 지금 순서에서 찾는다(놓은 뒤 다시 그려져도 콜백이 옛 클로저일 수 있다)
      const index = order.indexOf(id);
      const me = all[id];
      if (index < 0 || index > limit.get() || !me) return;
      const next = all[order[index + 1]];
      const prev = all[order[index - 1]];
      // 한 칸 = 행 높이 + 행 사이 간격(습관 타일 gap 8). 다른 행은 이만큼 비켜선다
      const gap = next ? next.y - (me.y + me.h) : prev ? me.y - (prev.y + prev.h) : 0;
      snap.set(false);
      dy.set(0);
      drag.set({ id, from: index, to: index, slot: me.h + gap });
      scheduleOnRN(lift);
    },
    onUpdate: (e) => {
      'worklet';
      const d = drag.get();
      if (!d || d.id !== id || busy.get()) return;
      dy.set(e.translationY);
      const to = targetIndex(ids.get(), boxes.get(), d, e.translationY, limit.get());
      if (to !== d.to) {
        drag.set({ ...d, to });
        scheduleOnRN(tick);
      }
    },
    onFinalize: () => {
      'worklet';
      const d = drag.get();
      if (!d || d.id !== id || busy.get()) return;
      busy.set(true);
      if (d.to === d.from) {
        const held = Math.abs(dy.get()) < HOLD_SLOP;
        dy.set(
          withTiming(0, { duration: moveMs, easing: EASE }, () => {
            'worklet';
            drag.set(null);
            busy.set(false);
          }),
        );
        if (held && onHold) scheduleOnRN(onHold);
        return;
      }
      // 들어갈 자리까지 미끄러진 뒤 저장한다. 아래로 옮기면 놓은 자리 행의 아래 끝에 맞춘다
      const all = boxes.get();
      const me = all[id];
      const at = all[ids.get()[d.to]];
      // 위치를 아직 못 쟀으면 미끄러지는 연출 없이 바로 저장한다
      const offset = !me || !at ? 0 : (d.to > d.from ? at.y + at.h - me.h : at.y) - me.y;
      snap.set(true);
      dy.set(
        withTiming(offset, { duration: moveMs, easing: EASE }, () => {
          'worklet';
          scheduleOnRN(drop, d.from, d.to);
        }),
      );
    },
  });

  // 자리 이동(translateY)은 레이아웃 전환을 받는 바깥 뷰, 들어 올린 모양(크기·바탕·그림자)은 안쪽 뷰
  const outer = useAnimatedStyle(() => {
    const d = drag.get();
    const lifted = !!d && d.id === id;
    const index = ids.get().indexOf(id);
    let y = 0;
    if (lifted) y = dy.get();
    else if (d && d.from < d.to && index > d.from && index <= d.to) y = -d.slot;
    else if (d && d.from > d.to && index >= d.to && index < d.from) y = d.slot;
    return {
      // 형제 행 위로 올라오도록 바깥 뷰의 zIndex를 올린다(안쪽 zIndex는 형제 사이에서 효과가 없다)
      zIndex: lifted ? 10 : 0,
      transform: [{ translateY: lifted || snap.get() ? y : withTiming(y, { duration: moveMs, easing: EASE }) }],
    };
  });
  // 끄는 행에 딸린 구분선은 숨긴다(들어 올린 카드 위에 선이 붙어 다니지 않게)
  const line = useAnimatedStyle(() => ({ opacity: drag.get()?.id === id ? 0 : 1 }));

  const style = useAnimatedStyle(() => {
    const lifted = drag.get()?.id === id;
    // 놓으면 제자리로 미끄러지는 동안 크기·그림자·윤곽선이 함께 걷힌다(한 프레임에 꺼지면 깜박여 보인다)
    const up = lifted && !busy.get();
    const fade = { duration: 150 };
    return {
      transform: [{ scale: withTiming(up ? 1.02 : 1, fade) }],
      backgroundColor: lifted ? c.card : 'transparent',
      ...shadow,
      shadowOpacity: withTiming(up ? (shadow.shadowOpacity ?? 0) : 0, fade),
      borderWidth: withTiming(up ? (shadow.borderWidth ?? 0) : 0, fade),
    };
  });

  return (
    <Animated.View
      entering={anim.entering}
      exiting={anim.exiting}
      layout={sort.animateLayout ? anim.layout : SETTLE}
      style={outer}
      onLayout={(e) => {
        const { y, height } = e.nativeEvent.layout;
        // 여러 행의 onLayout이 한꺼번에 오면 get→set이 서로 덮어써 위치가 빠진다. UI 스레드에서 한 번에 고친다
        boxes.modify((all) => {
          'worklet';
          all[id] = { y, h: height };
          return all;
        });
      }}
    >
      {before && <Animated.View style={line}>{before}</Animated.View>}
      <GestureDetector gesture={pan}>
        <Animated.View className={className} style={[{ borderRadius: radius }, style]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
