import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ROLE_LABEL } from '../api/client.js';
import { useAuth } from '../context/AppState.jsx';

export default function OfficeLoginPage() {
  const [email, setEmail] = useState('omar.siddiqui@noorhorizon.demo');
  const [password, setPassword] = useState('Los@Demo2026');
  const [staff, setStaff] = useState([]);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api('/api/identity/staff-directory').then((data) => {
      setStaff(data.staff);
      setHint(data.passwordHint);
    }).catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api('/api/identity/login', { method: 'POST', body: { email, password } });
      setUser(data.user);
      navigate(data.user.role === 'customer' ? '/home' : data.user.role === 'dealer' ? '/office/dealer' : '/office');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-office">
      <section className="login-copy">
        <div className="eyebrow">Back office</div>
        <h1>Origination, servicing and collections in one shell.</h1>
        <p>Work the queue, book the loan, run the end of day, and prove the trial balance before the date rolls.</p>
      </section>
      <form onSubmit={submit} style={{ padding: 36 }}>
        <h2 className="display">Sign in</h2>
        <label className="field">Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="field">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="bad pill">{error}</p>}
        <button className="primary" type="submit">Enter the desk</button>
        <div className="staff-grid" style={{ padding: '18px 0', background: 'transparent' }}>
          {staff.map((person) => (
            <button className="persona" type="button" key={person.email} onClick={() => { setEmail(person.email); setPassword(hint || 'Los@Demo2026'); }}>
              <strong>{person.name}</strong>
              <span className="muted">{ROLE_LABEL[person.role]}</span>
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
