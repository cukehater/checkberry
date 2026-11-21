---
name: checkberry
description: 크림 바닥 위 흰 카드, 베리 빨강 하나와 잎 초록, 오늘은 이중 링과 습관 타일
colors:
  background: '#FDF8EC'
  surface: '#FFFFFF'
  surface-secondary: '#F8F3EA'
  text: '#1F1A17'
  text-muted: '#6F675F'
  default: '#EEE7DA'
  border: '#E8E0D2'
  separator: '#EFE8DC'
  track: '#D9CFBF'
  berry: '#E11D48'
  berry-soft: '#FFE4E9'
  berry-ink: '#B4123A'
  leaf: '#5EA61C'
  leaf-soft: '#EDF6E1'
  leaf-ink: '#3D7311'
  warning: '#F5A524'
  danger: '#C2410C'
  background-dark: '#120E0D'
  surface-dark: '#1D1917'
  surface-secondary-dark: '#27221F'
  text-dark: '#FBF6EE'
  text-muted-dark: '#A8A099'
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

Claude Design으로 만든 checkberry 디자인 키트를 옮긴 시스템이다. 크림 바닥 위에 흰 카드로 묶음을 나누고, 포인트는 베리 빨강 하나, 진행과 달성은 잎 초록이다. 오늘 탭은 습관·할 일 이중 링 카드, 2열 습관 타일, 체크하면 취소선이 그어지는 할 일 카드로 이뤄진다. HeroUI Native 테마 변수를 `global.css`에서 덮어쓰고, 공용 UI는 `src/shared/ui`에 있다. 아이콘은 Gravity UI Icons, 글꼴은 시스템 글꼴. 라이트·다크는 기기 설정을 따른다.

## Colors

- **베리 빨강** (`#E11D48`, 라이트·다크 같음, 흰 글자 4.70:1): 체크 채움, 습관 타일 완료 원, 바깥 진행 링, 주 버튼, 시트 저장, 글자 버튼, 오늘 날짜, 탭 바 선택, 헤더 + 버튼.
- **베리 soft** (`#FFE4E9` / `#3B1520`)와 **베리 ink** (`#B4123A` / `#FF8FA6`): 아직 안 한 습관 타일의 원과 아이콘, 고른 칩, 지연 외 로젠지.
- **잎 초록** (`#5EA61C` / `#6DBE2A`): 안쪽 진행 링(할 일), 연속 기록 강조(ink `#3D7311` / `#A6DB74`).
- **위험** (`#C2410C` / `#C8401A`): 지연 소제목, D+n 로젠지, 삭제.
- **경고** (`#F5A524` / `#F7B750`): 경고 로젠지(글자는 warning ink).
- 중립: 바닥 `#FDF8EC` / `#120E0D`, 카드 `#FFFFFF` / `#1D1917`, 타일·눌린 행 `#F8F3EA` / `#27221F`, 빈 체크 상자·보조 버튼·세그먼트 홈 `#EEE7DA` / `#2E2825`, 선 `#EFE8DC` / `#2F2925`.
- soft 색은 HeroUI 계산값(반투명) 대신 고정값이다(`global.css`의 `--cb-*`).
- 값은 `global.css`(className), `src/shared/ui/theme.ts`(`useColor()`), `app.json`(스플래시·적응형 아이콘 바탕)에 있다. 바꾸면 셋 다 고친다.

## Typography

시스템 글꼴(iOS: SF Pro + Apple SD Gothic Neo). 굵기는 `font-*` 클래스.

- 오늘 화면 제목 34 Bold, -0.8. 다른 화면 큰 제목은 28 Bold(`LargeTitle`). 큰 제목은 글자 크기 설정을 1.3배까지만 따른다.
- 카드 묶음 제목 18 SemiBold + 개수 배지(`ListHeader`).
- 할 일 행 제목 16 Medium / 22, 습관 타일 이름 15 Medium 한 줄 말줄임.
- 보조 14·13, 타일 메타 12. 숫자가 바뀌는 곳은 `tabular-nums`.

## Layout

오늘 화면 좌우 16px, 카드 안 16px(진행 카드 20px). 카드 사이 16px. 할 일 행 최소 52px, 행 사이 선은 글자 시작점(36px)부터. 습관 타일은 2열, 사이 8px, 홀수면 마지막 줄 오른쪽을 비운다.

## Elevation & Depth

크림 바닥과 흰 카드 두 층. 라이트 카드는 갈색 기운 옅은 그림자(`#3C2814` 8%, 0 2 4), 다크는 그림자 없이 면 밝기로 나눈다. 진행 카드는 HeroUI `Surface`라 HeroUI 그림자 변수(`--surface-shadow`)를 쓴다.

## Shapes

체크 상자 8px(24pt), 입력칸 14px, 습관 타일 18px, 카드 24px, 버튼·배지는 알약.

## Components

- **TodayProgressCard / ProgressRings** (`pages/today`): 140pt 이중 링. 바깥 14pt 습관(빨강), 안쪽 할 일(초록), 홈은 각 soft 색. 가운데 합친 완료율 % 와 '끝낸/전체'. 오른쪽에 인사말, 지연 로젠지, 범례 두 줄. 모두 끝내면 가운데가 베리 마크로 바뀐다.
- **HabitTile** (`entities/habit`): 높이 60, 18px, `surface-secondary` 면. 왼쪽 40pt 원(아직: 베리 soft + 아이콘, 완료: 베리 + 흰 체크), 이름, 메타('n일 연속' / '이번 주 x/y', 사흘 이상·주 목표 달성이면 불꽃 + 초록 SemiBold). 누르면 체크, 길게 누르면 편집.
- **할 일 행** (`entities/event` `TaskRow`): [체크 상자][제목 / D+n 로젠지·날짜 범위·반복 아이콘][중요도]. 체크하면 상자가 빨강으로 차고, 제목에 줄마다 취소선이 그어지며 행이 45%로 흐려지고 날짜·중요도가 숨는다. 누르면 완료, 길게 누르면 편집, 왼쪽으로 끌면 삭제(확인 후 실행취소).
- **QuickAddRow** (`pages/today`): 오늘 할 일 카드 맨 아래. 점선 + 칸과 입력칸, 글자를 넣으면 HeroUI `Button`(primary sm) '추가'가 나타난다. 키보드 완료로도 추가되고 키보드는 열어 둔다. 오늘 날짜, 중요도 보통으로 만든다.
- **Check**: 24pt 8px 둥근 면. 빈 칸은 `default` 회색, 완료는 빨강.
- **BrandMark / MARK**: 바탕을 지운 베리 마크 이미지. 오늘 탭 헤더(28 + 'checkberry' 17 Bold), 온보딩, 진행 링 완료 상태. 20보다 작게 쓰지 않는다.
- **BrandSplash**: 시스템 스플래시(크림 + 마크) 다음 0.7초 꾸밈 배경 + 마크 148 + 워드마크. 다크는 배경 그림 없이.
- **Lozenge / Badge / Chip / Segmented / Input / ActionButton / SwipeRow / 다이얼로그 / 실행취소 / 탭 바**: 구조는 이전과 같고 색만 키트 토큰을 따른다. 탭 바 선택은 빨강 + 집 아이콘만 채운 모양.
- **아이콘**: Gravity UI Icons(16 격자, 채운 모양). `ICONS`에 이름을 적는다.
- **오늘 마무리 문구**: 다 끝내면 '오늘 체크베리를 다 땄어요', 아무것도 없으면 '오늘 딸 체크베리가 아직 없어요'. 이 두 곳 밖에서는 말장난을 쓰지 않는다.

## Motion

키트 값(`shared/ui/motion.ts`). 동작 줄이기가 켜져 있으면 튐·퍼짐·그리기를 끄고 색과 체크만 바로 바뀐다.

| 상황       | 움직임                                           | 시간  | 햅틱    |
| ---------- | ------------------------------------------------ | ----- | ------- |
| 누름(타일) | 0.96배                                           | 140ms | 없음    |
| 습관 체크  | 원이 차며 튀고 체크가 그려짐, 메타 숫자 튐       | 280ms | Light   |
| 할 일 체크 | 상자 채움, 줄마다 취소선, 흐려짐                 | 320ms | 선택    |
| 완료 정리  | 0.9초 제자리에 머문 뒤 아래로(`useSettledOrder`) | 300ms | 없음    |
| 진행 링    | 이어서 차오름                                    | 600ms | 없음    |
| 모두 완료  | 베리 12개 퍼짐, 가운데 로고 마크                 | 900ms | Success |

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
