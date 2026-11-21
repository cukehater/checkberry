# 아키텍처 하네스

`src/` 코드를 고치기 전에 읽는 문서. 구조 규칙과 그 규칙을 강제하는 검증 도구, 이 프로젝트에서 실제로 겪은 함정을 정리한다.

## 레이어 (Feature-Sliced Design)

```
src/
  app/       Expo Router 라우트 + 전역 프로바이더 (FSD app 레이어 겸용)
  pages/     화면 단위. today, calendar, tasks, habits, event, habit-edit, settings, welcome
  features/  여러 페이지가 쓰는 사용자 기능. backup
  entities/  도메인 데이터와 그 표현. habit, event(그룹 포함)
  shared/    도메인을 모르는 공용 코드. db, lib, ui
```

import는 위에서 아래로만 한다. `pages`는 `features`, `entities`, `shared`를 쓸 수 있고, `entities`는 `shared`만 쓸 수 있다. 같은 레이어의 다른 slice는 import하지 않는다(`entities/habit`이 `entities/event`를 부르면 안 된다).

### src/app

- Expo Router가 이 폴더의 모든 파일을 화면으로 등록한다. 라우트 파일에는 로직을 두지 않고 페이지를 re-export만 한다.
  ```ts
  export { TodayPage as default } from '@/pages/today';
  ```
- 파라미터를 받아 넘겨야 하는 경우만 얇은 컴포넌트를 둔다(`app/habits/[id]/edit.tsx`).
- 프로바이더(KeyboardProvider, SQLiteProvider, UndoBar, DialogHost)와 `global.css` import는 `app/_layout.tsx`에 있다.

### slice 내부

- 세그먼트는 `ui/`, `model/`을 쓴다. `components`, `hooks`, `utils` 같은 이름은 steiger가 막는다.
- slice 밖으로 내보낼 것은 `index.ts`(public API)에 적는다. 다른 slice는 `@/entities/habit`처럼 index만 import한다. `@/entities/habit/model/repo` 같은 내부 경로 import는 금지.
- slice 안에서는 상대 경로(`../model/schema`)를 쓴다.

### 새 코드를 어디에 둘까

| 상황                                                                       | 위치                                                     |
| -------------------------------------------------------------------------- | -------------------------------------------------------- |
| 한 화면에서만 쓰는 로직·스키마                                             | 그 페이지의 `model/` (예: `pages/event/model/schema.ts`) |
| 두 페이지 이상이 쓰는 사용자 동작                                          | `features/<이름>`                                        |
| 습관·일정 데이터를 읽고 쓰는 쿼리, 도메인 규칙, 그 데이터를 그리는 작은 UI | `entities/<이름>`                                        |
| 도메인과 무관한 유틸·훅·UI                                                 | `shared/lib`, `shared/ui`                                |

한 곳에서만 쓰는 코드를 미리 `features`나 `entities`로 빼지 않는다.

## UI

- 컴포넌트 라이브러리는 HeroUI Native(`heroui-native`)다. `app/_layout.tsx`의 `HeroUINativeProvider`가 감싸고, 테마 변수는 `global.css`가 덮어쓴다. 지금 HeroUI를 직접 쓰는 곳은 오늘 탭의 진행 카드(`Surface`)다. 나머지 공용 UI는 `shared/ui`에서 RN 기본 컴포넌트로 만들어 쓰고, 스타일은 Uniwind(Tailwind v4)의 `className`이다. 토글은 `Toggle`(shared/ui, 원형 손잡이)을 쓰고 RN `Switch`는 쓰지 않는다.
  - `components.tsx`: `Icon`, `LargeTitle`, `ListHeader`(`chevron`), `ListGroup`(카드), 떠 있는 탭 바 치수 `TAB_BAR_HEIGHT`·`useTabBarBottom`·`useTabBarInset`(탭 화면 스크롤 하단 여백), `Separator`, `Lozenge`(`size`, `icon`), `IconChip`(`tone`), `IconButton`(40pt 원형 아이콘 칩), `BrandMark`·`MARK`(베리 마크 이미지), `Chip`(`outline`), `Segmented`(`fit`), `Check`, `FormScreen`(`header`), `Toggle`, `Section`, `PeriodNav`, `EmptyState`, `SearchField`, `ActionButton`(`size`, `icon`), 모션 도구 `EASE`·`useMotion`
  - `primitives.tsx`: `Text`, `Input`(`invalid`, `shakeKey`), `FieldError` / `toast.tsx`: `ToastHost`, `showToast` / `RollingNumber` / `DatePicker`(flash-calendar 격자) / `GravityIcon`(앱 UI 아이콘) / `PhosphorIcon`(`allPhosphorIcons`: 습관 아이콘 전체 데이터 지연 로드) / `swipe.tsx`: `SwipeRow` / `dialog.tsx`: `DialogHost`, `confirm`(`hint`), `notify`, `showDialog`, `showMenu`(목록형 동작 메뉴) / `undo.tsx`: `UndoBar`, `showUndo`(세 번째 인자로 아이콘) / `sheet.tsx`: `SheetHeader`, `useSheetGuard` / `theme.ts`: `useColor`, `useCardStyle`(카드 층: 라이트 그림자, 다크 1pt 윤곽선), `useOverlayShadow`(떠 있는 면 그림자)
  - 디자인 키트에서 온 것: `motion.ts`(`duration`, `easing`, `spring`, `haptic`, `PRESS_SCALE`), `CheckGlyph`, `CelebrationBurst`, `BrandSplash`, `usePressScale`, `GravityIcon`(내부용). `shared/lib`의 `useSettledOrder`(체크한 항목을 0.9초 머물게 했다가 아래로)
- 색 토큰은 `global.css`에 정의한 것만 쓴다. HeroUI 토큰(`background`, `foreground`, `muted`, `surface`, `surface-secondary`, `overlay`, `backdrop`, `segment`, `default`, `default-foreground`, `border`, `separator`, `field`, `field-border`, `field-placeholder`, `accent`, `accent-foreground`, `success`, `warning`, `danger`와 각 `-soft`, `-soft-foreground`, 키트 전용 `track`, `border-strong`, `frost-soft`, `danger-line`, `sheet`)과 프로젝트 별칭(`card`, `elevated`, `bar`). soft 색은 HeroUI 계산값 대신 키트의 고정값을 쓴다.
- 색은 두 곳에 있다. className은 `global.css`, 아이콘 tint·SVG·내비게이션 옵션·animated style처럼 className을 못 쓰는 곳은 `shared/ui/theme.ts`의 `useColor()`(기기 라이트·다크 설정)를 쓴다. 색을 바꾸면 둘과 `app.json`의 스플래시·적응형 아이콘 바탕색을 같이 고친다.
- 글꼴은 시스템 글꼴(iOS: SF Pro + Apple SD Gothic Neo)이다. fontFamily를 지정하지 않고 굵기는 `font-normal`~`font-bold` 클래스, className을 못 쓰는 헤더·탭 라벨·시트 바 버튼은 `fontWeight: '600'`을 쓴다.
- 비주얼 규칙(카드 묶음, 색 쓰임, 컴포넌트, 모션)은 `DESIGN.md`에 있다. 앱 UI 아이콘은 `Icon`(Gravity UI Icons, MIT, `react-native-svg`로 그림)만 쓴다. 습관 아이콘은 Phosphor Icons(MIT, fill 두께, `PhosphorIcon`)이고, 전체 데이터(`shared/ui/phosphor-icons.all.ts`, 약 1500개, 경로와 검색 태그)는 `pnpm icons:gen`이 `@phosphor-icons/core`(devDependency)에서 만든다(생성 파일이라 prettier 대상에서 뺐다). 습관 아이콘 값은 `ph:<이름>`이고, 옛 값(옛 키·`gi:`)은 `entities/habit`의 `normalizeHabitIcons`가 앱 시작과 백업 복원 직후에 옮긴다. 앱 UI에 새 아이콘이 필요하면 SVG 경로를 `shared/ui/gravity-icons.data.ts`에 옮기고 `components.tsx`의 `ICONS`에 [기본, 채운 모양] 이름으로 추가한다(`GravityIconName` 타입이 이름을 검사한다). 모션 시간과 곡선은 키트 값(`duration`, `easing`)을 쓰고, 기존 컴포넌트의 `useMotion(ms)`·`EASE`는 그대로 둔다. 둘 다 동작 줄이기면 즉시 바뀐다.
- `StyleSheet`는 쓰지 않는다. 예외는 className이 적용되지 않는 서드파티 컴포넌트(`KeyboardAwareScrollView`, `SafeAreaView`, `KeyboardStickyView`)와 값이 계산되거나 조건부인 스타일(카드 그림자, 아이콘 칸 크기, 진행 링 글자 크기, 캘린더 막대 위치, 색 면 위 글자색, animated style)뿐이고, 이때는 `style`을 쓴다.
- 입력 폼 화면은 `FormScreen`(`shared/ui`)으로 감싼다. 포커스된 입력창을 키보드와 키보드 툴바 위로 올려 준다. 입력칸이 있는 탭 화면은 `react-native-keyboard-controller`의 `KeyboardAwareScrollView`(`bottomOffset` 16, className이 안 먹어 style로 지정), 화면 위에 겹쳐 그리는 입력 오버레이는 `KeyboardAvoidingView`, 모달 안 목록은 FlatList `renderScrollComponent`로 KASV를 쓴다. 새 입력칸을 일반 `ScrollView`에 넣지 않는다.
- 시트(모달 화면)는 시스템 헤더를 끄고(`headerShown: false`) `FormScreen header={<SheetHeader title onSave />}`로 손잡이와 취소·저장 알약을 그린다.
- 시트(모달 화면)에서 첫 입력창에 자동 포커스할 때 `autoFocus` 대신 `useFocusAfterTransition`(`shared/lib`)을 쓴다. 시트가 올라오는 도중에 포커스하면 화면이 위로 밀려 상단이 잘린다.

## 데이터

- 저장소는 기기 내 `expo-sqlite`다. 스키마는 `shared/db/schema.ts`의 `MIGRATIONS` 배열이고, 기존 항목은 고치지 않고 끝에 추가만 한다.
- 화면 조회는 `useQuery(sql, params)`를 쓴다. SQL의 `FROM`·`JOIN` 테이블이 바뀔 때만 다시 읽고, 결과가 같으면 리렌더하지 않는다(탭이 모두 마운트돼 있어 체크 한 번에 모든 조회가 깨어나기 때문). 서브쿼리나 뷰로 다른 테이블을 읽는 SQL을 쓰면 `tablesOf`가 그 테이블도 잡는지 확인한다.
- 삭제는 `deleted_at`을 채우는 soft delete다. 조회 쿼리는 `deleted_at IS NULL`로 거른다.
- 폼 검증은 페이지 `model/schema.ts`의 zod 스키마와 `fieldErrors`(`shared/lib`)로 한다. 저장을 누르면 해당 `Input`에 `invalid`와 `shakeKey`(저장 시도 횟수)를 주고, 입력칸이 있는 오류(제목·이름)는 칸 아래 `FieldError`로 알린다. 칸이 없는 오류(종료일, 요일)만 `showToast` error로 띄운다.

## 제품 규칙

- 화면 용어는 "할 일" 하나로 쓴다. 코드의 `events` 테이블과 `EventRow`가 화면의 할 일이다. 날짜가 있으면 캘린더와 오늘 탭에도 보인다. "일정"이라는 말은 화면에 쓰지 않는다.
- 앱 화면 문구(안내, 모달, 검증·에러 메시지)는 해요체로 쓴다. 예: "항목이 없어요.", "삭제할까요?"
- 모든 삭제는 실행 전에 `confirm()`(`shared/ui/dialog.tsx`)으로 확인을 받는다. 확인하면 soft delete 후 `showUndo`로 5초 실행취소를 띄운다.
- 시스템 `Alert.alert`는 쓰지 않는다. 확인은 `confirm()`, 짧은 안내·결과는 `showToast()`, 읽어야 하는 긴 안내는 `notify()`, 버튼이 여러 개면 `showDialog()`를 쓴다. 토스트 Host도 DialogHost처럼 루트와 `FormScreen` 양쪽에 있다. 시트(네이티브 모달)는 루트 화면을 가리므로 `DialogHost`가 루트와 `FormScreen` 양쪽에 있고, 가장 나중에 열린 화면의 Host만 그린다. 시트 화면을 `FormScreen` 없이 만들면 그 안에 `DialogHost`를 직접 둔다.
- 외부 통신은 없다.

## 검증 하네스

커밋하면 husky `pre-commit`이 `pnpm verify`를 실행하고, 하나라도 실패하면 커밋이 막힌다.

| 명령                 | 검사 내용                                                                       |
| -------------------- | ------------------------------------------------------------------------------- |
| `pnpm lint`          | ESLint (eslint-config-expo)                                                     |
| `prettier --check .` | 포맷. 설정은 `.prettierrc.json`, Tailwind 클래스 순서 정렬 플러그인 포함        |
| `pnpm arch`          | steiger. FSD 레이어 방향, slice 간 cross-import, public API 우회, 세그먼트 이름 |
| `pnpm knip`          | 안 쓰는 파일, export, 의존성. 설정은 `knip.json`                                |
| `pnpm verify`        | 위 네 가지를 순서대로                                                           |

훅에 들어 있지 않아서 작업을 끝내기 전에 직접 돌려야 하는 것:

| 명령             | 내용                                                |
| ---------------- | --------------------------------------------------- |
| `pnpm typecheck` | `tsc --noEmit`                                      |
| `pnpm test`      | jest. 테스트는 각 slice의 `model/__tests__/`에 둔다 |
| `pnpm format`    | 포맷 자동 수정                                      |
| `pnpm knip:fix`  | 안 쓰는 export·의존성 자동 정리(파일은 지우지 않음) |

knip 예외는 두 가지뿐이다. `expo-updates`(오탐), `steiger.config.mjs`(entry로 등록). 다른 예외를 추가하기 전에 실제로 지울 수 있는 코드인지 먼저 확인한다.

## 알려진 함정

- **Uniwind 타입 파일.** `src/uniwind-types.d.ts`는 Metro가 `global.css`를 읽어 만든다(`contentContainerClassName` 같은 className 타입). 직접 고치지 않는다. 테마나 Uniwind를 바꾼 뒤 타입 오류가 나면 번들을 한 번 만들면(`npx expo export` 또는 `npx expo start`) 다시 생긴다.
- **의존성을 바꾼 뒤 Metro를 그대로 두면 스타일이 전부 깨진다.** pnpm이 `node_modules`를 다시 링크하면서 실행 중인 번들에 모듈이 두 번 로드된다(`Tried to register two views with the same name ...`). 패키지를 추가하거나 지운 뒤에는 `npx expo start -c`로 다시 띄우고 앱을 완전히 다시 연다.
- **pnpm은 하위 의존성을 hoist하지 않는다.** 라이브러리의 peer 의존성(`react-native-svg`, `tailwindcss`, HeroUI의 `tailwind-variants`·`tailwind-merge`·`expo-blur`)은 앱에서 직접 쓰지 않아도 지우지 않는다. `tailwind-variants`는 HeroUI peer 범위(`^3.2.2`)에 맞춰 3.x로 둔다(`npx expo install`은 4.x를 고른다). 지우면 번들이 `Unable to resolve module`로 실패한다.
- **번들 확인은 기기 없이 할 수 있다.** `CI=1 npx expo export --platform ios --output-dir <임시 폴더>`로 빌드 오류를 먼저 잡는다.
- **jest와 네이티브 모듈.** `jest.setup.js`에서 keyboard-controller를 mock하고, `transformIgnorePatterns`에 `uniwind`를 추가해 두었다. public API(`index.ts`)가 UI까지 export하기 때문에, 순수 로직 테스트도 UI 의존성을 불러온다. `shared/lib`이 reanimated를 부르는 `shared/ui/motion.ts`를 import하면 jest에서 `loadUnpackersWithCode` 오류로 테스트가 모두 깨진다. `shared/lib`은 `shared/ui`를 import하지 않는다.
- **렌더 중 ref 읽기 금지.** eslint(React Compiler 규칙)가 렌더 중 `ref.current` 접근을 `Cannot access refs during render` 오류로 막는다. 렌더 결과에 영향을 주는 값(마지막으로 누른 칸, 방금 끝냈는지 등)은 `useState`로 둔다.
- **시뮬레이터 경로.** `xcode-select`가 Command Line Tools를 가리켜서 `xcrun simctl`을 바로 못 찾는다. `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`를 붙인다. Expo Go가 예전 번들을 계속 보여 주면 `simctl terminate`로 Expo Go를 끄고 `simctl openurl ... exp://127.0.0.1:8081`로 다시 연다(CLAUDE.md 참고).
- **네이티브 모듈 추가.** Expo Go에 없는 모듈이면 development build가 필요하다. 추가하기 전에 Expo SDK 58 문서에서 Expo Go 포함 여부를 확인한다.
