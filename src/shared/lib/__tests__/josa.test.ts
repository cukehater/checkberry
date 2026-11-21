import { gwaWa, iGa } from '../josa';

describe('josa', () => {
  it('받침이 있으면 이·과, 없으면 가·와', () => {
    expect(iGa('불꽃')).toBe('불꽃이');
    expect(iGa('물방울')).toBe('물방울이');
    expect(iGa('얼음')).toBe('얼음이');
    expect(iGa('불씨')).toBe('불씨가');
    expect(gwaWa('스트레칭')).toBe('스트레칭과');
    expect(gwaWa('독서')).toBe('독서와');
  });

  it('끝 따옴표는 건너뛰고, 한글이 아니면 받침 없음으로 본다', () => {
    expect(iGa('‘장보기’')).toBe('‘장보기’가');
    expect(iGa('‘제주 여행’')).toBe('‘제주 여행’이');
    expect(iGa('‘Run’')).toBe('‘Run’가');
  });
});
