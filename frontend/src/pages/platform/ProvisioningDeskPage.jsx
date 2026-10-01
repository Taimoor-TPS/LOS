import { useEffect, useState } from 'react';
import { api, money } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

export default function ProvisioningDeskPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/platform/provisioning').then(setData).catch((err) => setError(err.message));
  }, []);

  if (!data) return <p>{error || 'Running the provision comparison…'}</p>;

  return (
    <div>
      <PageTitle kicker={data.regime} title="Provisioning">
        <span className="chip info">As of {data.asOf}</span>
      </PageTitle>
      <div className="kpis">
        <article className="kpi"><span>Outstanding</span><b>{money(data.totals.outstanding)}</b></article>
        <article className="kpi"><span>IFRS 9 ECL</span><b>{money(data.totals.ecl)}</b></article>
        <article className="kpi"><span>Prudential</span><b>{money(data.totals.regulatory)}</b></article>
        <article className="kpi"><span>Booked</span><b>{money(data.totals.booked)}</b></article>
      </div>
      <p className="banner">Stage 3 books the higher of expected credit loss and the prudential requirement. Stage 1 and 2 book 12-month or lifetime ECL. Rates are seeded defaults for the demo.</p>
      <section className="panel">
        <table>
          <thead>
            <tr><th>Loan</th><th>Customer</th><th>DPD</th><th>Class</th><th>Stage</th><th>Outstanding</th><th>ECL</th><th>PR</th><th>Booked</th></tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.loanAccountNo}>
                <td>{row.loanAccountNo}</td>
                <td>{row.customer}</td>
                <td>{row.dpd}</td>
                <td>{row.classification}</td>
                <td>{row.stage}{row.higherOf ? ' · higher of' : ''}</td>
                <td>{money(row.outstanding)}</td>
                <td>{money(row.ecl)}</td>
                <td>{money(row.regulatory)}</td>
                <td>{money(row.booked)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
