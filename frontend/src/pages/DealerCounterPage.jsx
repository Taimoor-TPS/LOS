import { useEffect, useState } from 'react';
import { api, money } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function DealerCounterPage() {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState(1800000);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/api/customers').then((data) => {
      setCustomers(data.customers);
      const hiba = data.customers.find((customer) => customer.fullName.includes('Hiba'));
      if (hiba) setCustomerId(hiba.id);
    }).catch((err) => setError(err.message));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api('/api/dealers/originate', {
        method: 'POST',
        body: {
          customerId,
          productCode: 'HBL-ISL-AUT-01',
          amount: Number(amount),
          tenorMonths: 36,
          asset: { description: '2025 Honda City', value: 6500000 },
          consented: true,
        },
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageTitle kicker="Clifton Motors" title="Dealer counter" />
      <form className="panel" onSubmit={submit}>
        <label className="field">Walk-in
          <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName}</option>)}
          </select>
        </label>
        <label className="field">Finance amount<input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        <p className="muted">The customer has agreed, at the counter, to identity, bureau and salary checks.</p>
        <button className="primary" type="submit">Ask for a decision</button>
      </form>
      {result && (
        <section className="panel">
          <h2>{result.decision.outcome}</h2>
          <p>{money(result.application.amount)} · score {result.decision.score?.score}</p>
          {result.decision.reasons.map((reason) => <p key={reason.code}>{reason.en}</p>)}
        </section>
      )}
      {error && <p className="bad pill">{error}</p>}
    </div>
  );
}
