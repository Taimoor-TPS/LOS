import { useEffect, useState } from 'react';
import { api, money } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function CommandCenterPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/api/reporting/command-center').then(setData).catch((err) => setError(err.message)); }, []);
  if (error) return <p>{error}</p>;
  if (!data) return <p>Loading the book…</p>;
  const cards = [
    ['Applications', data.applications],
    ['Approval rate', `${Math.round(data.approvalRate * 100)}%`],
    ['STP of approved', `${Math.round(data.stpRate * 100)}%`],
    ['Open warnings', data.openWarnings],
    ['Pipeline', money(data.pipeline)],
    ['Offers viewed', `${data.offers.viewed}/${data.offers.issued}`],
    ['Booked loans', data.loans],
    ['Avg decision TAT', `${data.avgTatHours}h`],
  ];
  return (
    <div>
      <PageTitle kicker="Lending platform" title="Command center" />
      <div className="kpis">
        {cards.map(([label, value]) => <article className="kpi" key={label}><span className="muted">{label}</span><b>{value}</b></article>)}
      </div>
      <section className="panel">
        <h2>Book by status</h2>
        {Object.entries(data.byStatus).map(([status, count]) => (
          <div key={status} className="row" style={{ marginBottom: 8 }}>
            <span>{status}</span>
            <b>{count}</b>
          </div>
        ))}
      </section>
    </div>
  );
}
