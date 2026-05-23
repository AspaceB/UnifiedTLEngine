// Standard normal helpers. Φ is implemented with the Abramowitz & Stegun
// 7.1.26 approximation of erf; max error < 1.5e-7 across the real line.

export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function phi(z: number): number {
  // Standard normal CDF.
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export function clampPercentile(p: number): number {
  if (p < 1) return 1;
  if (p > 99) return 99;
  return p;
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}
