import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, money } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function Customer360Page() {
  const { customerId } = useParams();
  const [data, setData] = useState(null);
  useEffect(() => { api(`/api/customers/${customerId}`).then(setData); }, [customerId]);
  if (!data) return <p>Loading the customer…</p>;
  const customer = data.customer;
  return (
    <div>
      <PageTitle kicker={customer.customerNo} title={customer.fullName} />
      <div className="kpis">
        <article className="kpi"><span>Segment</span><b>{customer.segment}</b></article>
        <article className="kpi"><span>Bureau</span><b>{customer.bureauScore}</b></article>
        <article className="kpi"><span>Income</span><b>{money(customer.monthlyIncome || customer.cashflowMonthly)}</b></article>
        <article className="kpi"><span>CNIC</span><b>{customer.cnic}</b></article>
      </div>
      <section className="panel">
        <h2>Consent ledger</h2>
        {(data.consents || []).map((consent) => (
          <p key={consent._id}>{consent.purpose} · {consent.revokedAt ? 'withdrawn' : 'active'} · {consent.channel}</p>
        ))}
        {!data.consents?.length && <p className="muted">No consent has been recorded on this profile yet.</p>}
      </section>
    </div>
  );
}
