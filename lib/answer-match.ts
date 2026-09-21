function normalize(s: string): string {
  return s
    .normalize('NFKC') // tanda baca fullwidth (。，) jadi ASCII
    .toLowerCase()
    .replace(/[\s\p{P}]/gu, '')
}

export function isExactMatch(userAnswer: string, expectedAnswer: string): boolean {
  const user = normalize(userAnswer)
  if (!user) return false

  return expectedAnswer
    .split('/')
    .map(normalize)
    .filter(Boolean)
    .includes(user)
}