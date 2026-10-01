import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api/client.js';

const NEXT = {
  draft: '/apply',
  verified: '/decision',
  approved: '/key-facts',
  referred: '/decision',
  committee: '/decision',
  declined: '/decision',
  accepted: '/sign',
  pending_fulfilment: '/sign',
  disbursed: '/funds',
};

export default function TrackPage() {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/applications').then((data) => setApplications(data.applications || [])).catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <div className="eyebrow">Status</div>
      <h2 className="display">Track</h2>
      <p className="muted">Each case keeps the same reference from the first save through disbursement.</p>
      {error && <p className="bad pill">{error}</p>}
      {applications.map((application) => {
        const stem = NEXT[application.status] || '/decision';
        return (
          <article className="card" key={application._id}>
            <div className="row">
              <b>{application.reference}</b>
              <span className="pill">{application.status}</span>
            </div>
            <div className="muted">{application.productCode}</div>
            <div className="amount">{money(application.amount, application.currency)}</div>
            <Link className="primary" to={`${stem}/${application._id}`}>Open</Link>
          </article>
        );
      })}
      {!applications.length && !error && <p className="muted">No application yet. Start from Home.</p>}
    </div>
  );
}
