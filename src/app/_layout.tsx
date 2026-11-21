import '../../global.css';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { HeroUINativeProvider } from 'heroui-native';
import { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { DB_NAME, migrate } from '@/shared/db';
import { BrandSplash, DialogHost, UndoBar, useColor } from '@/shared/ui';

// DB 마이그레이션이 끝날 때까지 시스템 스플래시(크림 바탕 + 마크)를 둔다
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <Root />
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

/** DB가 준비되면 시스템 스플래시를 내리고 꾸밈 배경 스플래시를 잠깐 보여 준다 */
function Splash() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return show && <BrandSplash onFinish={() => setShow(false)} />;
}

function Root() {
  const c = useColor();
  return (
    <KeyboardProvider>
      <Suspense
        fallback={
          <View className="flex-1 justify-center bg-background">
            <ActivityIndicator />
          </View>
        }
      >
        <SQLiteProvider databaseName={DB_NAME} options={{ enableChangeListener: true }} onInit={migrate} useSuspense>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: c.bg },
              headerStyle: { backgroundColor: c.bg },
              headerTitleStyle: { color: c.text, fontWeight: '600', fontSize: 17 },
              headerTintColor: c.accent,
              headerShadowVisible: false,
              headerBackTitle: '뒤로',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="event" options={{ presentation: 'modal', title: '할 일' }} />
            <Stack.Screen name="habits/new" options={{ presentation: 'modal', title: '습관 추가' }} />
            <Stack.Screen name="habits/[id]/edit" options={{ presentation: 'modal', title: '습관 편집' }} />
            <Stack.Screen name="settings/index" options={{ title: '설정' }} />
          </Stack>
          <UndoBar />
          <DialogHost />
          <Splash />
        </SQLiteProvider>
      </Suspense>
    </KeyboardProvider>
  );
}
