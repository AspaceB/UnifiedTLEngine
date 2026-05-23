import {
  ArrowDown,
  FileSearch,
  Gauge,
  GitMerge,
  Layers,
  Sigma,
  type LucideIcon,
} from "lucide-react";

type Step = {
  n: string;
  icon: LucideIcon;
  title: string;
  body: string;
  tint: string;
};

const STEPS: Step[] = [
  {
    n: "01",
    icon: FileSearch,
    title: "Extract",
    body: "Each report (OPQ32, Verify G+, AMCAT) is parsed by a strategy that knows its layout. We pull the raw scores and capture date — and refuse files that aren't machine-readable, rather than fabricating numbers.",
    tint: "from-indigo-500/15 to-indigo-500/0",
  },
  {
    n: "02",
    icon: GitMerge,
    title: "Normalise",
    body: "Different tests speak different languages. OPQ uses STEN (1–10, bell-curved); Verify G+ and AMCAT use percentiles. We convert every score onto the same percentile scale so they can be compared and combined fairly.",
    tint: "from-purple-500/15 to-purple-500/0",
  },
  {
    n: "03",
    icon: Layers,
    title: "Infer composites",
    body: "Six composite dimensions are computed — each a weighted blend of constructs across all three sources, tied to a real on-the-job outcome. If inputs are missing, the weights renormalise and the confidence band widens, never fabricating signal.",
    tint: "from-emerald-500/15 to-emerald-500/0",
  },
  {
    n: "04",
    icon: Gauge,
    title: "Score confidence",
    body: "Every output ships with a confidence number built from four signals: how much of the expected data is present, how reliable the source tests are, how recent the reports are, and how much the overlapping scores agree with each other.",
    tint: "from-amber-500/15 to-amber-500/0",
  },
];

const COMPOSITES: { name: string; predicts: string }[] = [
  { name: "Architectural foresight", predicts: "Supervisor-rated design quality" },
  { name: "Execution resilience", predicts: "On-time delivery & defect rate" },
  { name: "Stakeholder influence", predicts: "360° peer influence rating" },
  { name: "Analytical problem solving", predicts: "Live coding & case-study performance" },
  { name: "Adaptive learning", predicts: "Time-to-productivity on a new stack" },
  { name: "Delivery ownership", predicts: "Manager-rated accountability" },
];

type Formula = {
  title: string;
  plain: string;
  math: string;
  notes?: string;
};

const FORMULAS: Formula[] = [
  {
    title: "Common scale",
    plain:
      "OPQ32's 1–10 STEN scores are converted to percentiles via the standard normal curve, so they can be combined fairly with the percentile scores from Verify G+ and AMCAT.",
    math: "z          = (sten − 5.5) / 2\npercentile = Φ(z) × 100",
    notes: "Φ is the standard normal CDF (Abramowitz & Stegun 7.1.26, error < 1.5e-7).",
  },
  {
    title: "Composite score",
    plain:
      "Each composite is a weighted average of its contributing constructs on the percentile scale. If a contributor is missing, its weight is dropped and the remaining weights are rescaled to sum to 1 — the score stays unbiased, the uncertainty (below) grows.",
    math: "score  = Σ ( wᵢ' × percentileᵢ )      over present constructs\nwᵢ'    = wᵢ / Σ wᵢ (present)         ← renormalisation",
  },
  {
    title: "90% confidence band",
    plain:
      "Each score ships with a half-width band drawn on the radar. Two things widen it: lower-reliability source tests, and missing inputs. Identical scores can carry very different bands — that's the signal.",
    math: "σ_instrument = 28.87 × √(1 − ᾱ)\ninflation    = 1 + 1.5 × missingShare\nband (90%)   = 1.645 × σ_instrument × inflation",
    notes:
      "28.87 ≈ sd of a uniform 1..99 percentile distribution. 1.645 = z for a 90% interval. ᾱ is the weight-averaged Cronbach's α of contributing sources (OPQ 0.83, VerifyG 0.88, AMCAT 0.79).",
  },
  {
    title: "Confidence (0–100)",
    plain:
      "The headline confidence number is a weighted blend of four signals: how many sources are present, how reliable they are, how recent they are, and how much overlapping constructs agree with each other across sources.",
    math: "confidence = 100 × ( 0.35·coverage\n                     + 0.25·reliability\n                     + 0.20·recency\n                     + 0.20·agreement )\n\nrecency  = mean( exp(−ageMonths / 24) )    ~16.6-mo half-life\nagreement = mean( 1 − normalisedStdDev )   across overlapping constructs",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-8 border-t border-ink-200/60"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.10),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-[1100px] px-6 py-16 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">
          How it works
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900 lg:text-3xl">
          From three PDFs to one trustworthy profile, in four steps.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">
          The engine is deliberately not a black box. Every number on the dashboard is the result
          of these four steps — and the math is open in the repo.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {STEPS.map((step) => (
            <StepCard key={step.n} step={step} />
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-ink-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink-900">
                The six composites it computes
              </h3>
              <p className="mt-1 text-xs text-ink-600">
                Each composite was fitted against a real performance criterion — the column on the
                right is what the score is predicting, not a slogan.
              </p>
            </div>
            <span className="rounded-full bg-accent-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-accent-700">
              6 dimensions
            </span>
          </div>
          <ul className="mt-5 divide-y divide-ink-200/70 text-sm">
            {COMPOSITES.map((c) => (
              <li
                key={c.name}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-ink-900">{c.name}</span>
                <span className="text-xs text-ink-600">{c.predicts}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12">
          <div className="flex items-center gap-2">
            <Sigma size={14} className="text-purple-600" aria-hidden />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-600">
              Under the hood
            </h3>
          </div>
          <h4 className="mt-1 text-xl font-semibold tracking-tight text-ink-900 lg:text-2xl">
            The exact formulas, no hand-waving.
          </h4>
          <p className="mt-2 max-w-2xl text-sm text-ink-600">
            Every number on the radar is the output of one of these four formulas. Plain English
            on the left, the math the engine actually runs on the right.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {FORMULAS.map((f) => (
              <FormulaCard key={f.title} formula={f} />
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3">
          <a
            href="#try-it"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:from-accent-700 hover:to-indigo-700"
          >
            Try it now
            <ArrowDown
              size={14}
              className="transition group-hover:translate-y-0.5"
            />
          </a>
          <p className="text-[11px] text-ink-600">
            Drop a real OPQ32, Verify G+, or AMCAT PDF — the radar updates live.
          </p>
        </div>
      </div>
    </section>
  );
}

function FormulaCard({ formula }: { formula: Formula }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-purple-200/70 bg-gradient-to-b from-purple-50/40 to-white shadow-sm backdrop-blur">
      <div className="border-b border-purple-200/70 px-5 py-3">
        <h5 className="text-sm font-semibold text-ink-900">{formula.title}</h5>
        <p className="mt-1 text-xs leading-relaxed text-ink-600">{formula.plain}</p>
      </div>
      <pre className="overflow-x-auto bg-ink-900 px-5 py-4 font-mono text-[12px] leading-relaxed text-emerald-200">
        <code>{formula.math}</code>
      </pre>
      {formula.notes ? (
        <p className="border-t border-purple-200/70 px-5 py-3 text-[11px] leading-relaxed text-ink-600">
          {formula.notes}
        </p>
      ) : null}
    </div>
  );
}

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-200 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${step.tint}`}
      />
      <div className="relative flex items-start gap-4">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 font-mono text-xs font-semibold text-white">
          {step.n}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-ink-600" aria-hidden />
            <h3 className="text-sm font-semibold text-ink-900">{step.title}</h3>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
            {step.body}
          </p>
        </div>
      </div>
    </div>
  );
}
