import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { duration, easing, Icon, ListGroup, RollingNumber, Text, useColor } from '@/shared/ui';

const TIMING = { duration: duration.collapse, easing: easing.standard };

/**
 * 접히는 묶음 카드. 머리를 누르면 접고 펼친다(높이와 chevron 220ms). onLongPress가 있으면 길게 눌러 그룹을 관리한다.
 * 펼친 뒤 항목 수가 바뀌어도 높이가 따라 움직인다. 동작 줄이기면 바로 바뀐다
 */
export function GroupCard({
  title,
  count,
  open,
  onToggle,
  onLongPress,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
}) {
  const c = useColor();
  const reduce = useReducedMotion();
  const progress = useSharedValue(open ? 1 : 0);
  // 펼친 내용의 실제 높이. 처음 재기 전(-1)에는 높이를 정하지 않는다
  const measured = useSharedValue(-1);
  useEffect(() => {
    progress.set(reduce ? (open ? 1 : 0) : withTiming(open ? 1 : 0, TIMING));
  }, [open, reduce, progress]);
  const bodyStyle = useAnimatedStyle(() => (measured.get() < 0 ? {} : { height: measured.get() * progress.get() }));
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${(progress.get() - 1) * 90}deg` }] }));

  return (
    <ListGroup>
      <Pressable
        className="active:opacity-60"
        onPress={onToggle}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint={onLongPress ? '길게 누르면 그룹 이름을 바꾸거나 삭제해요' : undefined}
      >
        <View className="min-h-[52px] flex-row items-center gap-2">
          <Text className="text-[18px] leading-6 font-semibold tracking-[-0.2px]" accessibilityRole="header">
            {title}
          </Text>
          <View className="min-h-6 min-w-7 items-center justify-center rounded-full bg-default px-2">
            <RollingNumber value={count} className="text-[13px] font-semibold text-default-foreground" />
          </View>
          <View className="flex-1" />
          <Animated.View style={chevronStyle}>
            <Icon name="chevron-down" size={16} tint={c.sub} />
          </Animated.View>
        </View>
      </Pressable>
      {/* 스와이프 행이 카드 끝까지 닿도록 -mx-4로 넓히고 안쪽 여백을 다시 준다. 행은 접혀도 남겨 두고 숨긴다 */}
      <Animated.View
        className="-mx-4 overflow-hidden"
        style={bodyStyle}
        pointerEvents={open ? 'auto' : 'none'}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      >
        <View
          className="px-4"
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            measured.set(measured.get() < 0 || reduce ? h : withTiming(h, TIMING));
          }}
        >
          {children}
        </View>
      </Animated.View>
    </ListGroup>
  );
}
