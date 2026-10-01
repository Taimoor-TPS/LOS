import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

export default function SystemDeskPage() {
  const [state, setState] = useState(null);
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [impact, setImpact] = useState(null);
  function load() {
    api('/api/eod').then(setState).catch((err) => setError(err.message));
  }
  useEffect(load, []);
  async function run() {
    setError('');
    const body = await api('/api/eod/run', { method: 'POST', body: {} });
    setMessage(`Business date ${body.businessDate || body.entity?.businessDate || 'rolled'}.`);
    load();
  }
  async function runTo(event) {
    event.preventDefault();
    setError('');
    const body = await api('/api/eod/run-to', { method: 'POST', body: { target } });
    setMessage(`Ran to ${body.businessDate || target}.`);
    load();
  }
  async function showImpact() {
    setImpact(await api('/api/config/fields/gross_monthly_income/impact'));
  }
  return (
    <div>
      <PageTitle kicker={state?.businessDate || 'Business date'} title="System" />
      {error && <p className="bad">{error}</p>}
      {message && <p>{message}</p>}
      <section className="panel">
        <h2>End of day</h2>
        <button className="primary" type="button" onClick={() => run().catch((err) => setError(err.message))}>Run EOD</button>
        <form onSubmit={(event) => runTo(event).catch((err) => setError(err.message))}>
          <label className="field">Run to date<input type="date" value={target} onChange={(event) => setTarget(event.target.value)} /></label>
          <button className="ghost" type="submit">Run EOD to date</button>
        </form>
        <ol>{(state?.runs || []).slice(0, 5).map((run) => <li key={run._id}>{run.date} · {run.status}</li>)}</ol>
      </section>
      <section className="panel">
        <h2>Field impact</h2>
        <button className="ghost" type="button" onClick={() => showImpact().catch((err) => setError(err.message))}>Check gross monthly income</button>
        {impact && <pre>{JSON.stringify(impact, null, 2)}</pre>}
      </section>
    </div>
  );
}
