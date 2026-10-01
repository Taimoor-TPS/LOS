import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const FAQS = [
  ['When is the instalment taken?', 'On the repayment date in your schedule, after the auto-debit window.'],
  ['Why was an application declined?', 'The message names a reason category. If a bureau was used, you can ask that bureau for your report.'],
  ['Can I settle early?', 'Yes. The quote shows principal, accrued profit and any charge that applies.'],
];

export default function ProfilePage() {
  const [customer, setCustomer] = useState(null);
  const [subject, setSubject] = useState('Instalment amount');
  const [detail, setDetail] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api('/api/customers/me').then((data) => setCustomer(data.customer)).catch(() => {});
    api('/api/platform/complaints').then((data) => setComplaints(data.complaints || [])).catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    const body = await api('/api/platform/complaints', { method: 'POST', body: { subject, detail } });
    setComplaints((current) => [body.complaint, ...current]);
    setMessage(`${body.complaint.id} opened. SLA ${body.complaint.sla}.`);
    setDetail('');
  }

  return (
    <div>
      <h2 className="display">Profile</h2>
      {customer && (
        <article className="card">
          <b>{customer.fullName}</b>
          <p className="muted">{customer.city} · {customer.segment}</p>
          <p className="muted">Verified identity fields stay locked. A contact change needs a one-time password.</p>
        </article>
      )}
      <h3>Complaints</h3>
      <form onSubmit={submit}>
        <label className="field">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
        <label className="field">What happened<textarea value={detail} onChange={(event) => setDetail(event.target.value)} /></label>
        <button className="primary" type="submit">Raise complaint</button>
      </form>
      {message && <p className="pill good">{message}</p>}
      {complaints.map((item) => (
        <article className="card" key={item.id}><b>{item.id}</b><p className="muted">{item.subject} · {item.status} · {item.sla}</p></article>
      ))}
      <h3>FAQs</h3>
      {FAQS.map(([question, answer]) => (
        <article className="card" key={question}><b>{question}</b><p className="muted">{answer}</p></article>
      ))}
      <Link className="ghost" to="/settings">Consents</Link>
      <Link className="ghost" to="/help">Help</Link>
    </div>
  );
}
