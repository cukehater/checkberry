import { useColorScheme } from 'react-native';

// global.css 토큰과 같은 값. className을 못 쓰는 곳(아이콘 tint, SVG, 내비게이션 옵션, animated style)에서 쓴다
const LIGHT = {
  bg: '#FDF8EC',
  card: '#FFFFFF',
  // 습관 타일, 눌린 행 바탕
  cardSoft: '#F8F3EA',
  // 다이얼로그·탭 바·키보드 막대(surface-raised)
  raisedBg: '#FFFFFF',
  // 시트 바닥
  sheet: '#FDF8EC',
  text: '#1F1A17',
  sub: '#6B635B',
  line: '#EFE8DC',
  border: '#E8E0D2',
  // 체크 상자 빈 바탕, 보조 버튼
  neutral: '#EEE7DA',
  // 꺼진 스위치, 빈 칸 테두리
  track: '#D9CFBF',
  // 안 체크한 체크 상자 테두리
  borderStrong: '#958B80',
  accent: '#E11D48',
  onAccent: '#FFFFFF',
  accentSoft: '#FFE4E9',
  accentInk: '#B4123A',
  success: '#5EA61C',
  successSoft: '#EAF5DD',
  successInk: '#3B6E10',
  warning: '#F5A524',
  warningSoft: '#FFF1D6',
  warningInk: '#8A5300',
  frostSoft: '#E6F1F8',
  frostInk: '#2F5D7C',
  danger: '#C2410C',
  dangerInk: '#B23A0B',
  // 카드 그림자를 켤지(다크는 그림자 대신 1pt 윤곽선으로 층을 나눈다)
  raised: true,
};

const DARK: typeof LIGHT = {
  bg: '#120E0D',
  card: '#1D1917',
  cardSoft: '#27221F',
  raisedBg: '#2A2420',
  sheet: '#171311',
  text: '#FBF6EE',
  sub: '#B5ACA3',
  line: '#2F2925',
  border: '#332C28',
  neutral: '#2E2825',
  track: '#544A43',
  borderStrong: '#7A7069',
  accent: '#E11D48',
  onAccent: '#FFFFFF',
  accentSoft: '#3B1520',
  accentInk: '#FF8FA6',
  success: '#6DBE2A',
  successSoft: '#1E2C13',
  successInk: '#A6DA74',
  warning: '#F7B750',
  warningSoft: '#2A1F0B',
  warningInk: '#F4C978',
  frostSoft: '#14232E',
  frostInk: '#9BC8E6',
  danger: '#C8401A',
  dangerInk: '#F59A70',
  raised: false,
};

/** 기기의 라이트·다크 설정에 맞는 색 */
export function useColor() {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}

// 라이트 모드 카드의 옅은 그림자(갈색 기운, --shadow-surface)
const CARD_SHADOW = { shadowColor: '#3C2814', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } };
// 다크 모드 카드 윤곽. 바닥과 카드 밝기 차이가 작아 그림자 대신 1pt 선으로 나눈다
const CARD_LINE = { borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' };

/** 카드 면(흰 카드, 입력칸, 날짜 카드)의 층 구분. 라이트는 옅은 그림자, 다크는 1pt 윤곽선 */
export function useCardStyle() {
  return useColor().raised ? CARD_SHADOW : CARD_LINE;
}

/** 떠 있는 면(탭 바, 실행취소 바, 다이얼로그)의 그림자(--shadow-overlay). 다크는 짙은 그림자 + 1pt 밝은 테두리 */
export function useOverlayShadow() {
  return useColor().raised
    ? { shadowColor: '#3C2814', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }
    : {
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 12 },
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
      };
}
