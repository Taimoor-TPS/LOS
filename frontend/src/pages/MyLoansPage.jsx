import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api/client.js';

export default function MyLoansPage() {
  const [loans, setLoans] = useState([]);
  useEffect(() => { api('/api/servicing/loans').then((data) => setLoans(data.loans)); }, []);
  return (
    <div>
      <h2 className="display">Your facilities</h2>
      {loans.map((loan) => (
        <article className="card" key={loan._id}>
          <div className="row"><b>{loan.productCode}</b><span className="pill good">{loan.paidCount} paid</span></div>
          <div className="amount">{money(loan.principal, loan.currency)}</div>
          <p className="muted">{money(loan.instalment, loan.currency)} each month · debit on the {loan.nextDebitDay}th</p>
          <div className="actions">
            <Link className="primary" to={`/schedule/${loan._id}`}>Schedule</Link>
            <Link className="ghost" to={`/pay/${loan._id}`}>Pay</Link>
            <Link className="ghost" to={`/settlement/${loan._id}`}>Settle</Link>
          </div>
        </article>
      ))}
      {!loans.length && <p className="muted">No facility yet. An approved personal finance can land here in the same sitting.</p>}
    </div>
  );
}
