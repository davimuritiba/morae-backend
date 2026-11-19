export function validCpf(seed: number): string {
  const base = String(100_000_000 + seed)
    .slice(-9)
    .split('')
    .map(Number);
  const digit = (digits: number[]) => {
    const sum = digits.reduce(
      (acc, d, i) => acc + d * (digits.length + 1 - i),
      0,
    );
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const first = digit(base);
  const second = digit([...base, first]);
  return [...base, first, second].join('');
}
