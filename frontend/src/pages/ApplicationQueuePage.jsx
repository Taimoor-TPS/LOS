import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, money } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function ApplicationQueuePage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    const query = status ? `?status=${status}` : '';
    api(`/api/applications${query}`).then((data) => setRows(data.applications));
  }, [status]);
  return (
    <div>
      <PageTitle kicker="Origination" title="Application queue">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {['referred', 'pending_second_approval', 'committee', 'pending_fulfilment', 'approved', 'declined', 'disbursed'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </PageTitle>
      <section className="panel">
        <table>
          <thead><tr><th>Ref</th><th>Customer</th><th>Product</th><th>Amount</th><th>Status</th><th>Score</th><th>SLA</th></tr></thead>
          <tbody>
            {rows.map((row) => {
              const late = row.slaDueAt && new Date(row.slaDueAt) < new Date() && ['referred', 'committee'].includes(row.status);
              return (
                <tr className="click" key={row._id} onClick={() => navigate(`/office/workbench/${row._id}`)}>
                  <td className="mono">{row.reference}</td>
                  <td>{row.customerName}</td>
                  <td>{row.productCode}</td>
                  <td>{money(row.amount, row.currency)}</td>
                  <td><span className={`pill ${row.status === 'declined' ? 'bad' : row.status === 'approved' || row.status === 'disbursed' ? 'good' : 'warn'}`}>{row.status}</span></td>
                  <td>{row.decision?.score?.score ?? '—'}</td>
                  <td>{late ? 'Breached' : row.slaDueAt ? 'Inside' : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
