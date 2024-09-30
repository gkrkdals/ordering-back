export function classToObject(origin: any) {
  const { ...object } = origin;
  return object;
}

export function countToTotalPage(count: number) {
  const c = count === 0 ? 1 : count;
  return Math.floor((c - 1)/ 20) + 1;
}

export function countSkip(page: number) {

  return (page - 1) * 20;
}
