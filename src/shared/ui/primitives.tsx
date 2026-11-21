import { useEffect, useState } from 'react';
import { Text as RNText, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { cn } from '../lib/utils';
import { GravityIcon } from './GravityIcon';
import { haptic } from './motion';
import { useColor } from './theme';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/** 기본 글자. 테마 글자색과 16px. 한국어가 글자 중간이 아니라 어절 단위로 줄바꿈되게 한다 */
export function Text({ className, ...props }: React.ComponentProps<typeof RNText>) {
  return <RNText lineBreakStrategyIOS="hangul-word" className={cn('text-base font-normal text-foreground', className)} {...props} />;
}

/**
 * 입력창. 52pt 흰 칸, 1pt 테두리, 모서리 14. 입력 중이면 1.5pt 강조색 테두리, invalid면 1.5pt 오류 테두리(아래에 FieldError).
 * invalid가 켜질 때와, invalid인 채로 shakeKey가 바뀔 때(저장을 다시 누름) 좌우로 3번 흔들리고(240ms) 경고 햅틱이 울린다.
 * 동작 줄이기면 흔들림 없이 햅틱만. multiline이면 위에서부터 쓴다
 */
export function Input({
  className,
  multiline,
  invalid,
  shakeKey,
  onFocus,
  onBlur,
  ...props
}: React.ComponentProps<typeof TextInput> & { invalid?: boolean; shakeKey?: number | string }) {
  const c = useColor();
  const reduce = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const x = useSharedValue(0);
  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  useEffect(() => {
    if (!invalid) return;
    haptic.warning();
    if (reduce) return;
    const step = (to: number) => withTiming(to, { duration: 40 });
    x.set(withSequence(step(-6), step(6), step(-6), step(6), step(-3), step(0)));
  }, [invalid, shakeKey, reduce, x]);
  return (
    <AnimatedTextInput
      lineBreakStrategyIOS="hangul-word"
      className={cn(
        'min-h-[52px] rounded-[14px] border border-field-border bg-field px-4 text-[16px] font-normal text-foreground',
        focused && 'border-[1.5px] border-accent',
        invalid && 'border-[1.5px] border-danger-line',
        multiline && 'min-h-24 pt-3 pb-3',
        className,
      )}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      placeholderTextColor={c.sub}
      selectionColor={c.accent}
      onFocus={(e) => (setFocused(true), onFocus?.(e))}
      onBlur={(e) => (setFocused(false), onBlur?.(e))}
      {...props}
      style={[props.style, shake]}
    />
  );
}

/** 입력칸 아래 8pt 오류 문구. 원 느낌표 15 + 13 SemiBold, 오류 글자색 */
export function FieldError({ message }: { message?: string }) {
  const c = useColor();
  if (!message) return null;
  return (
    <View className="mt-0 flex-row items-center gap-1.5 px-1" accessibilityLiveRegion="polite">
      <GravityIcon name="circle-exclamation" size={15} color={c.dangerInk} />
      <Text className="text-[13px] leading-[18px] font-semibold text-danger-soft-foreground">{message}</Text>
    </View>
  );
}
