import { useEffect } from 'react';
import { Image, useColorScheme, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { Text } from './primitives';
import { MARK } from './components';

const SPLASH_BG = require('../../../assets/images/splash-bg.jpg');

/**
 * 브랜드 스플래시. 시스템 스플래시(크림 바탕 + 마크)가 내려간 직후 잠깐 보여 준다. holdMs가 지나면 onFinish를 부르고,
 * 부모가 내리면 흐려지며 사라진다. 다크 모드는 배경 그림 없이 바탕색과 마크만 쓴다
 */
export function BrandSplash({ holdMs = 700, onFinish }: { holdMs?: number; onFinish: () => void }) {
  const dark = useColorScheme() === 'dark';

  useEffect(() => {
    const id = setTimeout(onFinish, holdMs);
    return () => clearTimeout(id);
  }, [holdMs, onFinish]);

  return (
    <Animated.View exiting={FadeOut.duration(240)} className="absolute inset-0 bg-background">
      {!dark && <Image source={SPLASH_BG} className="absolute inset-0 h-full w-full" resizeMode="cover" accessibilityIgnoresInvertColors />}
      <View className="flex-1 items-center justify-center gap-[18px] pb-6" accessible accessibilityLabel="checkberry">
        <Animated.Image entering={ZoomIn.springify().damping(12).stiffness(260)} source={MARK} className="h-[148px] w-[148px]" />
        <Text className="text-[30px] leading-9 font-bold tracking-[-0.8px]">checkberry</Text>
      </View>
    </Animated.View>
  );
}
