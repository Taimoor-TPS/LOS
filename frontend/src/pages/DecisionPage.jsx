import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, money, rateLabel } from '../api/client.js';
import { useLocale } from '../context/AppState.jsx';

export default function DecisionPage() {
  const { applicationId } = useParams();
  const { locale } = useLocale();
  const [application, setApplication] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/api/applications/${applicationId}`).then((data) => setApplication(data.application)).catch((err) => setError(err.message));
  }, [applicationId]);

  async function decide() {
    setBusy(true);
    setError('');
    try {
      const data = await api(`/api/applications/${applicationId}/decide`, { method: 'POST', body: {} });
      setApplication(data.application);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!application) return <p className="muted">Opening your file…</p>;
  const decision = application.decision;
  const tone = decision?.outcome === 'approve' ? 'good' : decision?.outcome === 'decline' ? 'bad' : 'warn';
  const title = {
    approve: 'You are approved',
    decline: 'Not this time',
    refer: 'A person will review this',
    committee: 'This goes to committee',
  }[decision?.outcome] || 'Your decision';

  return (
    <div>
      <div className="eyebrow">{application.reference}</div>
      {!decision && (
        <>
          <h2 className="display">Ready when you are</h2>
          <p className="muted">The scorecard, affordability cap and policy rules run together. You will see the reason either way.</p>
          <button className="primary" type="button" disabled={busy} onClick={decide}>{busy ? 'Deciding…' : 'Show me the decision'}</button>
        </>
      )}
      {decision && (
        <div className="card">
          <span className={`pill ${tone}`}>{decision.outcome}</span>
          <h2 className="display">{title}</h2>
          <div className="amount">{money(application.amount, application.currency)}</div>
          <p>{decision.pricing?.instalment ? `${money(decision.pricing.instalment, application.currency)} / month · ${rateLabel(decision.pricing.rate)}` : ''}</p>
          <div className="stack">
            {(decision.reasons || []).map((reason) => (
              <div key={reason.code} className="fact">{reason[locale] || reason.en}</div>
            ))}
          </div>
          <p className="muted">Valid for {decision.offerValidityDays || 7} days. Figures stay illustrative until a live bank publishes its own disclosure.</p>
          {decision.outcome === 'approve' && <Link className="primary" to={`/key-facts/${applicationId}`}>Read key facts</Link>}
        </div>
      )}
      {error && <p className="bad pill">{error}</p>}
    </div>
  );
}
