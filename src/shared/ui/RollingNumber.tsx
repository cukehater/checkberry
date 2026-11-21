import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LayoutAnimationConfig, ReduceMotion } from 'react-native-reanimated';
import { duration } from './motion';
import { Text } from './primitives';

/**
 * 굴러가는 숫자. 값이 바뀌면 이전 값이 위로 빠지고 새 값이 아래에서 올라온다(220ms). 처음 그릴 때와 동작 줄이기면 바로 바뀐다.
 * 숫자 폭이 흔들리지 않게 tabular-nums. 글자 크기·색은 className으로 준다
 */
export function RollingNumber({ value, className }: { value: number | string; className?: string }) {
  return (
    <View className="flex-row overflow-hidden">
      <LayoutAnimationConfig skipEntering>
        <Animated.View
          key={String(value)}
          entering={FadeInDown.duration(duration.collapse).reduceMotion(ReduceMotion.System)}
          exiting={FadeOutUp.duration(duration.collapse).reduceMotion(ReduceMotion.System)}
        >
          <Text className={className} style={{ fontVariant: ['tabular-nums'] }}>
            {value}
          </Text>
        </Animated.View>
      </LayoutAnimationConfig>
    </View>
  );
}
