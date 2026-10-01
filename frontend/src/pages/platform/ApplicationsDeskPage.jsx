import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

const MILESTONE = {
  draft: 'Draft saved',
  submitted: 'Application received',
  verifying: 'Under review',
  referred: 'Under review',
  underwriting: 'Under review',
  approved: 'Approved — offer ready',
  declined: 'Not approved',
  signed: 'Offer accepted',
  disbursed: 'Funds sent',
  expired: 'Closed',
  cancelled: 'Closed',
};

export default function ApplicationsDeskPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/applications?pageSize=50').then((data) => setRows(data.items || data.applications || [])).catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <PageTitle kicker="S0 to S7" title="Applications">
        <Link className="ghost" to="/office/queue">Stage workbench</Link>
      </PageTitle>
      {error && <p className="chip bad">{error}</p>}
      <section className="panel">
        <table>
          <thead>
            <tr><th>Application</th><th>Customer</th><th>Product</th><th>Amount</th><th>Channel</th><th>Customer milestone</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="click" onClick={() => { window.location.assign(`/office/workbench/${row._id}`); }}>
                <td>{row.reference}</td>
                <td>{row.customerName}</td>
                <td>{row.productCode}</td>
                <td>{money(row.amount, row.currency)}</td>
                <td>{row.channel}</td>
                <td><span className="chip info">{MILESTONE[row.status] || row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && !error && <p className="muted">No applications in this entity yet.</p>}
      </section>
    </div>
  );
}
