import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Image, ScrollView, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pickAndRestore } from '@/features/backup';
import { loadTheme } from '@/features/theme';
import { setSetting } from '@/shared/db';
import { ActionButton, IconChip, type IconName, ListGroup, notify, Separator, Text, useColor } from '@/shared/ui';

// 스플래시와 같은 꾸밈 배경(원·베리 그림)과 앱 아이콘
const BG = require('../../../../assets/images/splash-bg.jpg');
// 104pt 자리라 3배(312px)판을 쓴다. 1024px 원본(icon.png)은 스토어 아이콘용
const APP_ICON = require('../../../../assets/images/welcome-icon.png');

const FEATURES: [IconName, string, string][] = [
  ['habits', '습관', '매일, 요일 지정, 주 N회 중에서 골라요'],
  ['tasks', '할 일', '날짜, 반복, 중요도를 정해요'],
  ['phone', '오프라인', '로그인 없이 이 기기에만 저장돼요'],
];

// S12 온보딩. 로그인 없음, 데이터는 이 기기에만 저장
export function WelcomePage() {
  const db = useSQLiteContext();
  const c = useColor();
  const dark = useColorScheme() === 'dark';
  const start = async () => {
    await setSetting(db, 'onboarded', '1');
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-background">
      {/* 다크 모드는 BrandSplash처럼 배경 그림 없이 바탕색만 */}
      {!dark && <Image source={BG} className="absolute inset-0 h-full w-full" resizeMode="cover" accessibilityIgnoresInvertColors />}
      <SafeAreaView style={{ flex: 1 }}>
        {/* 앱 아이콘과 이름, 소개, 카드에 담은 기능 목록, 맨 아래 주 버튼과 회색 버튼 */}
        <ScrollView className="flex-1" contentContainerClassName="px-5 pt-12 pb-6">
          <Animated.View entering={FadeInDown.duration(400)} className="items-center gap-3.5">
            {/* 아이콘 칩의 베리빛 그림자(라이트만). 그림자 값이라 style로 준다 */}
            <View
              className="rounded-3xl"
              style={
                c.raised
                  ? { shadowColor: c.accentInk, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 10 } }
                  : undefined
              }
            >
              <Image
                source={APP_ICON}
                className="h-[104px] w-[104px] rounded-3xl"
                accessibilityLabel="checkberry 앱 아이콘"
                accessibilityIgnoresInvertColors
              />
            </View>
            <Text className="mt-2.5 text-[34px] leading-10 font-bold tracking-[-1px]" accessibilityRole="header">
              checkberry
            </Text>
            <Text className="text-center text-[17px] leading-[26px] text-muted">{'오늘의 습관과 할 일을\n한 화면에서 챙겨요.'}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)} className="mt-9">
            <ListGroup>
              {FEATURES.map(([icon, title, desc], i) => (
                <View key={title}>
                  {i > 0 && <Separator className="ml-[52px]" />}
                  <View className="flex-row items-center gap-3">
                    <IconChip name={icon} size={40} />
                    <View className="flex-1 gap-0.5 py-3.5">
                      <Text className="text-[16px] leading-[22px] font-semibold">{title}</Text>
                      <Text className="text-[14px] leading-5 text-muted">{desc}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ListGroup>
          </Animated.View>
        </ScrollView>

        <View className="gap-2 px-5 pb-2">
          <ActionButton label="시작하기" size="lg" onPress={start} />
          <ActionButton
            label="백업 파일로 복원"
            tone="plain"
            onPress={() =>
              pickAndRestore(db)
                // 백업에 담긴 화면 모드도 바로 적용한다
                .then(async (ok) => ok && (await loadTheme(db), router.replace('/')))
                .catch((e: Error) => notify('복원하지 못했어요', e.message))
            }
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
