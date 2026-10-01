import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, money } from '../api/client.js';

export default function ApplicationPage() {
  const { productCode } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState('');
  const amount = Number(params.get('amount'));
  const tenor = Number(params.get('tenor'));

  useEffect(() => {
    api('/api/customers/me').then((data) => setCustomer(data.customer)).catch((err) => setError(err.message));
  }, []);

  async function start() {
    setError('');
    try {
      const data = await api('/api/applications', {
        method: 'POST',
        body: { productCode, amount, tenorMonths: tenor, offerId: params.get('offer') || undefined, channel: 'app' },
      });
      navigate(`/verify/${data.application._id || data.application.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!customer) return <p className="muted">Reading what the bank already knows…</p>;

  return (
    <div>
      <div className="eyebrow">Almost nothing to type</div>
      <h2 className="display">Check what we filled in</h2>
      <div className="card stack">
        <div className="row"><span>Name</span><b>{customer.fullName}</b></div>
        <div className="row"><span>City</span><b>{customer.city}</b></div>
        <div className="row"><span>Work</span><b>{customer.employer}</b></div>
        <div className="row"><span>Income</span><b>{money(customer.monthlyIncome || customer.cashflowMonthly)}</b></div>
        <div className="row"><span>CNIC</span><b>{customer.cnic}</b></div>
        <div className="row"><span>You asked for</span><b>{money(amount)} · {tenor} months</b></div>
      </div>
      <p className="muted">You can leave and come back. The application stays on this phone until you submit it.</p>
      {error && <p className="bad pill">{error}</p>}
      <button className="primary" type="button" onClick={start}>This looks right</button>
    </div>
  );
}
