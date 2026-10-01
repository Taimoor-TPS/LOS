import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function CreditCommitteePage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api('/api/applications?status=committee').then((data) => setRows(data.applications)); }, []);
  return (
    <div>
      <PageTitle kicker="Delegation" title="Credit committee" />
      <section className="panel">
        {rows.map((row) => (
          <article key={row._id} className="row">
            <div>
              <b>{row.customerName}</b>
              <div className="muted">{row.reference} · {row.productCode} · votes {(row.votes || []).length}</div>
            </div>
            <div>{money(row.amount, row.currency)}</div>
            <Link to={`/office/committee/${row._id}`}>Open pack</Link>
          </article>
        ))}
        {!rows.length && <p>No case is waiting on the committee.</p>}
      </section>
    </div>
  );
}
