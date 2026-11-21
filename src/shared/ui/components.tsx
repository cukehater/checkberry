import LottieView from 'lottie-react-native';
import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';
import Animated, {
  Easing,
  interpolateColor,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { cn } from '../lib/utils';
import { DialogHost } from './dialog';
import { duration, easing } from './motion';
import { GravityIcon, type GravityIconName } from './GravityIcon';
import { Input, Text } from './primitives';
import { ToastHost } from './toast';
import { usePressScale } from './usePressScale';
import { useCardStyle, useColor } from './theme';

// Gravity UI 아이콘 이름. [기본, 채운 모양]. 채운 모양이 없는 아이콘은 같은 이름을 둔다
const ICONS = {
  today: ['house', 'house-fill'],
  tasks: ['list-check', 'list-check'],
  habits: ['flame', 'flame'],
  calendar: ['calendar', 'calendar'],
  settings: ['gear', 'gear'],
  offline: ['cloud-slash', 'cloud-slash'],
  plus: ['plus', 'plus'],
  check: ['check', 'check'],
  'chevron-left': ['chevron-left', 'chevron-left'],
  'chevron-right': ['chevron-right', 'chevron-right'],
  'chevron-down': ['chevron-down', 'chevron-down'],
  repeat: ['arrows-rotate-right', 'arrows-rotate-right'],
  'arrow-up': ['arrow-up', 'arrow-up'],
  'arrow-down': ['arrow-down', 'arrow-down'],
  equal: ['equal', 'equal'],
  search: ['magnifier', 'magnifier'],
  pencil: ['pencil', 'pencil'],
  book: ['book-open', 'book-open'],
  bolt: ['thunderbolt', 'thunderbolt'],
  weight: ['weight-hanging', 'weight-hanging'],
  news: ['square-article', 'square-article'],
  music: ['music-note', 'music-note'],
  moon: ['moon', 'moon'],
  drop: ['droplet', 'droplet'],
  walk: ['person', 'person'],
  study: ['graduation-cap', 'graduation-cap'],
  pill: ['pill', 'pill'],
  sparkles: ['sparkles', 'sparkles'],
  sun: ['sun', 'sun'],
  heart: ['heart', 'heart'],
  mug: ['mug', 'mug'],
  archive: ['archive', 'archive'],
  wallet: ['wallet', 'wallet'],
  phone: ['smartphone', 'smartphone'],
  dot: ['circle', 'circle'],
  upload: ['arrow-up-from-square', 'arrow-up-from-square'],
  download: ['arrow-down-to-square', 'arrow-down-to-square'],
  trash: ['trash-bin', 'trash-bin'],
  close: ['xmark', 'xmark'],
  export: ['file-arrow-down', 'file-arrow-down'],
  alert: ['circle-exclamation-fill', 'circle-exclamation-fill'],
} satisfies Record<string, readonly [GravityIconName, GravityIconName]>;

export type IconName = keyof typeof ICONS;

/** 아이콘(Gravity UI, 16 격자 채운 모양). 색은 tint, 없으면 글자색 */
export function Icon({ name, size = 20, tint, filled }: { name: IconName; size?: number; tint?: string; filled?: boolean }) {
  const c = useColor();
  return <GravityIcon name={ICONS[name][filled ? 1 : 0]} size={size} color={tint ?? c.text} />;
}

// 모션 문법: 감속 곡선, 160·250·400ms 세 단계. 동작 줄이기면 0
export const EASE = Easing.out(Easing.cubic);
export function useMotion(ms: number) {
  return useReducedMotion() ? 0 : ms;
}

/**
 * 탭 화면 머리. 헤더(버튼 줄 + 12pt 바닥색 띠) 바로 아래에 큰 제목(34pt, 41 줄), 오른쪽에 accessory(순서 바꾸기·이번 주·월/주 세그먼트),
 * 그 아래 6pt에 메타 칩 줄(chips, 칩 사이 6), 첫 콘텐츠까지 16pt. 모든 탭이 같은 자리에 제목을 둔다
 */
export function LargeTitle({ title, accessory, chips }: { title: string; accessory?: React.ReactNode; chips?: React.ReactNode }) {
  return (
    <View className="mb-4 gap-1.5">
      <View className="min-h-[41px] flex-row items-center justify-between gap-3">
        {/* 큰 제목은 이미 크니 글자 크기 설정을 1.3배까지만 따른다 */}
        <Text
          className="shrink text-[34px] leading-[41px] font-bold tracking-[-0.5px]"
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
        >
          {title}
        </Text>
        {accessory}
      </View>
      {chips && <View className="flex-row flex-wrap gap-1.5">{chips}</View>}
    </View>
  );
}

/**
 * 묶음 제목. 굵은 글자와 개수 배지, 오른쪽에 글자 버튼. inCard면 카드 안 첫 줄(52pt).
 * chevron을 주면 오른쪽 끝에 접힘 표시(down: 펼침, right: 접힘)를 그린다. 누르기는 부르는 쪽이 감싼다
 */
export function ListHeader({
  title,
  count,
  tint,
  action,
  inCard,
  chevron,
}: {
  title: string;
  count?: string;
  tint?: string;
  action?: React.ReactNode;
  inCard?: boolean;
  chevron?: 'down' | 'right';
}) {
  const c = useColor();
  return (
    <View className={cn('min-h-8 flex-row items-center gap-2', inCard ? 'min-h-[52px]' : 'mt-7 mb-2 px-1')}>
      <Text
        className="text-[18px] leading-6 font-semibold tracking-[-0.2px]"
        style={tint ? { color: tint } : undefined}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {count && <Badge label={count} />}
      <View className="flex-1" />
      {action}
      {chevron && <Icon name={chevron === 'down' ? 'chevron-down' : 'chevron-right'} size={16} tint={c.sub} />}
    </View>
  );
}

// 떠 있는 알약 탭 바. 높이 62, 좌우 16. 홈 인디케이터가 있으면 아래 안전 영역 안으로 10pt 내려 앉고(34 → 24), 없으면 16 띄운다
export const TAB_BAR_HEIGHT = 62;
export function useTabBarBottom() {
  return Math.max(useSafeAreaInsets().bottom - 10, 16);
}

/** 탭 화면 스크롤 콘텐츠의 하단 여백. 떠 있는 탭 바 위로 16pt 더 띄운다(contentContainerStyle={{ paddingBottom: useTabBarInset() }}) */
export function useTabBarInset() {
  return useTabBarBottom() + TAB_BAR_HEIGHT + 16;
}

/** 목록 묶음. 크림 바닥 위 흰 카드에 행을 담는다(행 사이는 Separator). className은 안쪽 면에 붙으니 바깥 여백(m*)은 감싼 뷰에 준다 */
export function ListGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  const card = useCardStyle();
  return (
    // 그림자 층과 자르는 층을 나눈다. 스와이프 행의 사각 바탕이 둥근 모서리 밖으로 나오지 않게 안쪽에서 자르고,
    // 같은 뷰에 overflow-hidden을 주면 iOS가 그림자까지 잘라서 바깥 층에 그림자를 둔다(다크는 바깥 층의 1pt 윤곽선)
    <View className="rounded-3xl" style={card}>
      <View className={cn('overflow-hidden rounded-3xl bg-card px-4', className)}>{children}</View>
    </View>
  );
}

/** 행 사이 머리카락 선. className으로 왼쪽 들여쓰기(ml-*)를 준다 */
export function Separator({ className }: { className?: string }) {
  return <View className={cn('h-[0.5px] bg-separator', className)} />;
}

/** 개수 배지. 24pt 회색 알약 안 숫자(13 SemiBold). 모든 카드 제목에서 같다 */
function Badge({ label }: { label: string }) {
  return (
    <View className="min-h-6 min-w-7 items-center justify-center rounded-full bg-default px-2">
      <Text className="text-[13px] font-semibold text-default-foreground tabular-nums" maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
    </View>
  );
}

const LOZENGE = {
  default: 'bg-default text-default-foreground',
  accent: 'bg-accent-soft text-accent-soft-foreground',
  success: 'bg-success-soft text-success-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  danger: 'bg-danger-soft text-danger-soft-foreground',
  frost: 'bg-frost-soft text-frost-soft-foreground',
} as const;

/**
 * 상태 로젠지(soft 알약). 크기는 셋: sm 마감 칩(22pt, 12 Bold), md 우선순위·보관(24pt, 12 SemiBold),
 * lg 화면 머리의 메타 칩(26pt, 13 SemiBold). icon을 주면 글자 앞에 같은 색 글리프, leading은 그 자리에 그릴 요소(연속 기록 메달)
 */
export function Lozenge({
  label,
  tone = 'default',
  size = 'md',
  icon,
  leading,
}: {
  label: string;
  tone?: keyof typeof LOZENGE;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  leading?: React.ReactNode;
}) {
  const c = useColor();
  const [bg, text] = LOZENGE[tone].split(' ');
  const ink = {
    default: c.text,
    muted: c.sub,
    solid: c.onAccent,
    accent: c.accentInk,
    success: c.successInk,
    warning: c.warningInk,
    danger: c.dangerInk,
    frost: c.frostInk,
  }[tone];
  return (
    <View
      className={cn(
        'flex-row items-center justify-center gap-1 self-center rounded-full',
        size === 'sm'
          ? 'min-h-[22px] px-[7px]'
          : size === 'md'
            ? 'min-h-6 px-[9px]'
            : cn('min-h-[26px] pr-2.5', leading ? 'pl-1' : 'pl-2.5'),
        bg,
      )}
    >
      {leading ?? (icon && <Icon name={icon} size={size === 'lg' ? 13 : 11} tint={ink} filled />)}
      <Text
        className={cn(
          'tabular-nums',
          size === 'sm' ? 'text-[12px] font-bold' : size === 'md' ? 'text-[12px] font-semibold' : 'text-[13px] font-semibold',
          text,
        )}
        numberOfLines={1}
        maxFontSizeMultiplier={1.6}
      >
        {label}
      </Text>
    </View>
  );
}

/** 유형 아이콘 칩. 원 안 글리프(크기의 절반). accent는 베리 soft 면 + 베리 글리프(환영 기능 목록), neutral은 회색 면 + 보조 글자색(설정 행·날짜 행) */
export function IconChip({ name, size = 32, tone = 'accent' }: { name: IconName; size?: number; tone?: 'accent' | 'neutral' }) {
  const c = useColor();
  return (
    // 크기는 계산되는 값이라 style로 준다
    <View
      className={cn('items-center justify-center rounded-full', tone === 'accent' ? 'bg-accent-soft' : 'bg-default')}
      style={{ width: size, height: size }}
    >
      <Icon name={name} size={Math.round(size / 2)} tint={tone === 'accent' ? c.accentInk : c.sub} filled />
    </View>
  );
}

/**
 * 아이콘 버튼. 40pt 원형 칩(누르는 영역 44pt), 누르면 살짝 줄어든다. 나란히 둘 때는 gap-1(칩 사이 8pt).
 * accent는 옅은 강조색 면 + 강조색 아이콘(주 동작), neutral은 회색 면 + 글자색 아이콘.
 * Link asChild 안에서도 쓰도록 나머지 Pressable props를 그대로 넘긴다
 */
export function IconButton({
  name,
  tone = 'neutral',
  size = 18,
  accessibilityLabel,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, 'children' | 'style'> & {
  name: IconName;
  tone?: 'accent' | 'neutral';
  size?: number;
  accessibilityLabel: string;
}) {
  const c = useColor();
  const press = usePressScale();
  return (
    <Pressable
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      className={cn('h-11 w-11 items-center justify-center', className)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...props}
    >
      <Animated.View
        className={cn('h-10 w-10 items-center justify-center rounded-full', tone === 'accent' ? 'bg-accent-soft' : 'bg-default')}
        style={press.style}
      >
        <Icon name={name} size={size} tint={tone === 'accent' ? c.accent : c.text} />
      </Animated.View>
    </Pressable>
  );
}

/** 나란히 둔 칩 사이(8pt)와 화면 가장자리에서 칩 바깥까지(16pt). 헤더 칩과 캘린더 이전·다음 칩이 같이 쓴다 */
export const CHIP_GAP = 8;
export const CHIP_EDGE = 16;

export const MARK = require('../../../assets/images/mark.png');

/** 앱 표식. 바탕을 지운 베리 마크(20보다 작게 쓰지 않는다) */
export function BrandMark({ size = 30 }: { size?: number }) {
  return <Image source={MARK} style={{ width: size, height: size }} accessibilityIgnoresInvertColors />;
}

/**
 * 선택 칩(32pt 알약). 고르면 옅은 강조색 면 + 베리 글자와 체크, 아니면 회색 면.
 * outline이면 테두리만 있는 동작 칩(+ 새 그룹처럼 고르는 값이 아닌 것). icon을 주면 체크 대신 그것을 앞에 둔다
 */
export function Chip({
  label,
  on,
  onPress,
  icon,
  outline,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  outline?: boolean;
}) {
  const c = useColor();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      className={cn(
        'h-8 flex-row items-center gap-1 rounded-full px-3 active:opacity-70',
        on ? 'bg-accent-soft' : outline ? 'border border-border' : 'bg-default',
      )}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      {icon ?? (on && <Icon name="check" size={12} tint={c.accentInk} />)}
      <Text className={cn('text-[14px] font-medium', on && 'text-accent-soft-foreground')}>{label}</Text>
    </Pressable>
  );
}

// 세그먼트 선택 알약의 그림자. 조건부 그림자 클래스는 Uniwind에서 깨져서 style로 준다
const THUMB_SHADOW = { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 };
// 트랙 안쪽 여백(p-[3px])과 칸 사이(gap-0.5)
const SEG_PAD = 3;
const SEG_GAP = 2;

// 칸 글자. 선택 알약이 지나가는 정도(pos와 칸 번호의 거리)만큼 회색에서 글자색으로 바뀐다
function SegmentLabel({ pos, index, label, size }: { pos: SharedValue<number>; index: number; label: string; size: number }) {
  const c = useColor();
  const style = useAnimatedStyle(() => ({
    color: interpolateColor(Math.max(0, 1 - Math.abs(pos.get() - index)), [0, 1], [c.sub, c.text]),
  }));
  return (
    <Animated.Text className="font-medium" style={[{ fontSize: size }, style]} numberOfLines={1}>
      {label}
    </Animated.Text>
  );
}

/**
 * 보기 전환(알약 세그먼트). 회색 알약 트랙(전체 폭, 안쪽 3pt) 위 흰 알약이 고른 칸이다.
 * 칸은 모두 같은 폭(36pt). 고르면 알약이 220ms 동안 미끄러져 가고 글자색이 함께 바뀐다(동작 줄이기면 즉시).
 * 글자는 15pt, 칸이 5개 이상이면 14pt(할 일 필터의 '날짜 없음'이 잘리지 않게).
 * value가 어느 칸에도 없으면 흰 알약을 그리지 않는다(할 일 시작일이 오늘·내일이 아닐 때 날짜 세그먼트)
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string])[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  const reduce = useReducedMotion();
  const found = options.findIndex(([v]) => v === value);
  const index = Math.max(0, found);
  const pos = useSharedValue(index);
  const [width, setWidth] = useState(0);
  const n = options.length;
  const cell = (width - SEG_PAD * 2 - SEG_GAP * (n - 1)) / n;

  // 고른 칸이 없으면 알약이 어느 칸 글자도 진하게 만들지 않도록 트랙 밖(-1)에 둔다
  const target = found < 0 ? -1 : index;
  useEffect(() => {
    pos.set(reduce || found < 0 ? target : withTiming(target, { duration: duration.collapse, easing: easing.standard }));
  }, [target, found, pos, reduce]);

  const thumb = useAnimatedStyle(() => ({ width: cell, transform: [{ translateX: SEG_PAD + pos.get() * (cell + SEG_GAP) }] }));

  return (
    <View
      className="flex-row gap-0.5 self-stretch rounded-3xl bg-default p-[3px]"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {width > 0 && found >= 0 && (
        <Animated.View className="absolute top-[3px] bottom-[3px] left-0 rounded-[20px] bg-segment" style={[THUMB_SHADOW, thumb]} />
      )}
      {options.map(([v, label], i) => (
        <Pressable
          key={v}
          onPress={() => onChange(v)}
          hitSlop={{ top: 6, bottom: 6 }}
          className="h-9 min-w-14 flex-1 items-center justify-center px-1"
          accessibilityRole="tab"
          accessibilityState={{ selected: i === found }}
          accessibilityLabel={label}
        >
          <SegmentLabel pos={pos} index={i} label={label} size={n >= 5 ? 14 : 15} />
        </Pressable>
      ))}
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
// 체크 표시 선 길이(20 상자 안 M5.5 10.5 L8.7 13.7 L14.5 7). 선이 그어지듯 나타나게 dash로 쓴다
const TICK = 13;

/**
 * 할 일 완료 체크. 24pt 둥근 사각. 빈 칸은 채움 없이 1.5pt border-strong 테두리(카드 대비 3:1 이상이라 누를 컨트롤로 보인다),
 * 완료하면 잎 초록으로 160ms 차오른 뒤 체크가 200ms 동안 그어진다. 누르면 0.92배로 눌렸다 돌아온다.
 * 칸 전체가 눌린다(기본 44pt)
 */
export function Check({ done, onPress, label, className }: { done: boolean; onPress: () => void; label: string; className?: string }) {
  const c = useColor();
  const fillMs = useMotion(160);
  const drawMs = useMotion(200);
  const pressMs = useMotion(80);
  const p = useSharedValue(done ? 1 : 0);
  const tick = useSharedValue(done ? 1 : 0);
  const scale = useSharedValue(1);
  useEffect(() => {
    p.set(withTiming(done ? 1 : 0, { duration: fillMs, easing: EASE }));
    // 체크는 차오른 뒤 그어지고, 해제할 때는 바로 지운다
    tick.set(done ? withDelay(fillMs / 2, withTiming(1, { duration: drawMs, easing: EASE })) : 0);
  }, [done, fillMs, drawMs, p, tick]);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [`${c.task}00`, c.task]),
    borderColor: interpolateColor(p.get(), [0, 1], [c.borderStrong, c.task]),
    transform: [{ scale: scale.get() }],
  }));
  // 0일 때 둥근 선끝이 점으로 남지 않게 숨긴다
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: TICK * (1 - tick.get()), strokeOpacity: tick.get() > 0.001 ? 1 : 0 }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => scale.set(withTiming(0.92, { duration: pressMs, easing: EASE }))}
      onPressOut={() => scale.set(withTiming(1, { duration: fillMs, easing: EASE }))}
      className={cn('h-11 w-11 items-center justify-center', className)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
    >
      <Animated.View className="h-6 w-6 items-center justify-center rounded-lg border-[1.5px]" style={box}>
        <Svg width={21} height={21} viewBox="0 0 20 20" style={{ position: 'absolute' }}>
          <AnimatedPath
            d="M5.5 10.5 L8.7 13.7 L14.5 7"
            stroke={c.onTask}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={TICK}
            animatedProps={tickProps}
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

const TOOLBAR_HEIGHT = 42;
// 시트 머리(SheetHeader) 높이: 손잡이 위 7 + 5 + 4 + 줄 44
const SHEET_HEADER_HEIGHT = 60;

/**
 * 입력 폼 화면(시트). header(SheetHeader)는 스크롤 위에 고정하고, 포커스된 입력창을 키보드 위로 올리며 키보드 막대를 붙인다.
 * 키보드 막대는 surface-raised 면, 화살표는 글자색, '완료'는 베리
 */
export function FormScreen({ header, children }: { header?: React.ReactNode; children: React.ReactNode }) {
  const c = useColor();
  const bar = { primary: c.text, disabled: c.borderStrong, background: c.raisedBg, ripple: c.neutral };
  // KeyboardAwareScrollView는 className 대상이 아니라 style로 지정한다
  return (
    <View className="flex-1 bg-sheet">
      {header}
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 20, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        // KeyboardToolbar(높이 42, 라이브러리 KEYBOARD_TOOLBAR_HEIGHT)가 키보드 위에 붙으므로 그만큼 더 띄운다
        bottomOffset={TOOLBAR_HEIGHT + 16}
        extraKeyboardSpace={TOOLBAR_HEIGHT}
      >
        {children}
      </KeyboardAwareScrollView>
      <KeyboardToolbar theme={{ light: bar, dark: bar }}>
        <KeyboardToolbar.Prev />
        <KeyboardToolbar.Next />
        <KeyboardToolbar.Done>
          <Text className="text-[16px] font-semibold text-accent">완료</Text>
        </KeyboardToolbar.Done>
      </KeyboardToolbar>
      {/* 시트는 네이티브 모달이라 루트의 DialogHost·ToastHost가 가려진다. 시트 안에 하나 더 둔다. 토스트는 시트 머리 바로 아래 8pt */}
      <ToastHost top={(header ? SHEET_HEADER_HEIGHT : 0) + 8} />
      <DialogHost />
    </View>
  );
}

/** 폼 필드 묶음. 14 SemiBold 머리글 아래 내용 */
export function Section({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <View className={cn('gap-2', className)}>
      {title && <Text className="px-1 text-[14px] leading-5 font-semibold">{title}</Text>}
      {children}
    </View>
  );
}

/** 기간 이동 줄(40pt). 습관 탭(‹ 2026년 11월 3주차 ›)과 캘린더(‹ 2026년 11월 ›)가 같이 쓴다. 가운데 20 Bold */
export function PeriodNav({
  label,
  readLabel,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: {
  label: string;
  /** 화면 읽기 프로그램용 라벨(날짜 범위 등) */
  readLabel?: string;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  return (
    <View className="-mx-0.5 h-10 flex-row items-center">
      <IconButton name="chevron-left" size={16} onPress={onPrev} accessibilityLabel={prevLabel} />
      <Text
        className="flex-1 text-center text-[20px] leading-7 font-bold tracking-[-0.3px] tabular-nums"
        accessibilityRole="header"
        accessibilityLabel={readLabel}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
      <IconButton name="chevron-right" size={16} onPress={onNext} accessibilityLabel={nextLabel} />
    </View>
  );
}

// 빈 상태 그림(Lottie 128 캔버스). 습관은 연속 기록 1단계(얼음)를 미리 보여 준다
const EMPTY_ART = {
  today: require('../../../assets/lottie/empty-today-sprout.json'),
  tasks: require('../../../assets/lottie/empty-tasks-clipboard.json'),
  habits: require('../../../assets/lottie/streak-1-ice.json'),
};

/**
 * 빈 상태 한 가지 구성: 흰 카드 안 그림 112 · 제목 17 SemiBold · 설명 14/20 · soft 버튼 하나(44pt).
 * 버튼은 할 일 = 잎 soft, 습관 = 베리 soft. 데이터가 0개인 화면은 검색·필터·기간 이동 줄을 숨기고 이 카드만 둔다
 */
export function EmptyState({
  art,
  title,
  body,
  action,
}: {
  art: keyof typeof EMPTY_ART;
  title: string;
  body: string;
  action?: { label: string; tone: 'habit' | 'task'; onPress: () => void };
}) {
  const c = useColor();
  const reduce = useReducedMotion();
  const habit = action?.tone === 'habit';
  const ink = habit ? c.accentInk : c.taskInk;
  return (
    <ListGroup className="items-center px-6 py-6">
      <LottieView key={String(reduce)} source={EMPTY_ART[art]} autoPlay={!reduce} loop={!reduce} style={{ width: 112, height: 112 }} />
      <Text className="mt-1.5 text-center text-[17px] leading-[22px] font-semibold" accessibilityRole="header">
        {title}
      </Text>
      <Text className="mt-1.5 max-w-[270px] text-center text-[14px] leading-5 text-muted">{body}</Text>
      {action && (
        <Pressable
          onPress={action.onPress}
          className={cn(
            'mt-4 h-11 flex-row items-center gap-1.5 rounded-full px-4 active:opacity-80',
            habit ? 'bg-accent-soft' : 'bg-task-soft',
          )}
          accessibilityRole="button"
        >
          <Icon name="plus" size={16} tint={ink} />
          <Text className={cn('text-[15px] font-semibold', habit ? 'text-accent-soft-foreground' : 'text-task-soft-foreground')}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </ListGroup>
  );
}

/** 검색창. 48pt 흰 칸(테두리 없이 옅은 그림자, 다크는 1pt 윤곽선) 안 돋보기 */
export function SearchField(props: Omit<React.ComponentProps<typeof Input>, 'className'>) {
  const c = useColor();
  const card = useCardStyle();
  return (
    <View className="h-12 flex-row items-center gap-2 rounded-[14px] bg-field pl-3.5" style={card}>
      <Icon name="search" size={16} tint={c.sub} />
      <Input
        className="min-h-11 flex-1 rounded-none border-0 bg-transparent px-0 pr-2"
        returnKeyType="search"
        clearButtonMode="while-editing"
        {...props}
      />
    </View>
  );
}

const ACTION = {
  primary: ['bg-accent', 'text-accent-foreground'],
  plain: ['bg-default', 'text-default-foreground'],
  danger: ['bg-danger-soft', 'text-danger-soft-foreground'],
  link: ['self-center', 'text-accent'],
} as const;

/**
 * 폼·화면 하단의 큰 알약 버튼(48pt, size="lg"는 56pt). primary는 강조색으로 채움, plain은 회색 면, danger는 옅은 벽돌색 면, link는 바탕 없는 강조색 글자.
 * icon을 주면 글자 앞에 16pt 글리프(삭제의 휴지통 등)를 같은 색으로 붙인다
 */
export function ActionButton({
  label,
  onPress,
  tone = 'primary',
  size = 'md',
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: keyof typeof ACTION;
  size?: 'md' | 'lg';
  icon?: IconName;
}) {
  const c = useColor();
  const [box, text] = ACTION[tone];
  const ink = { primary: c.onAccent, plain: c.text, danger: c.dangerInk, link: c.accent }[tone];
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-full active:opacity-70',
        size === 'lg' ? 'h-14 px-[22px]' : 'h-12 px-[18px]',
        box,
      )}
      accessibilityRole="button"
    >
      {icon && <Icon name={icon} size={16} tint={ink} />}
      <Text className={cn('font-semibold', size === 'lg' ? 'text-[17px]' : 'text-[16px]', text)}>{label}</Text>
    </Pressable>
  );
}

/**
 * 켜고 끄는 스위치. 트랙 51×31 안 27pt 정원 손잡이(iOS 26 기본 Switch는 손잡이가 가로로 긴 알약이라 직접 그린다).
 * 켜짐은 베리, 꺼짐은 track. 손잡이는 220ms 동안 미끄러지고 동작 줄이기면 바로 옮겨 간다
 */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel: string;
}) {
  const c = useColor();
  const reduce = useReducedMotion();
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.set(reduce ? (value ? 1 : 0) : withTiming(value ? 1 : 0, { duration: duration.collapse, easing: easing.standard }));
  }, [value, reduce, p]);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.get(), [0, 1], [c.track, c.accent]) }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: p.get() * 20 }] }));
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View className="h-[31px] w-[51px] justify-center rounded-full p-0.5" style={track}>
        <Animated.View className="h-[27px] w-[27px] rounded-full bg-white" style={[THUMB_SHADOW, thumb]} />
      </Animated.View>
    </Pressable>
  );
}
