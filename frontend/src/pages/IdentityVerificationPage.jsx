import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';

const PURPOSES = [
  ['identity', 'Face match and CNIC', 'We check that you are you.'],
  ['bureau', 'Credit bureau', 'We read your repayment history.'],
  ['salary', 'Salary credits', 'We confirm income from your account, not a scanned slip.'],
  ['alternative_data', 'Wallet and bills', 'Only if you want a thin-file limit to use this.'],
];

export default function IdentityVerificationPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [picked, setPicked] = useState(['identity', 'bureau', 'salary']);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(purpose) {
    setPicked((current) => current.includes(purpose) ? current.filter((item) => item !== purpose) : [...current, purpose]);
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await api(`/api/applications/${applicationId}/consents`, { method: 'POST', body: { purposes: picked } });
      await api(`/api/applications/${applicationId}/verify`, { method: 'POST', body: {} });
      navigate(`/decision/${applicationId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="eyebrow">Quick verification</div>
      <h2 className="display">Consent, then we check</h2>
      <p className="muted">You can withdraw any of these later in Profile. Withdrawal stops new use.</p>
      <div className="stack" style={{ marginTop: 12 }}>
        {PURPOSES.map(([purpose, title, copy]) => (
          <label className="check" key={purpose}>
            <input type="checkbox" checked={picked.includes(purpose)} onChange={() => toggle(purpose)} />
            <span><b>{title}</b><br /><span className="muted">{copy}</span></span>
          </label>
        ))}
      </div>
      {error && <p className="bad pill">{error}</p>}
      <button className="primary" type="button" disabled={busy} onClick={submit}>{busy ? 'Checking…' : 'Submit application'}</button>
    </div>
  );
}
