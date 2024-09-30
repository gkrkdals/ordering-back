export function classToObject(origin: any) {
  const { ...object } = origin;
  return object;
}

export function countToTotalPage(count: number) {
  if (count === 0) {
    count += 1;
  }
  return Math.floor((count - 1)/ 20) + 1;
}

export function countSkip(page: number) {
  return (page - 1) * 20;
}
