import { useEffect, useState } from 'react';
import { api, money } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

export default function AccountingDeskPage() {
  const [tb, setTb] = useState(null);
  const [recon, setRecon] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/api/gl/trial-balance'), api('/api/gl/reconciliation')])
      .then(([balance, breaks]) => { setTb(balance); setRecon(breaks); })
      .catch((err) => setError(err.message));
  }, []);

  if (!tb) return <p>{error || 'Building the trial balance…'}</p>;

  return (
    <div>
      <PageTitle kicker="From posted journals" title="Trial balance">
        <span className={`chip ${tb.balanced ? 'ok' : 'bad'}`}>{tb.balanced ? 'Debits equal credits' : 'Break'}</span>
      </PageTitle>
      <div className="kpis">
        {(recon?.controls || recon?.items || []).map((control) => (
          <article className="kpi" key={control.id || control.code}><span>{control.id || control.code}</span><b>{control.status}</b><small>{control.name || control.detail}</small></article>
        ))}
      </div>
      <section className="panel">
        <table>
          <thead><tr><th>GL</th><th>Name</th><th>Debit</th><th>Credit</th><th>Closing</th></tr></thead>
          <tbody>
            {(tb.rows || []).map((row) => (
              <tr key={row.gl}>
                <td>{row.gl}</td><td>{row.name}</td><td>{money(row.debit)}</td><td>{money(row.credit)}</td><td>{money(row.closing)}</td>
              </tr>
            ))}
            <tr>
              <td /><td><b>Total</b></td><td><b>{money(tb.debit)}</b></td><td><b>{money(tb.credit)}</b></td><td />
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
