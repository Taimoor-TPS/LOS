import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

const ADAPTERS = [
  ['NADRA VERISYS / biometric', 'Identity', 'Mock', 'Hard stop'],
  ['eCIB + Tasdeeq', 'Bureau', 'Mock', 'Route to manual'],
  ['Sanctions / PEP', 'AML', 'Mock', 'Compliance queue'],
  ['Raast / 1Bill / wallets', 'Payments', 'Mock', 'Retry then operations'],
  ['CBS or standalone GL', 'Core', 'Standalone', 'Platform GL'],
];

export default function IntegrationsDeskPage() {
  const [idNumber, setIdNumber] = useState('352020000000001');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function run(event) {
    event.preventDefault();
    setError('');
    try {
      const body = await api('/api/platform/eligibility', {
        method: 'POST',
        body: { idNumber, age: 34, netMonthlyIncome: 180000, existingObligations: 20000, requestedAmount: 400000, tenorMonths: 36, annualRate: 0.2 },
      });
      setResult(body);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageTitle kicker="Integration hub" title="Integrations">
        <Link className="ghost" to="/office/system">Open system</Link>
      </PageTitle>
      <section className="panel">
        <table>
          <thead><tr><th>Adapter</th><th>Domain</th><th>Mode</th><th>Failure</th></tr></thead>
          <tbody>
            {ADAPTERS.map((row) => (
              <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Demo identities: ending 0001 clean, 0002 write-off, 0003 sanctions potential, 0004 expired card. A sanctions hit is not named to the customer.</p>
      </section>
      <section className="panel">
        <h2>Identity and bureau mock</h2>
        <form onSubmit={run}>
          <div className="field"><label>ID number</label><input value={idNumber} onChange={(event) => setIdNumber(event.target.value)} /></div>
          <button className="primary" type="submit">Run pre-screen</button>
        </form>
        {error && <p className="chip bad">{error}</p>}
        {result && (
          <div className="banner" style={{ marginTop: 12 }}>
            <div>{result.identity.message}</div>
            <div>Card {result.identity.cardStatus} · flag {result.identity.flag || 'none'} · decision {result.decision.outcome}</div>
            <div>{result.eligibility.outcome}{result.eligibility.reasons[0] ? ` — ${result.eligibility.reasons[0]}` : ''}</div>
          </div>
        )}
      </section>
    </div>
  );
}
