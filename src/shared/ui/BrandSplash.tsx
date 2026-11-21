import { useEffect } from 'react';
import { Image, useColorScheme, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { Text } from './primitives';
import { MARK } from './components';

const SPLASH_BG = require('../../../assets/images/splash-bg.jpg');

/**
 * 다크 스플래시 배경. 라이트 그림(splash-bg: 모서리 파스텔 원, 작은 점, 잎)과 같은 자리에 어두운 바닥 위 빛으로 번지는 원을 그린다.
 * 베리와 잎 색. 390×844 기준 좌표를 화면에 맞춰 늘린다(slice). 마크 뒤 은은한 베리 빛이 가운데로 시선을 모은다
 */
function DarkSplashBackground() {
  return (
    // react-native-svg의 Svg는 className 대상이 아니라 style로 화면 전체에 깐다
    <Svg
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      width="100%"
      height="100%"
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs>
        <RadialGradient id="berry" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#E11D48" stopOpacity={0.42} />
          <Stop offset="1" stopColor="#E11D48" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="leaf" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#6DBE2A" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#6DBE2A" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#E11D48" stopOpacity={0.22} />
          <Stop offset="0.6" stopColor="#E11D48" stopOpacity={0.06} />
          <Stop offset="1" stopColor="#E11D48" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* 모서리 큰 원: 왼쪽 위·오른쪽 아래 베리, 왼쪽 아래 잎 */}
      <Circle cx={-10} cy={-10} r={190} fill="url(#berry)" />
      <Circle cx={420} cy={860} r={230} fill="url(#berry)" />
      <Ellipse cx={30} cy={850} rx={220} ry={150} fill="url(#leaf)" />
      {/* 마크 뒤 빛 */}
      <Circle cx={195} cy={400} r={190} fill="url(#glow)" />
      {/* 작은 점(라이트 그림의 파스텔 점 자리) */}
      <Circle cx={88} cy={118} r={20} fill="#E11D48" fillOpacity={0.32} />
      <Circle cx={318} cy={148} r={8} fill="#FF8FA6" fillOpacity={0.3} />
      <Circle cx={104} cy={748} r={8} fill="#FF8FA6" fillOpacity={0.28} />
      <Circle cx={316} cy={740} r={8} fill="#A6DA74" fillOpacity={0.3} />
      <Ellipse cx={360} cy={690} rx={20} ry={34} fill="#6DBE2A" fillOpacity={0.22} transform="rotate(35 360 690)" />
    </Svg>
  );
}

/**
 * 브랜드 스플래시. 시스템 스플래시(크림·다크 바탕 + 마크)가 내려간 직후 잠깐 보여 준다. holdMs가 지나면 onFinish를 부르고,
 * 부모가 내리면 흐려지며 사라진다. 라이트는 꾸밈 그림(splash-bg), 다크는 같은 구성을 어두운 바닥 위 빛 원으로 그린다
 */
export function BrandSplash({ holdMs = 700, onFinish }: { holdMs?: number; onFinish: () => void }) {
  const dark = useColorScheme() === 'dark';

  useEffect(() => {
    const id = setTimeout(onFinish, holdMs);
    return () => clearTimeout(id);
  }, [holdMs, onFinish]);

  return (
    <Animated.View exiting={FadeOut.duration(240)} className="absolute inset-0 bg-background">
      {dark ? (
        <DarkSplashBackground />
      ) : (
        <Image source={SPLASH_BG} className="absolute inset-0 h-full w-full" resizeMode="cover" accessibilityIgnoresInvertColors />
      )}
      <View className="flex-1 items-center justify-center gap-[18px] pb-6" accessible accessibilityLabel="checkberry">
        <Animated.Image entering={ZoomIn.springify().damping(12).stiffness(260)} source={MARK} className="h-[148px] w-[148px]" />
        <Text className="text-[30px] leading-9 font-bold tracking-[-0.8px]">checkberry</Text>
      </View>
    </Animated.View>
  );
}
