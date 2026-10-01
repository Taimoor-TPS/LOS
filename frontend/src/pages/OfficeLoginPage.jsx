import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AppState.jsx';

export default function OfficeLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api('/api/identity/login', { method: 'POST', body: { username, password } });
      setUser(data.user);
      navigate(data.user.mustChangePassword ? '/office/change-password' : '/office');
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
        <label className="field">Username<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label className="field">Password<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="bad pill">{error}</p>}
        <button className="primary" type="submit">Enter the desk</button>
      </form>
    </div>
  );
}
