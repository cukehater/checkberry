import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { setSetting, useQuery } from '@/shared/db';
import { cn } from '@/shared/lib';
import { habitIconName, ICON_PREFIX } from '@/entities/habit';
import { allPhosphorTags, IconButton, PhosphorIcon, SearchField, Text, useCardStyle, useColor } from '@/shared/ui';

// 검색어가 없을 때 맨 앞에 두는 습관 아이콘. 그 뒤로 나머지 전체가 이어진다
const SUGGESTED = [
  'book-open',
  'books',
  'pencil-simple',
  'graduation-cap',
  'brain',
  'drop',
  'coffee',
  'pill',
  'heartbeat',
  'heart',
  'barbell',
  'person-simple-run',
  'person-simple-walk',
  'bicycle',
  'scales',
  'bed',
  'moon',
  'sun',
  'flame',
  'leaf',
  'music-note',
  'newspaper',
  'lightning',
  'sparkle',
  'clock',
  'broom',
  'shopping-cart',
  'wallet',
  'piggy-bank',
  'cooking-pot',
  'smiley',
  'users',
  'device-mobile',
  'medal',
  'star',
  'camera',
];

// 한국어로 찾을 때 쓰는 별칭. 값은 Phosphor 이름이나 태그에 들어가는 영문 조각(영문 이름·태그는 그대로 검색된다)
const KO_ALIASES: Record<string, string[]> = {
  책: ['book'],
  독서: ['book', 'reading'],
  공부: ['graduation', 'book', 'pencil', 'study', 'education'],
  글쓰기: ['pencil', 'pen', 'notebook', 'writing'],
  일기: ['notebook', 'journal', 'pencil'],
  운동: ['barbell', 'workout', 'fitness', 'gym', 'exercise', 'sport'],
  헬스: ['barbell', 'gym', 'fitness'],
  근력: ['barbell', 'strength'],
  달리기: ['run', 'sneaker'],
  러닝: ['run', 'sneaker'],
  걷기: ['walk', 'footprints', 'sneaker'],
  산책: ['walk', 'footprints', 'tree', 'park'],
  자전거: ['bicycle'],
  수영: ['swimming', 'waves'],
  요가: ['person-simple-tai-chi', 'yoga', 'meditation'],
  체중: ['scales', 'weight'],
  다이어트: ['scales', 'diet', 'weight'],
  건강: ['heartbeat', 'health', 'first-aid', 'pill'],
  약: ['pill', 'medicine'],
  영양제: ['pill', 'vitamin'],
  병원: ['hospital', 'stethoscope', 'first-aid'],
  물: ['drop', 'water'],
  커피: ['coffee'],
  차: ['coffee', 'tea', 'car'],
  음식: ['fork-knife', 'food', 'bowl'],
  요리: ['cooking-pot', 'chef', 'cooking'],
  식사: ['fork-knife', 'bowl'],
  과일: ['orange', 'cherries', 'apple', 'fruit'],
  채소: ['carrot', 'plant', 'vegetable'],
  금주: ['beer', 'wine', 'prohibit'],
  금연: ['cigarette', 'prohibit'],
  수면: ['moon', 'bed', 'sleep'],
  잠: ['moon', 'bed', 'sleep'],
  아침: ['sun', 'sunrise', 'alarm'],
  기상: ['alarm', 'sunrise'],
  날씨: ['sun', 'cloud', 'snowflake', 'umbrella', 'weather'],
  명상: ['meditation', 'flower-lotus', 'sparkle', 'yin-yang'],
  마음: ['heart', 'smiley', 'emotion'],
  감정: ['smiley', 'emotion'],
  감사: ['hand-heart', 'heart', 'thanks'],
  사랑: ['heart', 'love'],
  음악: ['music', 'headphones'],
  악기: ['music', 'piano', 'guitar'],
  노래: ['microphone', 'music'],
  영화: ['film', 'video', 'television', 'popcorn'],
  사진: ['camera', 'image'],
  그림: ['paint', 'palette', 'pencil'],
  뉴스: ['newspaper', 'news'],
  신문: ['newspaper'],
  돈: ['wallet', 'money', 'coin', 'currency'],
  저축: ['piggy-bank', 'vault', 'savings'],
  가계부: ['receipt', 'calculator', 'wallet'],
  쇼핑: ['shopping', 'bag', 'tag'],
  선물: ['gift'],
  휴대폰: ['device-mobile', 'phone'],
  전화: ['phone'],
  컴퓨터: ['desktop', 'laptop', 'keyboard'],
  코딩: ['code', 'terminal'],
  일: ['briefcase', 'work'],
  회사: ['briefcase', 'building'],
  메일: ['envelope', 'mail'],
  청소: ['broom', 'vacuum', 'trash', 'cleaning'],
  빨래: ['t-shirt', 'washing', 'laundry'],
  정리: ['archive', 'box', 'folder'],
  여행: ['airplane', 'suitcase', 'globe', 'map', 'travel'],
  집: ['house', 'home'],
  자동차: ['car'],
  시간: ['clock', 'hourglass', 'timer'],
  알림: ['bell', 'alarm'],
  목표: ['target', 'flag', 'medal', 'trophy'],
  별: ['star'],
  불: ['flame', 'fire'],
  식물: ['plant', 'leaf', 'flower', 'potted'],
  반려동물: ['dog', 'cat', 'paw', 'pet'],
  강아지: ['dog', 'paw'],
  고양이: ['cat', 'paw'],
  아기: ['baby'],
  가족: ['users', 'family'],
  친구: ['users', 'friends'],
  게임: ['game', 'dice', 'puzzle'],
  언어: ['translate', 'language', 'globe'],
  영어: ['translate', 'language'],
  체크: ['check'],
};

const COLUMNS = 6;
const RECENT_MAX = 8;

/** 습관 아이콘 고르기 시트(Phosphor 약 1500개). 검색(영문 이름·태그 + 한국어 별칭), 최근 사용 8개, 6열 격자. 저장 형식은 `ph:<이름>` */
export function IconPicker({
  visible,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  value: string;
  onPick: (iconKey: string) => void;
  onClose: () => void;
}) {
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const recentRow = useQuery<{ value: string | null }>("SELECT value FROM settings WHERE key = 'recentIcons'");
  // 전체 데이터는 시트를 처음 열 때 읽는다
  const tags = useMemo(() => (visible ? allPhosphorTags() : {}), [visible]);
  const names = useMemo(() => Object.keys(tags), [tags]);
  const recent = useMemo(() => {
    try {
      const list: unknown = JSON.parse(recentRow[0]?.value ?? '[]');
      return Array.isArray(list) ? list.filter((n): n is string => typeof n === 'string').slice(0, RECENT_MAX) : [];
    } catch {
      return [];
    }
  }, [recentRow]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    // 검색 전에는 습관에 어울리는 아이콘을 앞에 두고 나머지를 이어 보인다(이름순이면 화살표·도형 수십 개가 앞에 온다)
    if (!q) return [...SUGGESTED.filter((n) => n in tags), ...names.filter((n) => !SUGGESTED.includes(n))];
    const parts = [q, ...Object.entries(KO_ALIASES).flatMap(([ko, en]) => (ko.includes(q) || q.includes(ko) ? en : []))];
    // 이름에 맞는 것을 태그로만 맞는 것보다 앞에
    const byName = names.filter((n) => parts.some((p) => n.includes(p)));
    const byTag = names.filter((n) => !byName.includes(n) && parts.some((p) => tags[n].includes(p)));
    return [...byName, ...byTag];
  }, [names, tags, q]);

  const pick = (name: string) => {
    onPick(ICON_PREFIX + name);
    setSetting(db, 'recentIcons', JSON.stringify([name, ...recent.filter((n) => n !== name)].slice(0, RECENT_MAX)));
    setQuery('');
    onClose();
  };
  const selected = habitIconName(value);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between pt-3 pr-2 pl-5">
          <Text className="text-[17px] font-semibold">아이콘 고르기</Text>
          <IconButton name="close" size={14} onPress={onClose} accessibilityLabel="닫기" />
        </View>
        <View className="px-4 pt-2 pb-3">
          <SearchField value={query} onChangeText={setQuery} placeholder="찾기 (예: 운동, workout)" accessibilityLabel="아이콘 찾기" />
        </View>
        <FlatList
          data={shown}
          keyExtractor={(n) => n}
          numColumns={COLUMNS}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          // 검색 중 키보드 높이만큼 아래 여백이 생겨 결과 마지막 줄까지 올려 볼 수 있다
          renderScrollComponent={(props) => <KeyboardAwareScrollView {...props} />}
          contentContainerClassName="px-3 pb-10"
          ListHeaderComponent={
            !q && recent.length > 0 ? (
              <View className="pb-2">
                <Text className="px-1 pb-1 text-[14px] leading-5 font-medium">최근 사용</Text>
                <View className="flex-row flex-wrap">
                  {recent.map((n) => (
                    <IconCell key={n} name={n} on={n === selected} onPress={() => pick(n)} />
                  ))}
                </View>
                <Text className="px-1 pt-3 pb-1 text-[14px] leading-5 font-medium">전체</Text>
              </View>
            ) : undefined
          }
          ListEmptyComponent={<Text className="py-10 text-center text-[15px] text-muted">찾는 아이콘이 없어요.</Text>}
          renderItem={({ item }) => <IconCell name={item} on={item === selected} onPress={() => pick(item)} />}
        />
      </View>
    </Modal>
  );
}

function IconCell({ name, on, onPress }: { name: string; on: boolean; onPress: () => void }) {
  const c = useColor();
  const card = useCardStyle();
  return (
    <View className="w-1/6 p-1">
      <Pressable
        onPress={onPress}
        className={cn('aspect-square items-center justify-center rounded-2xl active:opacity-70', on ? 'bg-accent' : 'bg-card')}
        style={on ? undefined : card}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`${name} 아이콘`}
      >
        <PhosphorIcon name={name} size={22} color={on ? c.onAccent : c.text} />
      </Pressable>
    </View>
  );
}
