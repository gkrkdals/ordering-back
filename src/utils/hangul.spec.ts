import { hasJamo, SQL_GAP, toSearchPattern, withSearchPattern } from "@src/utils/hangul";

/** MySQL REGEXP 대신 JS 정규식으로 같은 패턴을 검증한다 (문자 범위 규칙이 동일) */
function matches(text: string, query: string): boolean {
  return new RegExp(toSearchPattern(query)).test(text);
}

describe('초성 검색 패턴', () => {
  it('초성만 입력해도 해당 음절을 찾는다', () => {
    expect(matches('제육덮밥', 'ㅈㅇㄷㅂ')).toBe(true);
    expect(matches('김치찌개', 'ㄱㅊ')).toBe(true);
    expect(matches('돈까스', 'ㄷㄲ')).toBe(true);
  });

  it('초성이 다르면 찾지 않는다', () => {
    expect(matches('제육덮밥', 'ㅈㅂㄷ')).toBe(false);
    expect(matches('돈까스', 'ㄷㄱ')).toBe(false);
  });

  it('띄어쓰기가 있어도 찾는다', () => {
    expect(matches('제육 덮밥', 'ㅈㅇㄷㅂ')).toBe(true);
    expect(matches('치즈 돈까스', 'ㅊㅈㄷㄲ')).toBe(true);
    expect(matches('김 민 수', 'ㄱㅁㅅ')).toBe(true);
  });

  it('초성과 완성형을 섞어 입력해도 찾는다', () => {
    expect(matches('제육 덮밥', '제육ㄷㅂ')).toBe(true);
    expect(matches('치즈 돈까스', '치ㅈㄷ')).toBe(true);
  });

  it('자모가 없으면 기존 부분일치와 동일하게 동작한다', () => {
    expect(matches('치즈 돈까스', '돈까스')).toBe(true);
    expect(matches('치즈 돈까스', '치킨')).toBe(false);
  });

  it('정규식 메타문자가 들어와도 리터럴로 매칭한다', () => {
    expect(matches('세트(2인)', '(2인)')).toBe(true);
    expect(matches('세트[2인]', '트[2')).toBe(true);
    expect(matches('세트2인', '트.인')).toBe(false);
  });
});

describe('hasJamo', () => {
  it('초성 자모가 섞여 있을 때만 참이다', () => {
    expect(hasJamo('ㅈㅇ')).toBe(true);
    expect(hasJamo('제육ㄷ')).toBe(true);
    expect(hasJamo('제육덮밥')).toBe(false);
    expect(hasJamo('')).toBe(false);
    expect(hasJamo('chicken')).toBe(false);
  });
});

describe('withSearchPattern', () => {
  const sql = 'SELECT * FROM menu WHERE name LIKE ? OR memo LIKE ?';

  it('자모가 없으면 SQL을 그대로 두고 %like% 값을 준다', () => {
    expect(withSearchPattern(sql, '돈까스')).toEqual([sql, '%돈까스%']);
    expect(withSearchPattern(sql, undefined)).toEqual([sql, '%%']);
  });

  it('자모가 있으면 LIKE를 REGEXP로 바꾸고 정규식 패턴을 준다', () => {
    const [converted, pattern] = withSearchPattern(sql, 'ㄷㄲ');

    expect(converted).toBe('SELECT * FROM menu WHERE name REGEXP ? OR memo REGEXP ?');
    expect(pattern).toBe(`[다-딯]${SQL_GAP}[까-낗]`);
  });
});
