import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, money, rateLabel } from '../api/client.js';

export default function RepaymentSchedulePage() {
  const { loanId } = useParams();
  const [loan, setLoan] = useState(null);
  useEffect(() => { api(`/api/servicing/loans/${loanId}`).then((data) => setLoan(data.loan)); }, [loanId]);
  if (!loan) return <p className="muted">Loading the schedule…</p>;
  return (
    <div>
      <div className="eyebrow">{loan.contractType === 'conventional' || loan.contractType === 'running_finance' ? 'Interest component' : 'Profit / rental'}</div>
      <h2 className="display">{money(loan.instalment, loan.currency)}</h2>
      <p className="muted">{rateLabel(loan.rate)} · {loan.tenorMonths} months</p>
      <div className="stack">
        {loan.schedule.slice(0, 8).map((row) => (
          <div className="row card" key={row.n} style={{ marginTop: 0 }}>
            <span>#{row.n} · {row.status}</span>
            <b>{money(row.instalment, loan.currency)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
