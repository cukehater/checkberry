---
name: checkberry
description: 크림 바닥 위 흰 카드, 베리 빨강 하나와 잎 초록, 오늘은 이중 링과 습관 타일
colors:
  background: '#FDF8EC'
  surface: '#FFFFFF'
  surface-secondary: '#F8F3EA'
  text: '#1F1A17'
  text-muted: '#6B635B'
  default: '#EEE7DA'
  border: '#E8E0D2'
  separator: '#EFE8DC'
  track: '#D9CFBF'
  berry: '#E11D48'
  berry-soft: '#FFE4E9'
  berry-ink: '#B4123A'
  leaf: '#5EA61C'
  leaf-soft: '#EAF5DD'
  leaf-ink: '#3B6E10'
  warning: '#F5A524'
  danger: '#C2410C'
  background-dark: '#120E0D'
  surface-dark: '#1D1917'
  surface-secondary-dark: '#27221F'
  text-dark: '#FBF6EE'
  text-muted-dark: '#B5ACA3'
  default-dark: '#2E2825'
  separator-dark: '#2F2925'
  berry-soft-dark: '#3B1520'
  berry-ink-dark: '#FF8FA6'
  leaf-dark: '#6DBE2A'
  danger-dark: '#C8401A'
typography:
  display:
    fontSize: '34px'
    fontWeight: 700
    lineHeight: '40px'
    letterSpacing: '-0.8px'
  section:
    fontSize: '18px'
    fontWeight: 600
    lineHeight: '24px'
  row:
    fontSize: '16px'
    fontWeight: 500
    lineHeight: '22px'
  meta:
    fontSize: '14px'
    fontWeight: 500
  caption:
    fontSize: '12px'
    fontWeight: 500
rounded:
  check-box: '8px'
  field: '14px'
  tile: '18px'
  card: '24px'
  pill: '9999px'
spacing:
  screen-x: '16px'
  card-x: '16px'
  row-min: '52px'
---

# Design System: checkberry

## Overview

Claude Design으로 만든 checkberry 디자인 키트를 옮긴 시스템이다. 크림 바닥 위에 흰 카드로 묶음을 나누고, 포인트는 베리 빨강 하나, 진행과 달성은 잎 초록이다. 오늘 탭은 습관·할 일 이중 링 카드, 한 줄에 하나씩 놓는 습관 타일, 체크하면 취소선이 그어지는 할 일 카드로 이뤄진다. HeroUI Native 테마 변수를 `global.css`에서 덮어쓰고, 공용 UI는 `src/shared/ui`에 있다. 아이콘은 Gravity UI Icons, 글꼴은 시스템 글꼴. 라이트·다크는 기기 설정을 따른다.

## Colors

- **다크 모드의 할 일은 서리 파랑.** 포인트는 라이트·다크 모두 베리다. 할 일(체크 상자, 빈 상태 할 일 버튼, 스와이프 체크)은 `task` 토큰으로 라이트 잎 초록 / 다크 서리 파랑 `#6FB3E0`(soft `#14232E`, ink `#9BC8E6`). `success`는 성공·완료 의미(토스트, 백업 상태 점)로만 남는다. 오늘 진행 링과 범례는 두 모드 모두 바깥 습관 베리, 안쪽 할 일 잎 초록(`ringHabit`·`ringTask`).

- **베리 빨강** (`#E11D48`, 라이트·다크 같음, 흰 글자 4.70:1): 체크 채움, 습관 타일 완료 원, 바깥 진행 링, 주 버튼, 시트 저장, 확인 다이얼로그 버튼, 글자 버튼, 오늘 날짜, 헤더 + 버튼 아이콘.
- **베리 soft** (`#FFE4E9` / `#3B1520`)와 **베리 ink** (`#B4123A` / `#FF8FA6`): 아직 안 한 습관 타일의 원과 아이콘, 고른 칩(+ 체크), 탭 바 선택 알약(채운 아이콘·글자는 ink), 헤더 + 칩 바탕, `IconChip`, 실행취소 바 아이콘 칩, D-n 로젠지.
- **잎 초록** (`#5EA61C` / `#6DBE2A`): 할 일 체크 상자 채움, 안쪽 진행 링(할 일). soft `#EAF5DD` / `#1E2C13`(링 트랙, 캘린더 할 일 막대, 할 일 추가 버튼), ink `#3B6E10` / `#A6DA74`.
- **호박(ember)** (soft `#FFF1D6` / `#2A1F0B`, ink `#8A5300` / `#F4C978`, `warning-soft`): 연속 3단계. **서리(frost)** (soft `#E6F1F8` / `#14232E`, ink `#2F5D7C` / `#9BC8E6`): 연속 1단계, 중요도 '낮음' 배지.
- **border-strong** (`#958B80` / `#7A7069`): 안 체크한 체크 상자 테두리, 바로 추가 점선.
- **위험** (`#C2410C` / `#C8401A`, soft `#FDEBDF` / `#3A1D12`, ink `#B23A0B` / `#F59A70`): 지연 소제목, D+n 로젠지, 입력 오류 테두리, 삭제. 채움은 되돌릴 수 없는 다이얼로그 버튼에만, 화면의 삭제 버튼은 soft 면 + ink 글자.
- **경고** (`#F5A524` / `#F7B750`): 경고 로젠지(글자는 warning ink).
- 중립: 바닥 `#FDF8EC` / `#120E0D`, 카드·탭 바·떠 있는 면 `#FFFFFF` / `#1D1917`, 타일·눌린 행 `#F8F3EA` / `#27221F`, 빈 체크 상자·보조 버튼·취소·안 고른 칩·세그먼트 트랙·개수 배지 `#EEE7DA` / `#2E2825`, 세그먼트 고른 칸 `#FFFFFF` / `#4A423D`, 선 `#EFE8DC` / `#2F2925`. 탭 바 안 고른 탭은 muted.
- soft 색은 HeroUI 계산값(반투명) 대신 고정값이다(`global.css`의 `--cb-*`).
- 값은 `global.css`(className), `src/shared/ui/theme.ts`(`useColor()`), `app.json`(스플래시·적응형 아이콘 바탕)에 있다. 바꾸면 셋 다 고친다.

## Typography

시스템 글꼴(iOS: SF Pro + Apple SD Gothic Neo). 굵기는 `font-*` 클래스.

- 화면 큰 제목 34 Bold / 40, -0.8(오늘 탭 제목, `LargeTitle`). 큰 제목은 글자 크기 설정을 1.3배까지만 따른다.
- 카드 묶음 제목 18 SemiBold + 개수 배지(`ListHeader`).
- 할 일 행 제목 16 Medium / 22, 습관 타일 이름 15 Medium 두 줄까지.
- 보조 14·13, 타일 메타 12. 폼 필드 머리글(`Section`) 14 Medium, 입력 16. 탭 라벨 11/13(고른 탭 SemiBold, 나머지 Medium). 숫자가 바뀌는 곳은 `tabular-nums`.
- 줄바꿈은 어절 단위(`lineBreakStrategyIOS="hangul-word"`). 공용 `Text`·`Input`에 기본으로 들어 있다.

## Layout

오늘 화면 좌우 16px, 카드 안 16px(진행 카드 20px). 카드 사이 16px. 할 일 행 최소 52px, 행 사이 선은 글자 시작점(36px)부터. 습관 타일은 한 줄에 하나씩 전체 폭, 사이 8px.

탭 바는 화면 아래 떠 있는 알약이다(좌우 16, 높이 64, 홈 인디케이터가 있으면 아래 26, 없으면 16). 탭 화면은 그 뒤로 스크롤되므로 스크롤 콘텐츠 하단 여백을 `useTabBarInset()`(탭 바 위 16pt까지)으로 준다. 실행취소 바는 탭 바 14pt 위에 뜬다. 헤더 오른쪽 칩은 40pt, 칩 사이 8pt.

## Elevation & Depth

크림 바닥과 흰 카드 두 층. 라이트 카드·검색창·입력 카드는 갈색 기운 옅은 그림자(`#3C2814` 8%, 0 2 4), 다크는 그림자 대신 1pt `rgba(255,255,255,0.07)` 윤곽선(`useCardStyle()`). 진행 카드는 HeroUI `Surface`라 라이트는 `--surface-shadow`, 다크는 같은 윤곽선. 떠 있는 면(탭 바, 실행취소 바, 다이얼로그, 키보드 막대)은 surface-raised(`#FFFFFF` / `#2A2420`)와 `useOverlayShadow()`: 라이트는 갈색 12% 0 8 14, 다크는 검정 50% 그림자 + 1pt `rgba(255,255,255,0.10)` 테두리. 다이얼로그 스크림은 `backdrop`(`rgba(48,36,24,0.34)` / `rgba(0,0,0,0.62)`). 시트 바닥은 `sheet`(`#FDF8EC` / `#171311`).

## Shapes

체크 상자 8px(24pt), 입력칸·검색창 14px, 습관 타일 18px, 카드·다이얼로그·실행취소 바 24px, 탭 바 32px(안의 탭 26px), 버튼·칩·배지·로젠지·세그먼트는 알약.

## Components

- **TodayProgressCard / ProgressRings** (`pages/today`): 카드 맨 위 제목(18 SemiBold)이 진행을 말한다('체크베리 n개 남았어요' → 다 하면 '오늘 하루도 수고했어요'). 128pt 이중 링(두께 13, 바깥 r56 습관 베리, 안쪽 r38 할 일 잎, 홈은 각 soft), 가운데 합친 완료율 30 Bold. 오른쪽 범례 두 줄(라벨 14 Medium, n/m 16 Bold, 6pt 막대). 모두 끝내면 가운데가 `done-berry` Lottie(76)로 바뀐다. 주 N회 습관이 이번 주 목표를 채웠고 오늘 안 했으면 분모에서 뺀다(`habitTally`). 오늘 할 것이 하나도 없으면 이 카드 대신 `EmptyState art="today"`.
- **HabitTile** (`entities/habit`): 전체 폭, 58pt, 18px, `surface-secondary` 면. [38pt 원][이름 16 Medium 한 줄 / 캡션 13][StreakBadge]. 상태 셋: todo 습관 원 + 아이콘(라이트 베리 soft + 베리 ink, 다크 베리 soft `#3B1520` + `#FF8FA6` `useColor().habitBg/habitInk`로 나눈다. 습관 칩도 같다), done 베리 + 흰 체크, weekDone(주 N회 목표 달성, 오늘 분모 제외) 베리 soft + 1.5pt 베리 테두리 + 베리 ink 체크. 주 N회 캡션은 '이번 주 2/3'(채우면 '… 완료'). 누르면 체크, 길게 누르면 편집.
- **할 일 행** (`entities/event` `TaskRow`): 1줄 48pt, 날짜 줄이 있으면 약 64pt. [체크 상자][제목 / 마감 칩(`Lozenge size="sm"`, 지연 D+n만 벽돌, D-Day·D-n은 중립 회색)·날짜 범위·반복][중요도 배지: '높음' 베리 soft, '낮음' 서리(파랑) soft, '보통'은 배지 없음]. `context="sameDay"`(오늘 탭, 캘린더 날짜 패널, 할 일 '오늘' 필터)는 화면이 이미 날짜를 말하니 지연과 여러 날 범위만 날짜 줄을 그린다. 체크하면 상자가 잎 초록으로 차고 취소선이 그어지며 행이 흐려진다. 체크 상자를 누르거나 오른쪽으로 끌면 완료 토글(잎 초록 면 + 체크, 햅틱), 행의 나머지를 누르면 편집, 왼쪽으로 끌면 삭제(확인 후).
- **QuickAddRow** (`pages/today`): 오늘 할 일 카드 맨 아래. 점선 + 칸과 입력칸, 글자를 넣으면 HeroUI `Button`(primary sm) '추가'가 나타난다. 키보드 완료로도 추가되고 키보드는 열어 둔다. 오늘 날짜, 중요도 보통으로 만든다.
- **Check**: 24pt 8px. 빈 칸은 채움 없이 1.5pt `border-strong`(`#958B80` / `#7A7069`, 카드 대비 3:1 이상), 완료는 잎 초록 채움 + 흰 체크.
- **BrandMark / MARK**: 바탕을 지운 베리 마크 이미지. 오늘 탭 헤더(28 + 'checkberry' 17 Bold), 온보딩, 진행 링 완료 상태. 20보다 작게 쓰지 않는다.
- **BrandSplash**: 시스템 스플래시(크림 + 마크) 다음 0.7초 꾸밈 배경 + 마크 148 + 워드마크. 다크는 배경 그림 없이.
- **IconButton** (`shared/ui`): 40pt 원형 칩, 아이콘 18, 누르는 영역 44pt, 누르면 0.96배(`usePressScale`). `accent`는 베리 soft 면 + 베리 아이콘(헤더 +), `neutral`은 `default` 면 + 글자색 아이콘(헤더 설정, 습관·캘린더 이전/다음). 나란히 두면 `gap-1`(칩 사이 8pt).
- **캘린더 날짜 패널의 습관 칩** (`pages/calendar` `DayPanel`): 오른쪽 26pt 회색 알약. 지난 날·오늘은 '습관 ●●○○ 2/4'(점 8pt, 5개까지), 미래는 불꽃 + '습관 n개 예정'. 숫자는 오늘 링과 같은 `habitTally`.
- **탭 바** (`app/(tabs)/_layout.tsx` `PillTabBar`): 떠 있는 surface-raised 알약(높이 62, 아래 24, 좌우 16, 안쪽 6, 탭 사이 4). 탭은 아이콘 20 + 라벨 12. 고른 탭만 베리 soft 알약(26px) 위 채운 아이콘과 베리 ink SemiBold 글자, 나머지는 muted. 누르면 0.96배.
- **Segmented**: 회색 알약 트랙(안쪽 3, 칸 사이 2) 위 흰 알약(`segment`, 옅은 그림자)이 고른 칸. 전체 폭, 같은 너비 칸(최소 56pt) 36pt, 5칸 이상이면 14 아니면 15 Medium. 흰 알약이 220ms 동안 미끄러진다. 값이 어느 칸에도 없으면(`null`, 할 일 시작일이 오늘·내일이 아닐 때) 고른 칸을 그리지 않는다.
- **Chip**: 32pt 알약, 14 Medium. 고르면 베리 soft 면 + ink 글자와 앞에 12pt 체크, 아니면 회색 면. `outline`은 테두리만(+ 새 그룹 같은 동작 칩). `icon`을 주면 체크 대신 그것.
- **Lozenge**: 알약 세 크기. `sm` 마감 칩 22pt 12 Bold, `md` 중요도·보관 24pt 12 SemiBold, `lg` 화면 머리 메타 칩 26pt 13 SemiBold. tone: `default`(회색), `accent`, `success`, `warning`(호박 ember), `danger`(지연·D+n), `frost`(서리: 중요도 낮음). `icon`은 글자 앞 글리프, `leading`은 그 자리에 그릴 요소(최고 연속 칩의 단계 그림 22).
- **개수 배지** (`ListHeader`의 `count`, 할 일 그룹 카드): 24pt 회색 알약 안 개수 13 SemiBold. 모든 카드 제목에서 같다.
- **ListGroup / ListHeader**: 카드 24px 흰 면. 그림자 층과 자르는 층(overflow-hidden) 두 겹이라 스와이프 행 바탕이 모서리 밖으로 나오지 않는다. 카드 안 머리(`inCard`)는 52pt 줄에 18 SemiBold 제목 + 개수 배지, `chevron`('down' 펼침 / 'right' 접힘)을 주면 오른쪽 끝에 16pt muted 화살표를 그린다(누르기는 부르는 쪽).
- **IconChip**: 원 안 글리프(지름의 절반). `accent`(베리 soft 면 + ink, 환영 기능 목록), `neutral`(회색 면 + 보조 글자색, 설정 행·날짜 행). 장식에는 베리를 쓰지 않는다.
- **Input / SearchField**: 입력칸 52pt, 14px, 흰 면, 16 글자, 안쪽 16. 1pt `field-border` 테두리(라이트 투명, 다크는 카드와 같은 `rgba(255,255,255,0.07)`), 입력 중 1.5pt 베리, `invalid`면 1.5pt `danger-line`(`#C2410C` / `#F0763A`). 검색창은 48pt, 테두리 없이 카드 층(`useCardStyle`), 돋보기 16 muted.
- **Section**: 폼 필드 머리글 14 SemiBold(글자색) 아래 내용. 할 일 중요도는 '낮음·보통·높음' 3칸 `Segmented`.
- **ActionButton**: 48pt 알약(`size="lg"` 56pt·17), 16 SemiBold. `primary` 베리 채움, `plain` 회색, `danger` 벽돌 soft + ink, `link` 바탕 없는 베리 글자. `icon`은 글자 앞 16pt 글리프.
- **SheetHeader**: 시스템 헤더를 끄고 시트 맨 위에 직접 그린다(`FormScreen header`). 손잡이 36×5(track), 44pt 줄에 [취소 36pt 회색 알약 15 Medium] 제목 17 SemiBold('할 일 추가'·'할 일 편집'·'습관 추가'·'습관 편집') [저장 36pt 베리 알약 15 SemiBold]. 시트 좌우 16, 필드 사이 20. 키보드 막대는 surface-raised 면, 화살표 글자색, '완료' 16 SemiBold 베리.
- **다이얼로그** (`DialogHost`): 최대 340pt surface-raised 카드(다크 1pt 밝은 테두리), 24px, 안쪽 20. 되돌릴 수 없는 동작이면 위에 44pt 벽돌 soft 원 + 휴지통 20. 제목 18 SemiBold / 26, 설명 15 / 22 muted, `hint`는 아래 14 muted 둘째 문장. 버튼은 오른쪽 아래 44pt 알약(15 SemiBold, 사이 8): 취소 회색, 확인 베리, 삭제 벽돌 채움. 삭제 문구는 무엇이 지워지는지와 대안을 말한다('‘책 읽기’와 지금까지의 기록이 모두 지워져요. … 보관을 고르세요.'). **동작 메뉴**(`showMenu`, 그룹 메뉴): 제목('업무 그룹') + 부제('할 일 3개') + 52pt 목록 행(아이콘 20 + 16 Medium, 삭제는 오류 글자색) + 전체 폭 취소(테두리만, 고르는 버튼과 구분). 삭제를 고르면 확인 다이얼로그로 이어진다. `row`면 항목을 한 줄에 같은 폭 회색 버튼(아이콘 20 + 15 SemiBold, 72pt)으로 나란히 둔다(오늘 바로 추가의 중요도 고르기).
- **실행취소 바** (`UndoBar`): 탭 바 위 떠 있는 흰 카드(24px, 안쪽 10·12). 왼쪽 36pt 베리 soft 원 + 아이콘(삭제는 휴지통, 반복 미루기는 반복), 메시지 15 Medium 한 줄, 오른쪽 '실행취소' 36pt 회색 알약 14 SemiBold.
- **SwipeRow**: 구조는 이전과 같고 색만 키트 토큰을 따른다.
- **아이콘**: 앱 UI는 Gravity UI Icons(16 격자, 채운 모양). `ICONS`에 이름을 적는다. 습관 아이콘만 Phosphor Icons fill.
- **토스트** (`shared/ui/toast.tsx` `showToast`): 탭 화면은 안전 영역 아래 8pt, 시트는 헤더 바로 아래 8pt 흰 알약, 왼쪽 32pt 아이콘 칩(error 벽돌 soft / success 잎 soft / info 베리 soft), 15 Medium 한 줄, 2.4초, 위로 밀어 닫기, 새 것이 앞의 것을 바꾼다. 확인만 있는 안내·짧은 오류·폼 오류는 토스트, 읽어야 하는 긴 설명은 다이얼로그.
- **폼 오류**: 입력칸이 있는 오류(할 일 제목, 습관 이름)는 칸 아래 8pt `FieldError`(원 느낌표 15 + 13 SemiBold, 오류 글자색, '제목을 적어 주세요.')와 `danger-line` 테두리 + 흔들림. 칸이 없는 오류(종료일, 요일)만 error 토스트.
- **StreakBadge** (`entities/habit`): 메달 배지. 알약 26pt(왼쪽 21·오른쪽 10, 숫자 15 Bold + 단위 12 SemiBold '일'·'주')의 왼쪽 끝에서 15pt 밖·3pt 위에 메달 원 32(바탕은 놓인 면 색: 타일 위 `surface-secondary`, 흰 카드 위 `card`) 안 Lottie 28. 단계(`streakStage`): 일 1–2 얼음 / 3–6 물방울 / 7–13 불씨 / 14–29 불꽃 / 30+ 활활, 주 1 / 2–3 / 4–7 / 8–11 / 12+. 알약 색: 얼음 frost soft, 물방울 회색, 불씨 호박(ember) soft, 불꽃 베리 soft, 활활 베리 채움(벽돌은 쓰지 않는다). 목록에서는 첫 프레임에 멈춰 있고 체크한 순간에만 한 번 재생, 동작 줄이기면 정지. 0이면 그리지 않는다. 에셋은 `assets/lottie/streak-*.json`. 습관 편집에는 단계 카드(Lottie 48 반복 + '불씨 단계' + '7일 더 이어 가면 불꽃이 돼요')를 둔다.
- **습관 탭 주 요약 카드**: 큰 제목 아래 카드. 큰 % 34 Bold(굴러감) + 지난주 대비 ▲(잎 ink)/▼(danger) %p, 요일별 베리 7알(그날 달성률만큼 아래에서 베리로 익고 덜 익은 부분은 success-soft, 미래 날은 track 테두리, 예정 없음은 점). 습관 카드 요일 열과 세로 정렬. 평균이 없는 주에는 숨긴다.
- **DatePicker** (`shared/ui`): 카드 안에 펼치는 달력(flash-calendar의 격자 + 토큰으로 그린 칸). 선택일 베리 원, 오늘 베리 soft 원, 기간은 베리 soft 띠 + 양 끝 베리 원, 일요일 벽돌색.
- **습관 아이콘**: Phosphor Icons fill(약 1500개), `ph:<이름>`으로 저장(옛 키·`gi:`는 앱 시작 때 옮김). 피커는 6열 격자, 최근 8개, 추천 36개 뒤에 전체. 검색은 영문 이름 → Phosphor 태그('workout' → barbell) → 한국어 별칭 순. 전체 데이터는 `pnpm icons:gen`으로 생성. 습관 편집의 '아이콘 고르기' 행에는 아이콘 이름을 쓰지 않는다.
- **Toggle**: 51×31 트랙 + 27pt 정원 손잡이(켜짐 베리, 꺼짐 track), 220ms. RN `Switch`는 iOS 26에서 손잡이가 가로로 길어 쓰지 않는다.
- **탭 헤더**: 버튼 줄(44) 아래 12pt 바닥색 띠를 둬서 스크롤한 내용이 버튼 바로 밑에서 잘리지 않는다. 큰 제목은 띠 바로 아래.
- **화면 모드**: 설정 맨 위 세그먼트(시스템/라이트/다크), `Uniwind.setTheme` 하나로 className·`useColorScheme`·네이티브 헤더가 함께 바뀐다. 저장 키 `theme`.
- **상태 점**: 설명 글 앞 8pt 원(좋음 success, 주의 warning, 없음 muted). 글자가 함께 상태를 말한다. 지난 시각은 `formatAgo`('3일 전').
- **헤더·이동 칩 간격**: 칩 사이 8pt, 화면 가장자리에서 칩 바깥 16pt(`CHIP_GAP`·`CHIP_EDGE`).
- **탭 상단** (`LargeTitle`): 모든 탭이 같은 자리. 헤더 툴바 아래 6pt에 큰 제목 34 Bold / 41(오늘·할 일·습관·캘린더), 오른쪽 슬롯(순서 바꾸기 / 이번 주 / 월·주 세그먼트), 그 아래 6pt 메타 칩 줄(`Lozenge size="lg"`, 사이 6): 오늘 '11월 21일 토요일'(중립)·'지연 n'(danger), 할 일 '남은 n'·'지연 n', 습관 'n개 진행 중'·'최고 연속 n일'(단계 그림). 첫 콘텐츠까지 16, 카드 사이 12. 값이 0이면 그 칩은 숨긴다.
- **연속 기록 토스트**: 이정표(3·7·14·30·100) 축하 토스트의 왼쪽 칩은 그 단계 알약 색 원 + 같은 단계 그림(`StreakToastIcon`, 한 번 재생).
- **화면 배치** (디자인 산출물 기준):
  - 할 일: 큰 제목 오른쪽 '순서 바꾸기' 36pt 알약, 검색칸, 전체 폭 `Segmented` 필터, 그룹마다 카드(머리 눌러 접기, 길게 눌러 이름 바꾸기·삭제 — 할 일은 그룹 없음으로).
  - 습관: 큰 제목 아래 기간 이동 줄(`PeriodNav`, 40pt, 가운데 'YYYY년 N월 N주차' 20 Bold, 목요일 기준. 날짜 범위는 읽기 라벨에만), 주 요약 카드, 카드 머리에 요일(12 SemiBold, 일요일도 같은 색)+날짜(오늘 칸 베리 채움), 습관 행(주 N회는 이름 아래 주간 캡션, 오른쪽 메달 배지) 아래 7칸 원. 습관이 없으면 기간 이동을 숨기고 `EmptyState art="habits"`(얼음).
  - 캘린더: 월 보기 하나. 큰 제목 '캘린더'(보이는 달에 오늘이 없으면 오른쪽 '오늘' 알약), 아래 `PeriodNav`('YYYY년 M월'). 달력 카드를 좌우로 밀어 넘김(이 탭만 밀어서 탭 이동 꺼짐). 칸 84pt, 요일·일요일 숫자는 다른 날과 같은 색. 할 일이 있는 날(완료 포함, 여러 날 할 일은 걸친 날마다)은 날짜 숫자 원 아래 5pt 잎 초록 점. 펼침·접힘 모두 같은 점이고 개수는 쓰지 않는다. 목록은 날짜를 눌러 패널에서 본다(행을 누르면 편집). 고른 날은 베리 원, 오늘은 베리 soft 원.
  - 시트: `SheetHeader` 아래 필드 라벨(`Section`) + Input·`Segmented`·`Chip`, 날짜는 흰 카드 안 날짜 행(56pt, 중립 아이콘 원 34, 모든 행에 28pt 꼬리 칸 › 또는 종료일 ×), 맨 아래 큰 알약(보관 회색, 삭제 벽돌). 습관 추가는 맨 위에 오늘 탭 타일 그대로의 미리보기(흰 카드, 안쪽 12), 습관 편집은 이름 줄 + 통계 세 칸(단위 일·주) + 단계 카드. 요일 칩은 회색 원, 고르면 베리.
  - 설정: '‹ 뒤로' 회색 알약(시스템 헤더 없음), 아이콘 칩 카드 행, 카드 밖 '모든 데이터 삭제' 벽돌 알약.
  - 환영: 라이트는 꾸밈 배경, 앱 아이콘 104pt, 기능 카드 3줄, '시작하기' 56pt 베리 알약 + '백업 파일로 복원' 회색.
- **오늘 마무리 문구**: 다 끝내면 진행 카드 제목 '오늘 하루도 수고했어요', 아무것도 없으면 빈 상태 '오늘 딸 체크베리가 아직 없어요'. 이 두 곳 밖에서는 말장난을 쓰지 않는다.
- **빈 상태** (`EmptyState`): 흰 카드 하나(안쪽 24/16) 안에 Lottie 112 · 제목 17 SemiBold · 설명 14/20 · 44pt soft 버튼 하나(할 일 잎 soft, 습관 베리 soft). 데이터가 0개인 화면은 검색·필터·기간 이동 줄을 숨긴다. 그림: 오늘 새싹, 할 일 클립보드, 습관 얼음.

## Motion

키트 값(`shared/ui/motion.ts`). 동작 줄이기가 켜져 있으면 튐·퍼짐·그리기를 끄고 색과 체크만 바로 바뀐다.

| 상황        | 움직임                                                                                 | 시간          | 햅틱               |
| ----------- | -------------------------------------------------------------------------------------- | ------------- | ------------------ |
| 누름(타일)  | 0.96배                                                                                 | 140ms         | 없음               |
| 습관 체크   | 원 0.8배→1.12배→spring 제자리, 베리 파편 6개, 체크 그려짐                              | 260ms         | Medium(해제 Light) |
| 할 일 체크  | 상자 채움, 줄마다 취소선, 흐려짐                                                       | 320ms         | 선택               |
| 완료 정리   | 0.9초 제자리에 머문 뒤 아래로(`useSettledOrder`)                                       | 300ms         | 없음               |
| 진행 링     | 이어서 차오름                                                                          | 600ms         | 없음               |
| 모두 완료   | 링 가운데 베리 Lottie, 카드 0.96→spring 튐과 베리 12개가 카드 밖으로(직접 끝냈을 때만) | 360ms / 900ms | Heavy→Success      |
| 연속 이정표 | 3·7·14·30·100에 닿는 체크: success 토스트, 불꽃 배지 숫자 굴러감                       | 220ms         | Success            |
| 세그먼트    | 흰 알약이 칸 사이를 미끄러짐, 글자색 보간                                              | 220ms         | 없음               |
| 숫자 바뀜   | `RollingNumber`: 이전 값 위로 빠지고 새 값 올라옴                                      | 220ms         | 없음               |
| 목록 항목   | 추가 FadeIn, 제거 FadeOut, 자리 이동(처음 그릴 때는 없음)                              | 360/160/300ms | 없음               |
| 그룹 접기   | 높이와 chevron 회전                                                                    | 220ms         | 길게 누르면 Medium |
| 캘린더 넘김 | 손가락을 따라가다 나가고(140ms) 새 달이 들어옴                                         | 220ms         | 없음               |
| 토스트      | 위에서 spring으로 내려옴, 2.4초 뒤 흐려짐                                              | 160ms 닫힘    | 없음               |
| 입력 오류   | 칸 좌우 흔들림 3회                                                                     | 240ms         | Warning            |

모두 완료 연출은 오늘 탭에서 마지막 하나를 직접 끝낸 순간에만 나온다. 화면을 열 때 이미 끝나 있거나, 다른 탭에서 끝내거나, 남은 것을 지워서 완료가 되면 마크만 조용히 보인다. 그 밖의 기존 컴포넌트(체크 상자, 실행취소 바, 캘린더 접기)는 `useMotion`·`EASE`(160·250·400ms)를 그대로 쓴다.

## Do's and Don'ts

### Do:

- 색은 className 토큰이나 `useColor()`로만 쓴다. hex를 컴포넌트에 직접 쓰지 않는다.
- 묶음은 크림 바닥 위 흰 카드와 카드 안 묶음 제목으로 나눈다.
- 새 아이콘은 Gravity UI에서 고르고 `gravity-icons.data.ts`와 `ICONS`에 추가한다.

### Don't:

- 빨강을 장식에 쓰지 않는다. 습관 아이콘마다 색을 나누지 않는다(모두 베리 ink).
- 카드 안에 카드를 넣지 않는다(습관 타일은 카드 안 면이지 카드가 아니다).
- 화면을 열 때 목록 전체가 차례로 나타나는 연출은 하지 않는다.
- 시스템 `Alert.alert`를 쓰지 않는다.
