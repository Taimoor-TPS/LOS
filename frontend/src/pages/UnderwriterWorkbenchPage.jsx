import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, money, rateLabel } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';
import { useAuth } from '../context/AppState.jsx';

export default function UnderwriterWorkbenchPage() {
  const { applicationId } = useParams();
  const { user } = useAuth();
  const [pack, setPack] = useState(null);
  const [note, setNote] = useState('Income continuity is short, but the DBR still fits. I am approving inside my limit.');
  const [error, setError] = useState('');

  function load() {
    api(`/api/applications/${applicationId}`).then(setPack).catch((err) => setError(err.message));
  }
  useEffect(load, [applicationId]);

  async function act(path, body) {
    setError('');
    try {
      await api(path, { method: 'POST', body });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!pack) return <p>{error || 'Opening the case…'}</p>;
  const app = pack.application;
  const decision = app.decision || {};
  const canCredit = ['underwriter', 'credit_officer', 'system_admin'].includes(user.role);
  return (
    <div>
      <PageTitle kicker={app.reference} title={pack.customer?.fullName || 'Case'} />
      <div className="split">
        <section className="panel">
          <h2>{app.productCode} · {money(app.amount, app.currency)} · {app.tenorMonths} months</h2>
          <p>{pack.customer?.city} · {pack.customer?.employer} · bureau {pack.customer?.bureauScore}</p>
          <p>Status <b>{app.status}</b> · channel {app.channel}</p>
          <h2>Why the engine said this</h2>
          {(decision.reasons || []).map((reason) => <p key={reason.code}>{reason.en}</p>)}
          <h2>Affordability</h2>
          <p className="mono">{JSON.stringify(decision.affordability || {}, null, 0)}</p>
          {canCredit && ['referred', 'pending_second_approval'].includes(app.status) && (
            <>
              <label className="field">Justification<textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} /></label>
              <div className="actions">
                <button className="primary" type="button" onClick={() => act(`/api/applications/${applicationId}/override`, { outcome: 'approve', justification: note })}>Approve</button>
                <button className="ghost" type="button" onClick={() => act(`/api/applications/${applicationId}/override`, { outcome: 'decline', justification: note })}>Decline</button>
                {app.status === 'pending_second_approval' && <button className="primary" type="button" onClick={() => act(`/api/applications/${applicationId}/second-approval`, {})}>Second approval</button>}
              </div>
            </>
          )}
          {error && <p className="bad pill">{error}</p>}
        </section>
        <section className="panel">
          <h2>Score waterfall · {decision.score?.score}</h2>
          <p className="muted">Cut-offs {decision.score?.referCutoff} refer / {decision.score?.approveCutoff} approve · PD {decision.score?.pd} · ECL {money(decision.ifrs9?.ecl || 0)}</p>
          {(decision.score?.factors || []).map((factor) => (
            <div key={factor.key} style={{ marginBottom: 8 }}>
              <div className="row"><span>{factor.label}</span><b>{factor.contribution}</b></div>
              <div className="bar"><span style={{ width: `${factor.points}%` }} /></div>
            </div>
          ))}
          <h2>Price</h2>
          <p>{rateLabel(decision.pricing?.rate)} · grade {decision.pricing?.grade} · instalment {money(decision.pricing?.instalment || 0)}</p>
          <h2>Notes</h2>
          {(app.notes || []).map((item, index) => <p key={index}><b>{item.by}:</b> {item.text}</p>)}
        </section>
      </div>
    </div>
  );
}
