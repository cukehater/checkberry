import { type Href, Link, Redirect } from 'expo-router';
import { type BottomTabBarProps, Tabs } from 'expo-router/js-tabs';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { getSetting } from '@/shared/db';
import { cn, useToday } from '@/shared/lib';
import {
  BrandMark,
  CHIP_EDGE,
  CHIP_GAP,
  Icon,
  IconButton,
  type IconName,
  TAB_BAR_HEIGHT,
  Text,
  useColor,
  useOverlayShadow,
  usePressScale,
  useTabBarBottom,
} from '@/shared/ui';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: '오늘', icon: 'today' },
  { name: 'tasks', title: '할 일', icon: 'tasks' },
  { name: 'habits', title: '습관', icon: 'habits' },
  { name: 'calendar', title: '캘린더', icon: 'calendar' },
];

// 화면을 좌우로 밀면 옆 탭으로 간다. 세로 스크롤이 먼저 움직이면(14pt) 가로 제스처는 포기한다
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 600;

function SwipeToTab({ routeName, onSwipe, children }: { routeName: string; onSwipe: (name: string) => void; children: React.ReactNode }) {
  const i = TABS.findIndex((t) => t.name === routeName);
  const pan = usePanGesture({
    activeOffsetX: [-24, 24],
    failOffsetY: [-14, 14],
    runOnJS: true,
    onDeactivate: (e) => {
      if (e.canceled) return;
      // 왼쪽으로 밀면 다음 탭, 오른쪽으로 밀면 이전 탭
      const dir =
        e.translationX < -SWIPE_DISTANCE || e.velocityX < -SWIPE_VELOCITY
          ? 1
          : e.translationX > SWIPE_DISTANCE || e.velocityX > SWIPE_VELOCITY
            ? -1
            : 0;
      const next = TABS[i + dir];
      if (dir && next) onSwipe(next.name);
    },
  });
  return (
    <GestureDetector gesture={pan}>
      <View className="flex-1">{children}</View>
    </GestureDetector>
  );
}

function TabItem({
  tab,
  focused,
  onPress,
  onLongPress,
}: {
  tab: (typeof TABS)[number];
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const c = useColor();
  const press = usePressScale();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      className="flex-1"
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.title}
    >
      <Animated.View
        className={cn('flex-1 items-center justify-center gap-[3px] rounded-[26px]', focused && 'bg-accent-soft')}
        style={press.style}
      >
        <Icon name={tab.icon} size={20} tint={focused ? c.accentInk : c.sub} filled={focused} />
        <Text
          className={cn('text-[12px] leading-[14px]', focused ? 'font-semibold text-accent-soft-foreground' : 'font-medium text-muted')}
          maxFontSizeMultiplier={1.2}
        >
          {tab.title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// 떠 있는 알약 탭 바(좌우 16, 높이 62, 안쪽 6, 다크는 surface-raised 면). 고른 탭만 베리 soft 알약 위 채운 아이콘과 베리 글자.
// 화면 위에 겹쳐 뜨므로 탭 화면의 스크롤 콘텐츠는 useTabBarInset()만큼 아래를 비운다
function PillTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const bottom = useTabBarBottom();
  const shadow = useOverlayShadow();
  return (
    <View
      className="absolute right-4 left-4 flex-row gap-1 rounded-[32px] bg-bar p-1.5"
      style={[{ bottom, height: TAB_BAR_HEIGHT }, shadow]}
      accessibilityRole="tablist"
    >
      {state.routes.map((route, i) => {
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;
        const focused = state.index === i;
        return (
          <TabItem
            key={route.key}
            tab={tab}
            focused={focused}
            onPress={() => {
              const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigateToTab(route.key);
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
          />
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const db = useSQLiteContext();
  const c = useColor();
  const today = useToday();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useEffect(() => {
    getSetting(db, 'onboarded').then((v) => setOnboarded(v === '1'));
  }, [db]);

  if (onboarded === null) return null;
  if (!onboarded) return <Redirect href="/welcome" />;

  // 탭마다 추가 대상이 다르다. 습관 탭은 새 습관, 나머지는 할 일(오늘·캘린더는 오늘 날짜로)
  const addHref = (route: string): Href =>
    route === 'habits' ? '/habits/new' : route === 'tasks' ? '/event' : { pathname: '/event', params: { date: today } };

  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      // 캘린더는 달력 좌우 밀기가 달·주 넘김이라 탭 이동 밀기를 끈다
      screenLayout={({ route, navigation, children }) =>
        route.name === 'calendar' ? (
          children
        ) : (
          <SwipeToTab routeName={route.name} onSwipe={(name) => navigation.navigate(name)}>
            {children}
          </SwipeToTab>
        )
      }
      screenOptions={({ route }) => {
        return {
          // 탭을 옮길 때 방향에 맞춰 살짝 밀리며 바뀐다
          animation: 'shift',
          headerStyle: { backgroundColor: c.bg },
          headerTitleStyle: { color: c.text, fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
          // 제목은 각 화면 본문의 큰 제목(LargeTitle)이 맡는다. 오늘 탭 왼쪽 위에는 앱 표식과 이름을 둔다
          headerTitle: '',
          headerLeft:
            route.name === 'index'
              ? () => (
                  <View className="flex-row items-center gap-1.5 pl-4" accessible accessibilityLabel="checkberry">
                    <BrandMark size={28} />
                    <Text className="text-[17px] font-bold tracking-[-0.3px]">checkberry</Text>
                  </View>
                )
              : undefined,
          sceneStyle: { backgroundColor: c.bg },
          headerRight: () => (
            // IconButton은 누르는 영역 44 안에 40 칩이라 칩 바깥에 2pt씩 여백이 있다. 그만큼 빼서 칩 사이 CHIP_GAP, 가장자리 CHIP_EDGE
            <View className="flex-row" style={{ gap: CHIP_GAP - 4, paddingRight: CHIP_EDGE - 2 }}>
              <Link href={addHref(route.name)} asChild>
                <IconButton name="plus" tone="accent" accessibilityLabel={route.name === 'habits' ? '습관 추가' : '할 일 추가'} />
              </Link>
              <Link href="/settings" asChild>
                <IconButton name="settings" accessibilityLabel="설정" />
              </Link>
            </View>
          ),
        };
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
      ))}
    </Tabs>
  );
}
