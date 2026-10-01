import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';

export default function ESignPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/applications/${applicationId}/sign/start`, { method: 'POST', body: {} })
      .then((data) => setDemoOtp(data.demoOtp || ''))
      .catch((err) => setError(err.message));
  }, [applicationId]);

  async function sign() {
    setError('');
    try {
      const data = await api(`/api/applications/${applicationId}/sign/confirm`, { method: 'POST', body: { otp } });
      navigate(`/funds/${applicationId}`, { state: { loan: data.loan, status: data.application.status } });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="eyebrow">e-Sign</div>
      <h2 className="display">Sign with a code</h2>
      <p className="muted">In production this code goes by SMS. In the demo it is shown here so you can finish the journey.</p>
      {demoOtp && <div className="receipt"><div className="muted">Demo code</div><strong className="display" style={{ fontSize: 32 }}>{demoOtp}</strong></div>}
      <input className="otp" inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" />
      {error && <p className="bad pill">{error}</p>}
      <button className="primary" type="button" onClick={sign}>Sign and finish</button>
    </div>
  );
}
