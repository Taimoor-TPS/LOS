import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

export default function SystemDeskPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState(1);
  const [impact, setImpact] = useState([]);

  async function roll() {
    setError('');
    setMessage('');
    try {
      const body = await api('/api/platform/eod', { method: 'POST', body: {} });
      setMessage(`Business date is now ${body.businessDate}. Trial balance ${body.trialBalance.balanced ? 'matched' : 'broken'}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function usersMode(count) {
    setError('');
    try {
      const body = await api('/api/platform/access/users', { method: 'POST', body: { count } });
      setUsers(body.backOfficeUsers);
      setMessage(body.allowSelfAuthorisation ? 'Self-authorise is available.' : 'Self-authorise switched off. A checker now exists.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function retire() {
    setImpact([]);
    setError('');
    try {
      await api('/api/platform/fields/retire', { method: 'POST', body: { fieldCode: 'gross_monthly_income' } });
      setMessage('Field retired.');
    } catch (err) {
      setError(err.message);
      setImpact(['rule:PL_DBR_CAP', 'form:employment', 'report:application-register']);
    }
  }

  return (
    <div>
      <PageTitle kicker="Batch, access and configuration governance" title="System" />
      <div className="split">
        <section className="panel">
          <h2>End of day</h2>
          <p className="muted">Accrual, due marking, classification flags, collections assignment and GL posting. The date does not roll when the trial balance is out.</p>
          <button className="primary" type="button" onClick={roll}>Run EOD and roll the date</button>
        </section>
        <section className="panel">
          <h2>Single-user maker-checker</h2>
          <p className="muted">Active back-office users: {users}. A second user with the checker permission turns self-authorisation off.</p>
          <div className="actions">
            <button className="ghost" type="button" onClick={() => usersMode(1)}>One user</button>
            <button className="primary" type="button" onClick={() => usersMode(2)}>Add checker</button>
          </div>
        </section>
      </div>
      <section className="panel">
        <h2>Field retirement impact</h2>
        <p className="muted">Retiring gross monthly income is blocked while a live debt-burden rule depends on it.</p>
        <button className="danger" type="button" onClick={retire}>Retire field</button>
        {!!impact.length && <p>Impact: {impact.join(', ')}</p>}
      </section>
      {message && <p className="chip ok">{message}</p>}
      {error && <p className="chip bad">{error}</p>}
      <section className="panel">
        <h2>Specialist desks</h2>
        <div className="actions">
          <Link className="ghost" to="/office/rules">Rules</Link>
          <Link className="ghost" to="/office/scorecards">Scorecards</Link>
          <Link className="ghost" to="/office/committee">Credit committee</Link>
          <Link className="ghost" to="/office/fulfilment">Credit administration</Link>
          <Link className="ghost" to="/office/shariah">Shariah</Link>
          <Link className="ghost" to="/office/models">Model governance</Link>
          <Link className="ghost" to="/office/regulatory">Regulatory packs</Link>
        </div>
      </section>
    </div>
  );
}
