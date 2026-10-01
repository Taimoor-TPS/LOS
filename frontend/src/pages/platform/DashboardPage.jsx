import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/api/dashboard').then(setData).catch((err) => setError(err.message));
  }, []);
  if (error) return <p className="bad">{error}</p>;
  if (!data) return <p>Loading the dashboard…</p>;
  return (
    <div>
      <PageTitle kicker={data.businessDate} title="Dashboard" />
      <section className="kpis">
        <article className="kpi"><span>Outstanding</span><b>{money(data.kpis.outstanding)}</b></article>
        <article className="kpi"><span>NPL ratio</span><b>{(data.kpis.nplRatio * 100).toFixed(1)}%</b></article>
        <article className="kpi"><span>Delinquent</span><b>{data.kpis.delinquent}</b></article>
        <article className="kpi"><span>Approval rate</span><b>{(data.kpis.approvalRate * 100).toFixed(0)}%</b></article>
      </section>
      <section className="panel">
        <h2>Pipeline</h2>
        <table>
          <tbody>
            {(data.stages || []).map((row) => <tr key={row.stage}><td>{row.stage}</td><td>{row.count}</td></tr>)}
            {!(data.stages || []).length && <tr><td>No applications yet</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function QueuePage() {
  const [items, setItems] = useState([]);
  const [stage, setStage] = useState('');
  function load() {
    api(`/api/queue${stage ? `?stage=${stage}` : ''}`).then((data) => setItems(data.items || [])).catch(() => setItems([]));
  }
  useEffect(load, [stage]);
  return (
    <div>
      <PageTitle kicker="Origination" title="Work queue" />
      <label className="field">Stage
        <select value={stage} onChange={(event) => setStage(event.target.value)}>
          <option value="">All</option>
          {['S2', 'S3', 'S6', 'S7'].map((code) => <option key={code}>{code}</option>)}
        </select>
      </label>
      <table>
        <thead><tr><th>Reference</th><th>Stage</th><th>Product</th><th></th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id}>
              <td>{item.reference}</td><td>{item.stage}</td><td>{item.productCode}</td>
              <td><Link to={`/office/workbench/${item._id}`}>Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
