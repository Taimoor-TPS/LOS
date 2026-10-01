import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api/client.js';

const MILESTONE = {
  draft: 'Draft',
  submitted: 'In progress',
  verifying: 'In progress',
  referred: 'Action needed',
  approved: 'Offer ready',
  declined: 'Declined',
  signed: 'Approved',
  disbursed: 'Disbursed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export default function ApplicationsListPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/applications').then((data) => setRows(data.applications || [])).catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h2 className="display">My applications</h2>
      {error && <p className="bad pill">{error}</p>}
      {rows.map((row) => (
        <article className="card" key={row._id}>
          <div className="row"><b>{row.productCode}</b><span className="pill">{MILESTONE[row.status] || row.status}</span></div>
          <p className="muted">{row.reference}</p>
          <div className="amount">{money(row.amount, row.currency)}</div>
          <Link className="ghost" to="/track">Timeline</Link>
        </article>
      ))}
      {!rows.length && !error && <p className="muted">No application yet. Products are open.</p>}
      <Link className="primary" to="/discover">Browse products</Link>
    </div>
  );
}
