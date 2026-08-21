/**
 * 초성 검색 유틸.
 *
 * 한글 음절은 `코드 = 0xAC00 + (초성×21 + 중성)×28 + 종성` 이므로
 * 같은 초성을 가진 음절이 588자씩 연속 블록을 이룬다. (ㄱ → 가~깋, ㅁ → 마~밓)
 * 따라서 검색어의 자모를 문자 범위로 바꾼 정규식을 만들면 초성 검색이 되고,
 * 같은 패턴을 JS RegExp와 MySQL REGEXP 양쪽에서 그대로 쓸 수 있다.
 *
 * 프론트엔드에도 같은 내용의 파일이 있다 (front/src/utils/hangul.ts).
 */

/** 초성이 될 수 있는 자모 19자 (ㄳ·ㄵ 등 종성 전용 겹자음은 제외) */
const CHOSUNG = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];

const HANGUL_BASE = 0xAC00;
const SYLLABLES_PER_CHOSUNG = 588;

const REGEX_META = /[.*+?^${}()|[\]\\]/g;

/** MySQL REGEXP에서 글자 사이 공백을 무시하기 위한 패턴 (백슬래시 의존을 피함) */
export const SQL_GAP = '[[:space:]]*';

/** 검색어에 초성 자모가 섞여 있는지 여부 */
export function hasJamo(query: string): boolean {
  return [...query].some(char => CHOSUNG.includes(char));
}

/**
 * 검색어를 정규식 패턴 문자열로 변환합니다.
 *
 * 자모는 해당 초성의 음절 범위로, 나머지 문자는 리터럴(메타문자 이스케이프)로 바꾸고
 * 글자 사이를 gap으로 이어 붙여 공백을 무시한 매칭이 되게 합니다.
 *
 * @param query 검색어
 * @param gap 글자 사이에 끼워 넣을 패턴 (JS는 `\s*`, MySQL은 `[[:space:]]*`)
 */
export function toSearchPattern(query: string, gap = '\\s*'): string {
  return [...query]
    .filter(char => !/\s/.test(char))
    .map(toToken)
    .join(gap);
}

function toToken(char: string): string {
  const index = CHOSUNG.indexOf(char);

  if (index < 0) {
    return char.replace(REGEX_META, '\\$&');
  }

  const start = HANGUL_BASE + index * SYLLABLES_PER_CHOSUNG;
  return `[${String.fromCharCode(start)}-${String.fromCharCode(start + SYLLABLES_PER_CHOSUNG - 1)}]`;
}

/**
 * 검색어에 따라 SQL의 `LIKE ?`를 `REGEXP ?`로 바꾸고 바인딩할 값을 함께 돌려줍니다.
 *
 * 초성 자모가 없는 일반 검색어는 기존 `LIKE '%q%'` 경로를 그대로 타므로
 * 동작과 비용이 지금과 동일합니다.
 *
 * @returns [사용할 SQL, 플레이스홀더에 바인딩할 값]
 */
export function withSearchPattern(sql: string, query: string | undefined): [string, string] {
  const target = query ?? '';

  if (!hasJamo(target)) {
    return [sql, `%${target}%`];
  }

  return [sql.replace(/LIKE \?/g, 'REGEXP ?'), toSearchPattern(target, SQL_GAP)];
}
