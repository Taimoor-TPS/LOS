import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, money } from '../api/client.js';

export default function SettlementPage() {
  const { loanId } = useParams();
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [account, setAccount] = useState(loanId || 'PK0101PFS00000018');

  useEffect(() => {
    let active = true;
    async function load() {
      const servicing = await api('/api/servicing/loans').catch(() => ({ loans: [] }));
      const loan = (servicing.loans || []).find((item) => item._id === loanId);
      const body = loan ? { principal: loan.principal, rate: loan.rate } : {};
      const target = loan ? (loan.accountMasked || loanId) : account;
      try {
        const response = await api(`/api/platform/loans/${encodeURIComponent(target)}/settlement-quote`, { method: 'POST', body });
        if (active) setQuote(response.quote);
      } catch (err) {
        if (active) setError(err.message);
      }
    }
    load();
    return () => { active = false; };
  }, [loanId, account]);

  return (
    <div>
      <h2 className="display">Early settlement</h2>
      <p className="muted">Quote for {account}. It stays valid through the selected business date.</p>
      {error && <p className="bad pill">{error}</p>}
      {quote && (
        <article className="card">
          <div className="row"><span>Principal</span><b>{money(quote.principal)}</b></div>
          <div className="row"><span>Accrued profit</span><b>{money(quote.accrued)}</b></div>
          <div className="row"><span>Charges</span><b>{money(quote.charges)}</b></div>
          <div className="row"><span>Penalty</span><b>{money(quote.penalty)}</b></div>
          <div className="amount">{money(quote.total)}</div>
          {quote.charityNote && <p className="muted">{quote.charityNote}</p>}
          {quote.illustrative && <p className="muted">Illustrative quote from the facility balance.</p>}
          <p className="muted">Valid until {quote.validUntil}</p>
        </article>
      )}
    </div>
  );
}
