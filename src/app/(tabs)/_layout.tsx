import { type Href, Link, Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { getSetting } from '@/shared/db';
import { useToday } from '@/shared/lib';
import { BrandMark, Icon, type IconName, Text, useColor } from '@/shared/ui';

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
      screenLayout={({ route, navigation, children }) => (
        <SwipeToTab routeName={route.name} onSwipe={(name) => navigation.navigate(name)}>
          {children}
        </SwipeToTab>
      )}
      screenOptions={({ route }) => {
        return {
          // 탭을 옮길 때 방향에 맞춰 살짝 밀리며 바뀐다
          animation: 'shift',
          tabBarActiveTintColor: c.accent,
          tabBarInactiveTintColor: c.sub,
          tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
          tabBarStyle: { backgroundColor: c.bar, borderTopColor: c.line, borderTopWidth: 0.5 },
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
            <View className="flex-row pr-1">
              <Link href={addHref(route.name)} asChild>
                <Pressable
                  className="h-11 w-11 items-center justify-center"
                  accessibilityLabel={route.name === 'habits' ? '습관 추가' : '할 일 추가'}
                >
                  <Icon name="plus" size={22} tint={c.accent} />
                </Pressable>
              </Link>
              <Link href="/settings" asChild>
                <Pressable className="h-11 w-11 items-center justify-center" accessibilityLabel="설정" accessibilityRole="button">
                  <Icon name="settings" size={20} tint={c.sub} />
                </Pressable>
              </Link>
            </View>
          ),
        };
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color: tint, focused }) => <Icon name={t.icon} size={22} tint={tint as string} filled={focused} />,
          }}
        />
      ))}
    </Tabs>
  );
}
