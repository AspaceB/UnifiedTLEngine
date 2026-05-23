import type {
  NormalizedConstruct,
  RawReport,
  SourceSystem,
} from "@/types/domain";
import { clampPercentile, phi } from "./stats";

// Published instrument reliabilities (Cronbach's alpha). These are the
// constants used by the confidence model in §6.5.
export const RELIABILITY_BY_SOURCE: Readonly<Record<SourceSystem, number>> = {
  OPQ32: 0.83,
  VerifyG: 0.88,
  AMCAT: 0.79,
};

/**
 * §6.2 Psychometric normalization.
 *   z          = (sten - 5.5) / 2.0
 *   percentile = Φ(z) * 100
 * Percentile inputs are already on the common metric — we still publish a
 * back-computed z via Φ⁻¹ for transparency / drift checks.
 */
export function normalizeReport(report: RawReport): NormalizedConstruct[] {
  const alpha = RELIABILITY_BY_SOURCE[report.source];
  const out: NormalizedConstruct[] = [];

  for (const [construct, value] of Object.entries(report.raw)) {
    if (report.scale === "STEN") {
      const z = (value - 5.5) / 2.0;
      const percentile = clampPercentile(phi(z) * 100);
      out.push({
        construct,
        percentile,
        z,
        source: report.source,
        reliabilityAlpha: alpha,
        capturedAt: report.capturedAt,
      });
    } else {
      const percentile = clampPercentile(value);
      const z = inversePhi(percentile / 100);
      out.push({
        construct,
        percentile,
        z,
        source: report.source,
        reliabilityAlpha: alpha,
        capturedAt: report.capturedAt,
      });
    }
  }

  return out;
}

// Acklam-style rational approximation of Φ⁻¹. Used only for transparency.
function inversePhi(p: number): number {
  const q = Math.min(Math.max(p, 1e-6), 1 - 1e-6);
  const a = [-3.969683028665376e+1, 2.209460984245205e+2, -2.759285104469687e+2,
             1.383577518672690e+2, -3.066479806614716e+1, 2.506628277459239e+0];
  const b = [-5.447609879822406e+1, 1.615858368580409e+2, -1.556989798598866e+2,
             6.680131188771972e+1, -1.328068155288572e+1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e+0,
             -2.549732539343734e+0, 4.374664141464968e+0, 2.938163982698783e+0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e+0,
             3.754408661907416e+0];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let x: number;
  if (q < plow) {
    const r = Math.sqrt(-2 * Math.log(q));
    x = (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) /
        ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1);
  } else if (q <= phigh) {
    const r = q - 0.5;
    const rr = r * r;
    x = (((((a[0] * rr + a[1]) * rr + a[2]) * rr + a[3]) * rr + a[4]) * rr + a[5]) * r /
        (((((b[0] * rr + b[1]) * rr + b[2]) * rr + b[3]) * rr + b[4]) * rr + 1);
  } else {
    const r = Math.sqrt(-2 * Math.log(1 - q));
    x = -(((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) /
         ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1);
  }
  return x;
}
