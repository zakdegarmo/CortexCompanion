export function getAstraElevation(x: number, z: number): number {
  const hill1 = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.2;
  const hill2 = Math.sin(x * 0.09 + 1.2) * Math.cos(z * 0.08) * 1.1;
  return hill1 + hill2;
}
