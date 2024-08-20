export function classToObject(origin: any) {
  const { ...object } = origin;
  return object;
}

export function countToTotalPage(count: number) {
  return Math.floor(count / 20) + 1;
}

export function countSkip(page: number) {
  return (page - 1) * 20;
}
