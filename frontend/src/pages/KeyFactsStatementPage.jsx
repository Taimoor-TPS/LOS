import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, money, rateLabel } from '../api/client.js';

export default function KeyFactsStatementPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [kfs, setKfs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/applications/${applicationId}/kfs`).then((data) => setKfs(data.kfs)).catch((err) => setError(err.message));
  }, [applicationId]);

  async function accept() {
    try {
      await api(`/api/applications/${applicationId}/accept`, { method: 'POST', body: {} });
      navigate(`/sign/${applicationId}`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!kfs) return <p className="muted">Preparing the key facts…</p>;
  return (
    <div>
      <div className="eyebrow">Disclosure</div>
      <h2 className="display">{kfs.title}</h2>
      <div className="facts">
        <div className="fact">Amount<b>{money(kfs.amount, kfs.currency)}</b></div>
        <div className="fact">Tenor<b>{kfs.tenorMonths} months</b></div>
        <div className="fact">Instalment<b>{money(kfs.instalment, kfs.currency)}</b></div>
        <div className="fact">{kfs.rateLabel}<b>{rateLabel(kfs.rate)}</b></div>
        <div className="fact">Fee<b>{money(kfs.fee, kfs.currency)}</b></div>
        <div className="fact">Total cost<b>{money(kfs.totalCost, kfs.currency)}</b></div>
      </div>
      <p>{kfs.latePayment}</p>
      <p className="muted">{kfs.disclaimer}</p>
      {error && <p className="bad pill">{error}</p>}
      <button className="primary" type="button" onClick={accept}>I have read this</button>
    </div>
  );
}
