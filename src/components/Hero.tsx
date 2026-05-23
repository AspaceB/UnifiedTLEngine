import {
  ArrowDown,
  Compass,
  Gauge,
  Layers,
  Sparkles,
  ShieldCheck,
  Telescope,
  type LucideIcon,
} from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.22),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.16),transparent_55%)]"
      />

      <div className="relative mx-auto max-w-[1100px] px-6 pt-16 pb-12 lg:pt-24 lg:pb-20">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-ink-600 backdrop-blur">
          <ShieldCheck size={12} className="text-accent-600" />
          Decision support · advisory only
        </p>

        <h1 className="text-4xl font-semibold tracking-tight text-ink-900 lg:text-5xl">
          Hire on the whole picture,
          <br />
          <span className="text-accent-600">not the loudest data point.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">
          Today, a candidate&rsquo;s personality test, cognitive test, and skills test arrive as
          three separate PDFs from three separate systems. Managers compare them by eye &mdash; or
          give up and go with gut feel. UTIE pulls the three together into one clear picture, so
          the decision rests on the candidate, not the paperwork.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#try-it"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:from-accent-700 hover:to-indigo-700"
          >
            <Sparkles size={14} aria-hidden />
            Try it now
            <ArrowDown
              size={14}
              className="transition group-hover:translate-y-0.5"
            />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-purple-300/70 bg-purple-50/60 px-5 py-2.5 text-sm font-medium text-purple-800 backdrop-blur transition hover:border-purple-400 hover:bg-purple-100/70"
          >
            How it works
            <ArrowDown size={14} aria-hidden />
          </a>
        </div>

        <div className="mt-16">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600">
            The problem today
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <ProblemCard
              icon={Layers}
              title="Fragmented reports"
              body="Behaviour, cognition, and skills live in three different systems. Nothing joins them. Comparing across is manual, slow, and easy to skip."
            />
            <ProblemCard
              icon={Compass}
              title="Gut-feel takes over"
              body="When the data is hard to read, managers fall back on intuition. The science gets ignored and bias creeps in."
            />
            <ProblemCard
              icon={Gauge}
              title="Numbers without certainty"
              body="A score looks identical whether it came from one stale report or three fresh ones. How much to trust it is invisible."
            />
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-600">
            What UTIE does
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <OutcomeCard
              icon={Telescope}
              title="One profile, six dimensions"
              body="Architectural foresight, execution resilience, stakeholder influence and three more — each tied to a real on-the-job outcome."
            />
            <OutcomeCard
              icon={Gauge}
              title="Confidence on every score"
              body="How much data backs each number is drawn straight on the chart, so you know what is solid and what is a guess."
            />
            <OutcomeCard
              icon={ShieldCheck}
              title="Advisory, never automatic"
              body="Every output is decision support, never the decision. A human stays in the loop, with full provenance behind every score."
            />
          </div>
        </div>

        <div className="mt-14 flex items-center justify-center">
          <a
            href="#try-it"
            className="group inline-flex flex-col items-center gap-1 text-xs font-medium uppercase tracking-wider text-ink-600 transition hover:text-ink-900"
          >
            Try it with a real report
            <ArrowDown
              size={14}
              className="animate-bounce group-hover:animate-none"
            />
          </a>
        </div>
      </div>
    </section>
  );
}

function ProblemCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100 text-ink-800">
        <Icon size={16} aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-600">{body}</p>
    </div>
  );
}

function OutcomeCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-accent-500/30 bg-gradient-to-b from-accent-50/70 to-white p-5 shadow-sm backdrop-blur">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent-600 text-white">
        <Icon size={16} aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-600">{body}</p>
    </div>
  );
}
