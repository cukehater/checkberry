import LottieView, { type AnimationObject } from 'lottie-react-native';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { cn } from '@/shared/lib';
import { RollingNumber, Text, useColor } from '@/shared/ui';
import { STAGE_NAME, type StreakStage, streakStage, type StreakUnit } from '../model/stage';

// 단계 그림(Lottie 128 캔버스, 2초 반복). 얼음 → 물방울 → 불씨 → 불꽃 → 활활
const STAGE_LOTTIE: Record<StreakStage, AnimationObject> = {
  1: require('../../../../assets/lottie/streak-1-ice.json'),
  2: require('../../../../assets/lottie/streak-2-drop.json'),
  3: require('../../../../assets/lottie/streak-3-ember.json'),
  4: require('../../../../assets/lottie/streak-4-flame.json'),
  5: require('../../../../assets/lottie/streak-5-blaze.json'),
};

// 단계 알약 바탕과 글자. 얼음 frost, 물방울 회색, 불씨 호박(ember), 불꽃 베리 soft, 활활 베리 채움. 벽돌(지연)은 쓰지 않는다
const STAGE_PILL: Record<StreakStage, readonly [string, string]> = {
  1: ['bg-frost-soft', 'text-frost-soft-foreground'],
  2: ['bg-default', 'text-default-foreground'],
  3: ['bg-warning-soft', 'text-warning-soft-foreground'],
  4: ['bg-accent-soft', 'text-accent-soft-foreground'],
  5: ['bg-accent', 'text-accent-foreground'],
};

/**
 * 단계 그림. 목록에서는 첫 프레임에 멈춰 두고 playKey가 바뀐 순간(체크)에만 한 번 재생한다. loop면 계속 돈다(습관 편집 단계 카드).
 * 동작 줄이기면 항상 첫 프레임
 */
export function StreakArt({
  count,
  unit,
  size,
  playKey = 0,
  loop,
}: {
  count: number;
  unit: StreakUnit;
  size: number;
  playKey?: number;
  loop?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<LottieView>(null);
  const stage = streakStage(count, unit);
  useEffect(() => {
    if (reduce || (!loop && !playKey)) ref.current?.reset();
    else ref.current?.play();
  }, [playKey, loop, reduce, stage]);
  return (
    <LottieView ref={ref} source={STAGE_LOTTIE[stage]} autoPlay={false} loop={!!loop && !reduce} style={{ width: size, height: size }} />
  );
}

/** 연속 기록 축하 토스트의 왼쪽 칩. 단계 알약 색 원 안에서 같은 단계 그림이 한 번 재생된다 */
export function StreakToastIcon({ count, unit }: { count: number; unit: StreakUnit }) {
  return (
    <View className={cn('h-8 w-8 items-center justify-center rounded-full', STAGE_PILL[streakStage(count, unit)][0])}>
      <StreakArt count={count} unit={unit} size={28} playKey={1} />
    </View>
  );
}

/**
 * 연속 기록 메달 배지. 알약(26pt, 숫자 15 Bold + 단위 12 SemiBold) 왼쪽 끝에 메달 원(32)이 15pt 밖, 3pt 위로 겹친다.
 * 메달 원 바탕은 배지가 놓인 면 색(습관 타일 위면 tile, 흰 카드 위면 card)이라 그림이 면에서 떠 보인다. 0이면 그리지 않는다
 */
export function StreakBadge({
  count,
  unit,
  surface = 'tile',
  playKey,
}: {
  count: number;
  unit: StreakUnit;
  surface?: 'tile' | 'card';
  /** 바뀐 순간 메달 그림을 한 번 재생한다(체크한 순간) */
  playKey?: number;
}) {
  const c = useColor();
  if (count <= 0) return null;
  const stage = streakStage(count, unit);
  const [bg, text] = STAGE_PILL[stage];
  return (
    <View
      className={cn('ml-[15px] h-[26px] flex-row items-center self-center rounded-full pr-2.5 pl-[21px]', bg)}
      accessible
      accessibilityLabel={`연속 ${count}${unit}, ${STAGE_NAME[stage]} 단계`}
    >
      {/* 메달 원은 계산된 면 색이라 style로 준다 */}
      <View
        className="absolute top-[-3px] left-[-15px] h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: surface === 'tile' ? c.cardSoft : c.card }}
      >
        <StreakArt count={count} unit={unit} size={28} playKey={playKey} />
      </View>
      <RollingNumber value={count} className={cn('text-[15px] leading-[18px] font-bold', text)} />
      <Text className={cn('ml-0.5 text-[12px] leading-[18px] font-semibold', text)}>{unit}</Text>
    </View>
  );
}
