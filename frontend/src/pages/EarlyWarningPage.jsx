import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function EarlyWarningPage() {
  const [signals, setSignals] = useState([]);
  function load() { api('/api/early-warning').then((data) => setSignals(data.signals)); }
  useEffect(load, []);
  return (
    <div>
      <PageTitle kicker="Portfolio" title="Early warning" />
      {signals.map((signal) => (
        <article className="panel" key={signal._id}>
          <div className="row"><h2>{signal.customerName}</h2><span className="pill bad">{signal.severity}</span></div>
          <p><b>{signal.title}.</b> {signal.detail}</p>
          <p>{signal.recommendedAction}</p>
          {signal.status === 'open' && <button className="primary" type="button" onClick={async () => { await api(`/api/early-warning/${signal._id}/acknowledge`, { method: 'POST', body: {} }); load(); }}>Acknowledge</button>}
          {signal.status !== 'open' && <p className="muted">Acknowledged by {signal.acknowledgedBy}</p>}
        </article>
      ))}
    </div>
  );
}
