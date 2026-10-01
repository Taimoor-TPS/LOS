import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api/client.js';

const MILESTONE = {
  draft: 'Draft saved',
  submitted: 'Application received',
  verifying: 'Under review',
  referred: 'Under review',
  approved: 'Approved — offer ready',
  declined: 'Not approved',
  signed: 'Offer accepted',
  disbursed: 'Funds sent',
};

export default function HomePage() {
  const [customer, setCustomer] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loans, setLoans] = useState([]);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    api('/api/customers/me').then((data) => setCustomer(data.customer)).catch(() => {});
    api('/api/applications').then((data) => setApplications(data.applications || [])).catch(() => {});
    api('/api/servicing/loans').then((data) => setLoans(data.loans || [])).catch(() => {});
    api('/api/engagement/offers/mine').then((data) => setOffers(data.offers || [])).catch(() => {});
  }, []);

  const first = customer?.fullName?.split(' ')[0] || 'there';
  const application = applications[0];
  const loan = loans[0];
  const offer = offers[0];

  return (
    <div>
      <div className="eyebrow">Home</div>
      <h2 className="display" style={{ fontSize: 32, margin: '4px 0 12px' }}>{first}</h2>
      {offer && (
        <article className="card" style={{ background: 'var(--sky-200)', color: 'var(--navy-900)' }}>
          <div className="kicker">Pre-approved</div>
          <b>{offer.product?.name || offer.productCode}</b>
          <div className="amount">{money(offer.limit, offer.currency)}</div>
          <Link className="primary" to={`/simulate/${offer.productCode}?offer=${offer._id}`}>Apply</Link>
        </article>
      )}
      {application && (
        <article className="card">
          <div className="row"><b>Application</b><span className="pill">{MILESTONE[application.status] || application.status}</span></div>
          <p className="muted">{application.reference} · {money(application.amount, application.currency)}</p>
          <Link className="ghost" to="/track">Track</Link>
        </article>
      )}
      {loan && (
        <article className="card">
          <div className="row"><b>Next instalment</b><span className="pill good">Current</span></div>
          <div className="amount">{money(loan.instalment, loan.currency)}</div>
          <p className="muted">Debit on the {loan.nextDebitDay}th · {loan.productCode}</p>
          <Link className="primary" to={`/pay/${loan._id}`}>Pay</Link>
        </article>
      )}
      <div className="actions" style={{ marginTop: 16 }}>
        <Link className="primary" to="/discover">Apply</Link>
        <Link className="ghost" to="/pay">Pay</Link>
        <Link className="ghost" to="/applications">Track</Link>
      </div>
    </div>
  );
}
