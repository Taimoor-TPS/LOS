import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, money } from '../api/client.js';

export default function PayNowPage() {
  const { loanId } = useParams();
  const [loans, setLoans] = useState([]);
  const [account, setAccount] = useState('PK0101PFS00000018');
  const [amount, setAmount] = useState('10000');
  const [method, setMethod] = useState('Raast');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/servicing/loans').then((data) => {
      const rows = data.loans || [];
      setLoans(rows);
      const match = rows.find((loan) => loan._id === loanId);
      if (match) setAmount(String(match.instalment || 10000));
    }).catch(() => {});
  }, [loanId]);

  async function pay(event) {
    event.preventDefault();
    setError('');
    setReceipt(null);
    try {
      const body = await api('/api/platform/payments', {
        method: 'POST',
        body: {
          loanAccountNo: account,
          amount: Number(amount),
          method,
          idempotencyKey: `${account}-${amount}-${method}-${Date.now()}`,
        },
      });
      setReceipt(body.receipt);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2 className="display">Pay now</h2>
      <p className="muted">Payment is confirmed only after the rail accepts it. Use a loan account from My loans, or the servicing demo account PK0101PFS00000018.</p>
      {loans.map((loan) => (
        <p key={loan._id} className="muted">{loan.productCode} instalment {money(loan.instalment, loan.currency)}</p>
      ))}
      <form onSubmit={pay}>
        <label className="field">Loan account<input value={account} onChange={(event) => setAccount(event.target.value)} /></label>
        <label className="field">Amount<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" /></label>
        <label className="field">Method
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            <option>Linked account</option>
            <option>Wallet</option>
            <option>Raast</option>
            <option>Card</option>
          </select>
        </label>
        <button className="primary" type="submit">Pay</button>
      </form>
      {error && <p className="bad pill">{error}</p>}
      {receipt && (
        <article className="card">
          <b>{receipt.status}</b>
          <p>{receipt.reference || receipt.id}</p>
          <p className="muted">{money(receipt.amount)} via {receipt.method}</p>
        </article>
      )}
    </div>
  );
}
