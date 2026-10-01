import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, money } from '../api/client.js';

export default function FundsReceivedPage() {
  const { applicationId } = useParams();
  const location = useLocation();
  const [application, setApplication] = useState(null);
  const loan = location.state?.loan;

  useEffect(() => {
    api(`/api/applications/${applicationId}`).then((data) => setApplication(data.application));
  }, [applicationId]);

  const disbursed = application?.status === 'disbursed';
  return (
    <div>
      <div className="hero">
        <div>
          <div className="kicker">{disbursed ? 'Funds sent' : 'Signed'}</div>
          <h2>{disbursed ? money(application.amount, application.currency) : 'With operations'}</h2>
          <p>{disbursed ? `Credited to ${loan?.accountMasked || application?.customerName || 'your account'} via ${loan?.rail || 'Raast'}.` : 'Islamic or high-value cases wait until every ownership step has evidence.'}</p>
        </div>
      </div>
      {disbursed && (
        <div className="card">
          <h3>Repayment</h3>
          <p>Auto-debit on the 5th. Next instalment {money(application.indicativeInstalment, application.currency)}.</p>
          <Link className="primary" to={`/schedule/${loan?._id || application.loanId}`}>View schedule</Link>
        </div>
      )}
      <div className="card">
        <h3>For you, later</h3>
        <p className="muted">After six on-time payments the engine can offer a top-up. It will not offer new credit if salary credits stop.</p>
        <Link className="ghost" to="/grow">See what could come next</Link>
      </div>
    </div>
  );
}
