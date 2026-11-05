import React from 'react';
import { Link } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { OscpPointsCalculator } from '../components/exam/OscpPointsCalculator';

/** /oscp-points-calculator/ : the H1 matches the prerendered entry in src/seo/routeMeta.json. */
export const OscpPointsCalculatorPage: React.FC = () => (
  <div className="w-full max-w-5xl space-y-6 pb-12" data-testid="oscp-points-calculator-page">
    <PageHeader
      title="OSCP points calculator"
      description="Tick the flags you have and see your total, the pass mark and what is still needed."
      icon={<Calculator aria-hidden="true" />}
    />
    <OscpPointsCalculator />
    <p className="text-sm text-secondary">
      Want to rehearse the full 23 hours 45 minutes? Open the{' '}
      <Link to="/exam" className="text-accent underline underline-offset-2 hover:text-primary">
        exam simulator
      </Link>{' '}
      or read the{' '}
      <a href="/oscp-exam-scoring-and-time-budget/" className="text-accent underline underline-offset-2 hover:text-primary">
        OSCP scoring and time budget guide
      </a>
      .
    </p>
  </div>
);

export default OscpPointsCalculatorPage;
