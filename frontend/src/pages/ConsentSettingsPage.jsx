import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AppState.jsx';

const PURPOSES = ['identity', 'bureau', 'salary', 'marketing', 'alternative_data', 'open_banking'];

export default function ConsentSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api('/api/customers/me').then((data) => setCustomer(data.customer));
  }, []);

  async function revoke(purpose) {
    await api(`/api/customers/${user.customerId}/consents/revoke`, { method: 'POST', body: { purpose } });
    setMessage(`${purpose} consent withdrawn.`);
  }

  return (
    <div>
      <h2 className="display">{customer?.fullName}</h2>
      <p className="muted">{customer?.city} · {customer?.cnic}</p>
      <div className="stack">
        {PURPOSES.map((purpose) => (
          <button className="ghost" key={purpose} type="button" onClick={() => revoke(purpose)}>Withdraw {purpose.replace('_', ' ')}</button>
        ))}
      </div>
      {message && <p className="pill good">{message}</p>}
      <button className="primary" type="button" onClick={async () => { await logout(); navigate('/'); }}>Sign out</button>
    </div>
  );
}
