import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AppState.jsx';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNext] = useState('');
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    try {
      const data = await api('/api/identity/change-password', { method: 'POST', body: { currentPassword, newPassword } });
      setUser(data.user);
      navigate('/office');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-office">
      <form onSubmit={submit} style={{ padding: 36 }}>
        <h2 className="display">Choose a new password</h2>
        <p className="muted">At least 12 characters, with upper and lower case, a digit and a symbol. It cannot match one of your last five passwords.</p>
        <label className="field">Current password<input type="password" value={currentPassword} onChange={(event) => setCurrent(event.target.value)} /></label>
        <label className="field">New password<input type="password" value={newPassword} onChange={(event) => setNext(event.target.value)} /></label>
        {error && <p className="bad pill">{error}</p>}
        <button className="primary" type="submit">Update password</button>
      </form>
    </div>
  );
}
