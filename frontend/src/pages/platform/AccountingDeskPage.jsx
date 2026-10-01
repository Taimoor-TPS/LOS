import { useEffect, useState } from 'react';
import { api, money } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

export default function AccountingDeskPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/platform/accounting').then(setData).catch((err) => setError(err.message));
  }, []);

  if (!data) return <p>{error || 'Building the trial balance…'}</p>;
  const tb = data.trialBalance;

  return (
    <div>
      <PageTitle kicker={`Business date ${data.businessDate}`} title="Trial balance">
        <span className={`chip ${tb.balanced ? 'ok' : 'bad'}`}>{tb.balanced ? 'Debits equal credits' : 'Break'}</span>
      </PageTitle>
      <div className="kpis">
        {data.controls.map((control) => (
          <article className="kpi" key={control.id}><span>{control.id}</span><b>{control.status}</b><small>{control.name}</small></article>
        ))}
      </div>
      <section className="panel">
        <table>
          <thead><tr><th>GL</th><th>Name</th><th>Debit</th><th>Credit</th><th>Closing</th></tr></thead>
          <tbody>
            {tb.rows.map((row) => (
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
      <section className="panel">
        <h2>Latest journals</h2>
        {data.journals.slice(0, 8).map((journal) => (
          <article key={journal.id} style={{ marginBottom: 10 }}>
            <b>{journal.id}</b> {journal.event} · {journal.narration}
            <div className="muted">{journal.lines.map((line) => `${line.gl} Dr ${line.dr || 0} Cr ${line.cr || 0}`).join(' · ')}</div>
          </article>
        ))}
      </section>
    </div>
  );
}
