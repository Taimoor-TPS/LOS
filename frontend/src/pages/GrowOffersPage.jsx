import { useEffect, useState } from 'react';
import { api, money } from '../api/client.js';

export default function GrowOffersPage() {
  const [loans, setLoans] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/api/servicing/loans').then((data) => setLoans(data.loans)); }, []);

  async function topup(loan) {
    setError('');
    try {
      const data = await api(`/api/servicing/loans/${loan._id}/requests`, {
        method: 'POST',
        body: { type: 'topup', amount: 50000, tenorMonths: loan.tenorMonths },
      });
      setResult(data.request);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="eyebrow">After good repayment</div>
      <h2 className="display">A careful next step</h2>
      <p className="muted">Top-up is re-scored. It is not a reward for clicking. If the cap is tight, the answer is no.</p>
      {loans.map((loan) => (
        <article className="card" key={loan._id}>
          <b>{money(loan.principal, loan.currency)} outstanding book</b>
          <p className="muted">{loan.paidCount} instalments already paid.</p>
          <button className="primary" type="button" onClick={() => topup(loan)}>Ask for a Rs 50,000 top-up</button>
        </article>
      ))}
      {result && (
        <div className="card">
          <span className={`pill ${result.status === 'offered' ? 'good' : 'warn'}`}>{result.status}</span>
          <p>{result.decision?.reasons?.[0]?.en}</p>
          {result.preview && <p>New instalment {money(result.preview.instalment)}</p>}
        </div>
      )}
      {error && <p className="bad pill">{error}</p>}
    </div>
  );
}
