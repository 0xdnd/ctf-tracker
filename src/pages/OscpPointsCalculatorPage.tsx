import React from 'react';
import { Link } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { OscpPointsCalculator } from '../components/exam/OscpPointsCalculator';
import oscpCalculatorFaq from '../seo/oscpCalculatorFaq.json';

/** /oscp-points-calculator/ : the H1 and FAQ match the prerendered output in scripts/prerender.cjs. */
export const OscpPointsCalculatorPage: React.FC = () => (
  <div className="w-full max-w-5xl space-y-6 pb-12" data-testid="oscp-points-calculator-page">
    <PageHeader
      title="OSCP points calculator"
      description="Tick the flags you have and see your total, the pass mark and what is still needed."
      icon={<Calculator aria-hidden="true" />}
      actions={
        <Link
          to="/exam?track=OSCP"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle hover:border-strong text-xs font-semibold text-primary transition-colors"
        >
          Start timed OSCP mock exam →
        </Link>
      }
    />
    <OscpPointsCalculator />
    <section
      aria-labelledby="oscp-calc-faq-heading"
      className="rounded-xl border border-subtle bg-surface-card/70 p-4 sm:p-5 space-y-3"
    >
      <h2 id="oscp-calc-faq-heading" className="text-sm font-semibold text-primary">
        OSCP+ scoring quick answers (70/100 &amp; Dec 1, 2026 100–500 scaled)
      </h2>
      <p className="text-xs sm:text-sm text-secondary leading-relaxed">
        Exams starting before 1 December 2026 at 08:00 GMT require 70 of 100 raw points (40 for Active Directory in
        10/10/20 steps plus three 20-point standalones). Exams starting on or after 1 December 2026 use an equated 100
        to 500 scaled score with 400 required to pass.
      </p>
      <div className="space-y-2">
        {oscpCalculatorFaq.map((item, idx) => (
          <details
            key={item.q}
            open={idx === 0}
            className="rounded-lg border border-subtle bg-surface-base/60 px-3.5 py-2.5 text-xs sm:text-sm"
          >
            <summary className="cursor-pointer font-medium text-primary">{item.q}</summary>
            <p className="mt-2 text-secondary leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
    <p className="text-sm text-secondary">
      Want to rehearse the full 23 hours 45 minutes? Open the{' '}
      <Link to="/exam?track=OSCP" className="text-accent underline underline-offset-2 hover:text-primary">
        exam simulator
      </Link>
      , read the{' '}
      <a href="/oscp-exam-scoring-and-time-budget/" className="text-accent underline underline-offset-2 hover:text-primary">
        OSCP scoring and time budget guide
      </a>
      , or compare{' '}
      <a href="/oscp-vs-cpts/" className="text-accent underline underline-offset-2 hover:text-primary">
        OSCP vs CPTS
      </a>
      . Practice on the{' '}
      <a href="/tj-null-list/" className="text-accent underline underline-offset-2 hover:text-primary">
        TJ Null OSCP list
      </a>{' '}
      and{' '}
      <a href="/oscp-like-machines/" className="text-accent underline underline-offset-2 hover:text-primary">
        OSCP-like machines
      </a>
      , or{' '}
      <a href="/tracker/?track=tjnull-oscp" className="text-accent underline underline-offset-2 hover:text-primary">
        track your practice machines in ZeroBox
      </a>
      .
    </p>
  </div>
);

