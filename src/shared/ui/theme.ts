import { useColorScheme } from 'react-native';

// global.css 토큰과 같은 값. className을 못 쓰는 곳(아이콘 tint, SVG, 내비게이션 옵션, animated style)에서 쓴다
const LIGHT = {
  bg: '#FDF8EC',
  card: '#FFFFFF',
  // 습관 타일, 눌린 행 바탕
  cardSoft: '#F8F3EA',
  bar: '#FFFFFF',
  text: '#1F1A17',
  sub: '#6F675F',
  line: '#EFE8DC',
  border: '#E8E0D2',
  // 체크 상자 빈 바탕, 보조 버튼
  neutral: '#EEE7DA',
  // 꺼진 스위치, 빈 칸 테두리
  track: '#D9CFBF',
  accent: '#E11D48',
  onAccent: '#FFFFFF',
  accentSoft: '#FFE4E9',
  accentInk: '#B4123A',
  success: '#5EA61C',
  successSoft: '#EDF6E1',
  successInk: '#3D7311',
  warning: '#F5A524',
  warningInk: '#8A5E1F',
  danger: '#C2410C',
  dangerInk: '#B23A0B',
  // 카드 그림자를 켤지(다크는 면 밝기로 층을 나눈다)
  raised: true,
};

const DARK: typeof LIGHT = {
  bg: '#120E0D',
  card: '#1D1917',
  cardSoft: '#27221F',
  bar: '#1D1917',
  text: '#FBF6EE',
  sub: '#A8A099',
  line: '#2F2925',
  border: '#332C28',
  neutral: '#2E2825',
  track: '#544A43',
  accent: '#E11D48',
  onAccent: '#FFFFFF',
  accentSoft: '#3B1520',
  accentInk: '#FF8FA6',
  success: '#6DBE2A',
  successSoft: '#1F2C14',
  successInk: '#A6DB74',
  warning: '#F7B750',
  warningInk: '#FAD094',
  danger: '#C8401A',
  dangerInk: '#F59A70',
  raised: false,
};

/** 기기의 라이트·다크 설정에 맞는 색 */
export function useColor() {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}

/** 떠 있는 면(탭 바, 실행취소 바, 다이얼로그)의 그림자(--shadow-overlay). 다크는 짙은 그림자 + 옅은 1pt 테두리 */
export function useOverlayShadow() {
  return useColor().raised
    ? { shadowColor: '#3C2814', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }
    : {
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 12 },
        borderWidth: 1,
        borderColor: 'rgba(255,240,230,0.08)',
      };
}
