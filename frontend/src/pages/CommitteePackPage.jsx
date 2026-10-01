import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, money } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function CommitteePackPage() {
  const { applicationId } = useParams();
  const [pack, setPack] = useState(null);
  const [comment, setComment] = useState('Cash-flow cover is close. I vote to approve with the guarantee scheme.');
  const [error, setError] = useState('');

  function load() { api(`/api/applications/${applicationId}`).then(setPack); }
  useEffect(load, [applicationId]);

  async function vote(choice) {
    try {
      await api(`/api/applications/${applicationId}/votes`, { method: 'POST', body: { vote: choice, comment } });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!pack) return <p>Preparing the pack…</p>;
  const app = pack.application;
  return (
    <div>
      <PageTitle kicker="Committee pack" title={pack.customer?.fullName} />
      <section className="panel">
        <p>{money(app.amount, app.currency)} · {app.productCode} · scheme {app.schemeCode || 'none'} · status {app.status}</p>
        <p>Score {app.decision?.score?.score}. {app.decision?.reasons?.map((reason) => reason.en).join(' ')}</p>
        <h2>Votes</h2>
        {(app.votes || []).map((voteItem, index) => <p key={index}><b>{voteItem.by}</b> {voteItem.vote} — {voteItem.comment}</p>)}
        {app.status === 'committee' && (
          <>
            <label className="field">Your minute<textarea value={comment} onChange={(event) => setComment(event.target.value)} /></label>
            <div className="actions">
              <button className="primary" type="button" onClick={() => vote('approve')}>Approve</button>
              <button className="ghost" type="button" onClick={() => vote('decline')}>Decline</button>
            </div>
          </>
        )}
        {error && <p className="bad pill">{error}</p>}
      </section>
    </div>
  );
}
