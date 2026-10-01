import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function MisAnalyticsPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/api/reporting/command-center').then(setData); }, []);
  if (!data) return <p>Building the funnel…</p>;
  const max = Math.max(...Object.values(data.byStatus), 1);
  return (
    <div>
      <PageTitle kicker="Management information" title="Funnel and reasons" />
      <section className="panel">
        {Object.entries(data.byStatus).map(([status, count]) => (
          <div key={status} style={{ marginBottom: 10 }}>
            <div className="row"><span>{status}</span><b>{count}</b></div>
            <div className="bar"><span style={{ width: `${(count / max) * 100}%` }} /></div>
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>Decline and refer reasons</h2>
        {Object.entries(data.declineReasons).map(([code, count]) => <div className="row" key={code}><span>{code}</span><b>{count}</b></div>)}
      </section>
    </div>
  );
}
