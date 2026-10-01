import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

export default function IntegrationsDeskPage() {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  function load() {
    api('/api/integrations/config').then((data) => setItems(data.items || [])).catch((err) => setError(err.message));
    api('/api/integrations/logs?pageSize=20').then((data) => setLogs(data.items || [])).catch(() => {});
  }
  useEffect(load, []);
  return (
    <div>
      <PageTitle kicker="Adapter configuration" title="Integrations" />
      {error && <p className="bad">{error}</p>}
      <table>
        <thead><tr><th>Code</th><th>Mode</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id}>
              <td>{item.code}</td>
              <td>{item.implementation || item.mode}</td>
              <td>{item.status}</td>
              <td><button className="ghost" type="button" onClick={async () => { setResult(await api(`/api/integrations/config/${item._id}/test`, { method: 'POST', body: { cnic: '421010000000001' } })); load(); }}>Test</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
      <h2>Call log</h2>
      <ul>{logs.map((row) => <li key={row._id}>{row.code} · {row.status}</li>)}</ul>
    </div>
  );
}
