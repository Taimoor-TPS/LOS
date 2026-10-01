import { useEffect, useState } from 'react';
import { api, money } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function FulfilmentPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  function load() { api('/api/applications?status=pending_fulfilment').then((data) => setRows(data.applications)); }
  useEffect(load, []);

  async function finish(row) {
    setError('');
    try {
      for (const step of row.sequence.filter((item) => item.required && item.status !== 'complete')) {
        await api(`/api/applications/${row._id}/steps/${step.code}`, { method: 'POST', body: { evidence: `Evidence recorded for ${step.title}` } });
      }
      await api(`/api/applications/${row._id}/disburse`, { method: 'POST', body: {} });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageTitle kicker="Operations" title="Fulfilment" />
      {rows.map((row) => (
        <article className="panel" key={row._id}>
          <h2>{row.customerName} · {row.productCode}</h2>
          <p>{money(row.amount, row.currency)} · {row.asset?.description || 'Unsecured'}</p>
          {(row.sequence || []).map((step) => <div key={step.code} className="row"><span>{step.title}</span><b>{step.status}</b></div>)}
          <button className="primary" type="button" onClick={() => finish(row)}>Record remaining evidence and disburse</button>
        </article>
      ))}
      {!rows.length && <p>Nothing is waiting on conditions.</p>}
      {error && <p className="bad pill">{error}</p>}
    </div>
  );
}
