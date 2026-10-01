import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function RulesStudioPage() {
  const [rules, setRules] = useState([]);
  const [name, setName] = useState('Cooling off after a decline');
  const [message, setMessage] = useState('');

  function load() { api('/api/rules').then((data) => setRules(data.rules)); }
  useEffect(load, []);

  async function draft() {
    try {
      const created = await api('/api/rules', {
      method: 'POST',
      body: {
        code: `COOLING_${Date.now().toString().slice(-6)}`,
        name,
        stage: 'eligibility',
        priority: 5,
        when: { all: [{ field: 'duplicateApplications', op: 'gte', value: 3 }] },
        then: { outcome: 'decline', reasonCode: 'COOLING_OFF', stop: true },
      },
    });
    await api(`/api/rules/${created.rule._id}/submit`, { method: 'POST', body: {} });
    setMessage(`Draft ${created.rule.code} is waiting. A different checker has to approve it.`);
      load();
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div>
      <PageTitle kicker="No-code policy" title="Rules studio" />
      <section className="panel">
        <label className="field">New rule name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <button className="primary" type="button" onClick={draft}>Save draft</button>
        {message && <p>{message}</p>}
        {rules.filter((rule) => rule.status === 'pending_approval').map((rule) => (
          <button className="ghost" type="button" key={rule._id} onClick={async () => {
            try {
              await api(`/api/rules/${rule._id}/approve`, { method: 'POST', body: {} });
              setMessage(`${rule.name} is now active.`);
              load();
            } catch (err) {
              setMessage(err.message);
            }
          }}>Approve {rule.name}</button>
        ))}
      </section>
      <section className="panel">
        <table>
          <thead><tr><th>Code</th><th>Stage</th><th>When</th><th>Then</th><th>Status</th></tr></thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule._id}>
                <td>{rule.name}</td>
                <td>{rule.stage}</td>
                <td className="mono">{JSON.stringify(rule.when)}</td>
                <td>{rule.then?.outcome} · {rule.then?.reasonCode}</td>
                <td>{rule.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
