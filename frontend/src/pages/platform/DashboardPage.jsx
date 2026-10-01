import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

function tone(bucket) {
  if (bucket === 'Current') return 'ok';
  if (bucket === 'X' || bucket === '30+') return 'warn';
  return 'bad';
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [deviations, setDeviations] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function load() {
    api('/api/platform/overview').then(setData).catch((err) => setError(err.message));
    api('/api/platform/deviations').then((body) => setDeviations(body.deviations || [])).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function approve() {
    setMessage('');
    setError('');
    try {
      const body = await api('/api/platform/decisions/approve', { method: 'POST', body: { applicationNo: 'PKPFS261001000123' } });
      setMessage(`${body.applicationNo} ${body.outcome}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function clearDeviation(id) {
    setError('');
    try {
      await api(`/api/platform/deviations/${id}/approve`, { method: 'POST', body: { justification: 'Assessed income is supported by the salary slip.' } });
      setMessage('Deviation approved. Approval can now proceed.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!data) return <p>{error || 'Loading the book…'}</p>;
  const { kpis } = data;

  return (
    <div>
      <PageTitle kicker="Origination and portfolio" title="Dashboard">
        <Link className="ghost" to="/office/queue">Open work queue</Link>
      </PageTitle>
      <div className="kpis">
        <article className="kpi"><span>Outstanding</span><b>{money(kpis.outstanding)}</b></article>
        <article className="kpi"><span>NPL ratio</span><b>{kpis.nplRatio}%</b></article>
        <article className="kpi"><span>Provision coverage</span><b>{kpis.coverage}%</b></article>
        <article className="kpi"><span>Trial balance</span><b>{kpis.trialBalance}</b></article>
      </div>
      <div className="split">
        <section className="panel">
          <h2>Applications by stage</h2>
          {data.stages.map((stage) => (
            <div key={stage.stage} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 32px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span>{stage.stage}</span>
              <div className="bar"><span style={{ width: `${stage.count * 16}%` }} /></div>
              <b>{stage.count}</b>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>DPD distribution</h2>
          <table>
            <thead><tr><th>Bucket</th><th>Accounts</th><th>Outstanding</th></tr></thead>
            <tbody>
              {data.buckets.map((row) => (
                <tr key={row.bucket}>
                  <td><span className={`chip ${tone(row.bucket)}`}>{row.bucket}</span></td>
                  <td>{row.count}</td>
                  <td>{money(row.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <section className="panel">
        <h2>Open policy deviation</h2>
        <p className="muted">An approver cannot approve while a policy rule has failed and the deviation is still open.</p>
        {deviations.map((item) => (
          <article key={item.id} className="banner" style={{ marginBottom: 8 }}>
            <b>{item.applicationNo}</b> · {item.ruleCode} · actual {item.actual} vs policy {item.policy} · {item.level}
            <div>Status <span className={`chip ${item.status === 'OPEN' ? 'warn' : 'ok'}`}>{item.status}</span></div>
            {item.status === 'OPEN' && <button className="primary" type="button" onClick={() => clearDeviation(item.id)}>Approve deviation</button>}
          </article>
        ))}
        <button className="primary" type="button" onClick={approve}>Approve PKPFS261001000123</button>
        {message && <p className="chip ok">{message}</p>}
        {error && <p className="chip bad">{error}</p>}
      </section>
      <section className="panel">
        <h2>Escalations</h2>
        <table>
          <thead><tr><th>Module</th><th>Trigger</th><th>Level</th><th>Owner</th><th>Status</th></tr></thead>
          <tbody>
            {data.escalations.map((item) => (
              <tr key={item.id}>
                <td>{item.module}</td><td>{item.trigger}</td><td>{item.level}</td><td>{item.owner}</td>
                <td><span className={`chip ${item.status === 'OPEN' ? 'bad' : 'warn'}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
