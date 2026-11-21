import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LayoutAnimationConfig, ReduceMotion } from 'react-native-reanimated';
import { duration } from './motion';
import { Text } from './primitives';

/**
 * 굴러가는 숫자. 값이 바뀌면 이전 값이 위로 빠지고 새 값이 아래에서 올라온다(220ms). 처음 그릴 때와 동작 줄이기면 바로 바뀐다.
 * 숫자 폭이 흔들리지 않게 tabular-nums. 글자 크기·색은 className으로 준다.
 * 폭은 보이지 않는 현재 값이 잡고, 바뀌는 두 숫자는 그 위에 겹쳐 그린다. 나란히 두면 바뀌는 동안 두 숫자 폭만큼 늘어나
 * 감싼 알약(연속 기록 배지 등)이 순간 오른쪽으로 커진다
 */
export function RollingNumber({ value, className }: { value: number | string; className?: string }) {
  return (
    <View className="overflow-hidden">
      <Text className={className} style={{ fontVariant: ['tabular-nums'], opacity: 0 }} accessibilityElementsHidden>
        {value}
      </Text>
      {/* skipExiting: 숫자 자체가 사라질 때(연속 기록이 0이 되어 배지가 없어질 때)는 퇴장 애니메이션을 하지 않는다.
          하면 지워진 부모 밖에서 따로 재생돼 카드 바깥에 잠깐 보인다 */}
      <LayoutAnimationConfig skipEntering skipExiting>
        <Animated.View
          key={String(value)}
          className="absolute inset-0"
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
