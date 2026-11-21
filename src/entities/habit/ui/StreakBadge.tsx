import LottieView from 'lottie-react-native';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { cn } from '@/shared/lib';
import { RollingNumber, Text } from '@/shared/ui';

const FLAME = require('../../../../assets/lottie/flame.json');

/**
 * 연속 일수 → 5단계. 위에서부터 처음 맞는 단계. 처음 며칠은 작고 흐린 불씨라 이어 갈수록 불이 커지는 재미가 생긴다.
 * 불꽃 크기·재생 속도·선명도와 알약 바탕이 함께 달아오른다: 회색 → 호박 soft → 주황 soft → 베리 soft → 베리 채움.
 * 색은 바꾸지 않는다(Lottie colorFilters는 같은 소스를 쓰는 다른 불꽃에까지 남는다)
 */
const STAGES = [
  { min: 14, flame: 22, speed: 1.6, opacity: 1, pill: 'bg-accent', text: 'text-accent-foreground' }, // 활활
  { min: 7, flame: 20, speed: 1.2, opacity: 1, pill: 'bg-accent-soft', text: 'text-accent-soft-foreground' }, // 큰불
  { min: 3, flame: 18, speed: 0.9, opacity: 1, pill: 'bg-danger-soft', text: 'text-danger-soft-foreground' }, // 불꽃(주황)
  { min: 1, flame: 16, speed: 0.6, opacity: 0.8, pill: 'bg-warning-soft', text: 'text-warning-soft-foreground' }, // 불씨(호박)
  { min: 0, flame: 14, speed: 0.35, opacity: 0.45, pill: 'bg-default', text: 'text-muted' }, // 잿불
] as const;

const stageOf = (count: number) => STAGES.find((s) => count >= s.min) ?? STAGES[STAGES.length - 1];

/** 단계에 맞는 Lottie 불꽃. scale로 칸 크기에 맞춰 키운다(알약 1, 토스트 칩 1.3) */
function Flame({ count, scale = 1 }: { count: number; scale?: number }) {
  const reduce = useReducedMotion();
  const stage = stageOf(count);
  const size = Math.round(stage.flame * scale);
  return (
    <LottieView
      // 단계·동작 줄이기가 바뀌면 새로 그려 autoPlay·speed를 다시 적용한다
      key={`${stage.min}-${reduce}`}
      source={FLAME}
      autoPlay={!reduce}
      loop={!reduce}
      speed={stage.speed}
      progress={reduce ? 0 : undefined}
      // 캔버스 안 불꽃 몸통이 아래로 치우쳐 있어(실측: 크기의 약 18%) 그만큼 올려 숫자와 세로 중심을 맞춘다
      style={{ width: size, height: size, opacity: stage.opacity, transform: [{ translateY: -Math.round(size * 0.18) }] }}
    />
  );
}

/** 연속 기록 축하 토스트의 왼쪽 칩. 단계 알약 색 원 안에 같은 단계 불꽃 */
export function StreakToastIcon({ count }: { count: number }) {
  return (
    <View className={cn('h-8 w-8 items-center justify-center rounded-full', stageOf(count).pill)}>
      <Flame count={count} scale={1.3} />
    </View>
  );
}

/**
 * 연속 기록 알약: [불꽃][숫자][단위]. 오른쪽 고정 폭 칸이라 단계가 바뀌어도 줄이 흔들리지 않는다.
 * 오늘 타일(sm)과 습관 탭(md)이 같은 표현을 쓴다
 */
export function StreakBadge({ count, unit, size = 'sm' }: { count: number; unit: '일' | '회' | '주'; size?: 'sm' | 'md' }) {
  const stage = stageOf(count);
  const md = size === 'md';
  return (
    <View
      className={cn(
        'h-7 flex-row items-center justify-center gap-0.5 rounded-full pr-2.5 pl-1.5',
        md ? 'min-w-16' : 'min-w-[60px]',
        stage.pill,
      )}
      accessible
      accessibilityLabel={count ? `${count}${unit} 연속` : '연속 기록 없음'}
    >
      {/* 불꽃 칸은 단계와 상관없이 같은 크기라 숫자 자리가 움직이지 않는다 */}
      <View className="h-5 w-5 items-center justify-center">
        <Flame count={count} />
      </View>
      <RollingNumber value={count} className={cn('text-[14px] leading-[18px] font-bold', stage.text)} />
      <Text className={cn('text-[11px] leading-[18px] font-semibold', stage.text)}>{unit}</Text>
    </View>
  );
}
