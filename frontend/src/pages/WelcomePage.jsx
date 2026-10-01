import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AppState.jsx';

export default function WelcomePage() {
  const [personas, setPersonas] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  useEffect(() => {
    if (user?.role === 'customer') navigate('/home');
    api('/api/identity/personas').then((data) => setPersonas(data.personas)).catch(() => setPersonas([]));
  }, [user, navigate]);

  async function enter(email) {
    setError('');
    try {
      const data = await api('/api/identity/demo-enter', { method: 'POST', body: { email } });
      setUser(data.user);
      navigate('/home');
    } catch (err) {
      setError(err.message);
    }
  }

  const featured = ['ayesha.khan@customer.demo', 'sana.iqbal@customer.demo', 'hamza.qureshi@customer.demo', 'imran.farooqi@customer.demo'];
  const cards = personas.filter((persona) => featured.includes(persona.email));

  return (
    <div>
      <div className="eyebrow">Lending platform</div>
      <h2 className="display" style={{ fontSize: 36, margin: '8px 0' }}>English · اردو · العربية</h2>
      <p className="muted">Choose who is borrowing. The phone journey covers eligibility, the application, the offer and repayment.</p>
      <div className="stack" style={{ marginTop: 16 }}>
        {(cards.length ? cards : personas.slice(0, 4)).map((persona) => (
          <button className="persona" key={persona.email} type="button" onClick={() => enter(persona.email)}>
            <strong>{persona.name}</strong>
            <span className="muted">{persona.city} · {persona.segment}</span>
            <div>{persona.blurb}</div>
          </button>
        ))}
      </div>
      {error && <p className="bad pill">{error}</p>}
      <a className="ghost" href="/office/login">Staff entrance</a>
    </div>
  );
}
