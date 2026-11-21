import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { formatKo, toDateStr, type DateStr } from '../lib/dates';
import { cn } from '../lib/utils';
import { DialogHost } from './dialog';
import { GravityIcon, type GravityIconName } from './GravityIcon';
import { Input, Text } from './primitives';
import { useColor } from './theme';

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
  'p-highest': ['chevrons-up', 'chevrons-up'],
  'p-high': ['chevron-up', 'chevron-up'],
  'p-medium': ['equal', 'equal'],
  'p-low': ['chevron-down', 'chevron-down'],
  'p-lowest': ['chevrons-down', 'chevrons-down'],
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

/** 큰 화면 제목(28pt)과 부제. 오른쪽에 accessory를 둘 수 있다 */
export function LargeTitle({ title, subtitle, accessory }: { title: string; subtitle?: string; accessory?: React.ReactNode }) {
  return (
    <View className="mt-1 mb-4 gap-1">
      <View className="flex-row items-center justify-between gap-3">
        {/* 큰 제목은 이미 크니 글자 크기 설정을 1.3배까지만 따른다 */}
        <Text className="shrink text-[28px] leading-[34px] font-bold tracking-tight" accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
        {accessory}
      </View>
      {subtitle && <Text className="text-[15px] text-muted">{subtitle}</Text>}
    </View>
  );
}

/** 묶음 제목. 카드 위에 굵은 글자와 개수 배지, 오른쪽에 글자 버튼. inCard면 카드 안 첫 줄 */
export function ListHeader({
  title,
  count,
  tint,
  action,
  inCard,
}: {
  title: string;
  count?: string;
  tint?: string;
  action?: React.ReactNode;
  inCard?: boolean;
}) {
  return (
    <View className={cn('min-h-8 flex-row items-center gap-2', inCard ? 'min-h-11 pt-2' : 'mt-7 mb-2 px-1')}>
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
    </View>
  );
}

// 라이트 모드 카드의 옅은 그림자(갈색 기운). 다크는 면 밝기로 층을 나눈다
export const CARD_SHADOW = { shadowColor: '#3C2814', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } };

/** 목록 묶음. 크림 바닥 위 흰 카드에 행을 담는다(행 사이는 Separator) */
export function ListGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  const c = useColor();
  return (
    <View className={cn('rounded-3xl bg-card px-4', className)} style={c.raised ? CARD_SHADOW : undefined}>
      {children}
    </View>
  );
}

/** 행 사이 머리카락 선. className으로 왼쪽 들여쓰기(ml-*)를 준다 */
export function Separator({ className }: { className?: string }) {
  return <View className={cn('h-[0.5px] bg-separator', className)} />;
}

/** 개수 배지. 회색 알약 안 숫자 */
export function Badge({ label }: { label: string }) {
  return (
    <View className="min-h-5 min-w-5 items-center justify-center rounded-full bg-default px-1.5 py-0.5">
      <Text className="text-[12px] font-semibold text-default-foreground tabular-nums" maxFontSizeMultiplier={1.6}>
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
} as const;

/** 상태 로젠지. 연속 기록, 지연, 완료처럼 짧은 상태 글자 */
export function Lozenge({ label, tone = 'default' }: { label: string; tone?: keyof typeof LOZENGE }) {
  const [bg, text] = LOZENGE[tone].split(' ');
  return (
    <View className={cn('min-h-5 justify-center self-center rounded px-1.5 py-0.5', bg)}>
      <Text className={cn('text-[12px] font-semibold tabular-nums', text)} numberOfLines={1} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
    </View>
  );
}

/** 유형 아이콘. 회색 둥근 사각형 위 글자색 글리프. 색은 한 가지만 쓴다 */
export function IconChip({ name, size = 28 }: { name: IconName; size?: number }) {
  const c = useColor();
  return (
    // 크기는 계산되는 값이라 style로 준다
    <View className="items-center justify-center bg-default" style={{ width: size, height: size, borderRadius: Math.round(size * 0.24) }}>
      <Icon name={name} size={Math.round(size * 0.54)} tint={c.text} filled />
    </View>
  );
}

export const MARK = require('../../../assets/images/mark.png');

/** 앱 표식. 바탕을 지운 베리 마크(20보다 작게 쓰지 않는다) */
export function BrandMark({ size = 30 }: { size?: number }) {
  return <Image source={MARK} style={{ width: size, height: size }} accessibilityIgnoresInvertColors />;
}

const PRIORITIES = [
  [5, '매우 높음', 'p-highest', 'danger'],
  [4, '높음', 'p-high', 'warning'],
  [3, '보통', 'p-medium', 'sub'],
  [2, '낮음', 'p-low', 'sub'],
  [1, '매우 낮음', 'p-lowest', 'sub'],
] as const;

/** 중요도. 목록에서는 높음 이상만 작게 보여 준다 */
export function PriorityIcon({ value, size = 13, always, tint }: { value: number; size?: number; always?: boolean; tint?: string }) {
  const c = useColor();
  const p = PRIORITIES.find(([v]) => v === value) ?? PRIORITIES[2];
  if (!always && value < 4) return null;
  return (
    <View accessibilityLabel={`중요도 ${p[1]}`}>
      <Icon name={p[2]} size={size} tint={tint ?? c[p[3]]} />
    </View>
  );
}

/** 선택 토글. 고르면 강조색 테두리와 옅은 강조색, 아니면 테두리만 */
export function Chip({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      className={cn(
        'h-9 flex-row items-center gap-1.5 rounded-lg border px-3.5 active:opacity-70',
        on ? 'border-accent bg-accent-soft' : 'border-separator bg-card',
      )}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      {icon}
      <Text className={cn('text-[15px] font-medium', on && 'font-semibold text-accent-soft-foreground')}>{label}</Text>
    </Pressable>
  );
}

/** 중요도 고르기 */
export function PriorityPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const c = useColor();
  return (
    <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
      {PRIORITIES.map(([v, label]) => (
        <Chip
          key={v}
          label={label}
          on={v === value}
          onPress={() => onChange(v)}
          icon={<PriorityIcon value={v} size={12} always tint={v === value ? c.accent : undefined} />}
        />
      ))}
    </View>
  );
}

// 세그먼트 선택 칸의 그림자. 조건부 그림자 클래스는 Uniwind에서 깨져서 style로 준다
const THUMB_SHADOW = { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 };

/** 보기 전환(세그먼트). 칸 너비는 모두 같고, 전체 너비는 부모가 정한다 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="h-8 flex-row rounded-lg bg-default p-0.5" accessibilityRole="tablist">
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            hitSlop={{ top: 6, bottom: 6 }}
            className={cn('flex-1 items-center justify-center rounded-md px-1', on && 'bg-segment')}
            style={on ? THUMB_SHADOW : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Text className={cn('text-[13px]', on ? 'font-semibold' : 'font-medium text-muted')} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
// 체크 표시 선 길이(20 상자 안 M5.5 10.5 L8.7 13.7 L14.5 7). 선이 그어지듯 나타나게 dash로 쓴다
const TICK = 13;

/**
 * 완료 체크. 24pt 둥근 사각 면(빈 칸은 회색). 누르면 0.92배로 눌렸다 돌아오고, 완료되면 강조색으로 160ms 차오른 뒤 체크가 200ms 동안 그어진다.
 * 칸 전체가 눌린다(기본 44pt). children을 주면 상자 옆 내용까지 한 영역으로 눌린다. onLongPress는 같은 영역의 길게 누르기
 */
export function Check({
  done,
  onPress,
  onLongPress,
  label,
  hint,
  className,
  children,
}: {
  done: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  label: string;
  /** VoiceOver 힌트. 길게 누르기처럼 안 보이는 동작을 알린다 */
  hint?: string;
  className?: string;
  children?: React.ReactNode;
}) {
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
    backgroundColor: interpolateColor(p.get(), [0, 1], [c.neutral, c.accent]),
    transform: [{ scale: scale.get() }],
  }));
  // 0일 때 둥근 선끝이 점으로 남지 않게 숨긴다
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: TICK * (1 - tick.get()), strokeOpacity: tick.get() > 0.001 ? 1 : 0 }));
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => scale.set(withTiming(0.92, { duration: pressMs, easing: EASE }))}
      onPressOut={() => scale.set(withTiming(1, { duration: fillMs, easing: EASE }))}
      className={cn('h-11 w-11 items-center justify-center', className)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <Animated.View className="h-6 w-6 items-center justify-center rounded-lg" style={box}>
        <Svg width={24} height={24} viewBox="0 0 20 20" style={{ position: 'absolute' }}>
          <AnimatedPath
            d="M5.5 10.5 L8.7 13.7 L14.5 7"
            stroke={c.onAccent}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={TICK}
            animatedProps={tickProps}
          />
        </Svg>
      </Animated.View>
      {children}
    </Pressable>
  );
}

const TOOLBAR_HEIGHT = 42;

/** 입력 폼 화면. 포커스된 입력창을 키보드 위로 올리고 키보드 툴바를 붙인다 */
export function FormScreen({ children }: { children: React.ReactNode }) {
  const c = useColor();
  // KeyboardAwareScrollView는 className 대상이 아니라 style로 지정한다
  return (
    <>
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, gap: 24, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        // KeyboardToolbar(높이 42, 라이브러리 KEYBOARD_TOOLBAR_HEIGHT)가 키보드 위에 붙으므로 그만큼 더 띄운다
        bottomOffset={TOOLBAR_HEIGHT + 16}
        extraKeyboardSpace={TOOLBAR_HEIGHT}
      >
        {children}
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
      {/* 시트는 네이티브 모달이라 루트의 DialogHost가 가려진다. 시트 안에 하나 더 둔다 */}
      <DialogHost />
    </>
  );
}

/** 폼 필드 묶음. 13pt 머리글 아래 내용 */
export function Section({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <View className={cn('gap-2', className)}>
      {title && <Text className="px-1 text-[13px] font-semibold text-muted">{title}</Text>}
      {children}
    </View>
  );
}

/** 검색창. 테두리 입력칸 안 돋보기 */
export function SearchField(props: Omit<React.ComponentProps<typeof Input>, 'className'>) {
  const c = useColor();
  return (
    <View className="h-10 flex-row items-center gap-1.5 rounded-[14px] border border-field-border bg-field pl-2.5">
      <Icon name="search" size={15} tint={c.sub} />
      <Input
        className="min-h-9 flex-1 rounded-none border-0 bg-transparent px-0 pr-2"
        returnKeyType="search"
        clearButtonMode="while-editing"
        {...props}
      />
    </View>
  );
}

// 날짜 문자열을 로컬 자정 Date로 바꿔 피커에 넘긴다
const toDate = (d: DateStr) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
};

export function DateField({
  label,
  value,
  fallback,
  min,
  onChange,
}: {
  label: string;
  value: DateStr;
  fallback: DateStr;
  min?: DateStr;
  onChange: (d: DateStr) => void;
}) {
  const c = useColor();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        className="min-h-12 flex-row items-center justify-between rounded-[14px] border border-field-border bg-field px-4 active:opacity-70"
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text className={cn('text-[17px]', !value && 'text-field-placeholder')}>{value ? formatKo(value) : label}</Text>
        <Icon name="calendar" size={18} tint={value ? c.accent : c.sub} />
      </Pressable>
      {open && (
        <DateTimePicker
          value={toDate(value || fallback)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={min ? toDate(min) : undefined}
          locale="ko-KR"
          accentColor={c.accent}
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === 'set' && d) onChange(toDateStr(d));
          }}
        />
      )}
    </View>
  );
}

const ACTION = {
  primary: ['h-12 bg-accent', 'text-accent-foreground'],
  plain: ['h-12 bg-default', 'text-default-foreground'],
  danger: ['h-12 bg-danger-soft', 'text-danger-soft-foreground'],
  link: ['min-h-11 self-center', 'text-accent'],
} as const;

/** 폼·화면 하단 버튼. primary는 강조색으로 채운 버튼, plain은 회색 면, danger는 옅은 빨강 면 */
export function ActionButton({ label, onPress, tone = 'primary' }: { label: string; onPress: () => void; tone?: keyof typeof ACTION }) {
  const [box, text] = ACTION[tone];
  return (
    <Pressable
      onPress={onPress}
      className={cn('items-center justify-center rounded-lg px-5 active:opacity-70', box)}
      accessibilityRole="button"
    >
      <Text className={cn('text-[17px] font-semibold', text)}>{label}</Text>
    </Pressable>
  );
}
