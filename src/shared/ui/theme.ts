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
  danger: '#C2410C',
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
  danger: '#C8401A',
  raised: false,
};

/** 기기의 라이트·다크 설정에 맞는 색 */
export function useColor() {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}
