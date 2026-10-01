import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function ShariahControlPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api('/api/applications').then((data) => {
      setRows(data.applications.filter((row) => row.contractType && row.contractType !== 'conventional'));
    });
  }, []);
  return (
    <div>
      <PageTitle kicker="Shariah" title="Sequencing evidence" />
      <p className="muted">Disbursement stays closed until purchase, ownership and possession are on the file. Late-payment amounts on these products are charity, not income.</p>
      {rows.map((row) => (
        <article className="panel" key={row._id}>
          <h2>{row.customerName} · {row.contractType} · {row.status}</h2>
          {(row.sequence || []).map((step) => (
            <div className="row" key={step.code}><span>{step.title}</span><span className={`pill ${step.status === 'complete' ? 'good' : 'warn'}`}>{step.status}</span></div>
          ))}
        </article>
      ))}
    </div>
  );
}
