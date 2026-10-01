import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

export default function ReportsDeskPage() {
  const [items, setItems] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/api/reports?pageSize=50').then((data) => setItems(data.items || [])).catch((err) => setError(err.message));
  }, []);
  async function run(id) {
    setResult(await api(`/api/reports/${id}/run`, { method: 'POST', body: {} }));
  }
  return (
    <div>
      <PageTitle kicker="From stored definitions" title="Reports" />
      {error && <p className="bad">{error}</p>}
      <table>
        <thead><tr><th>Code</th><th>Name</th><th>Source</th><th></th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id}>
              <td>{item.code}</td>
              <td>{item.name}</td>
              <td>{item.dataSource}</td>
              <td><button className="ghost" type="button" onClick={() => run(item._id)}>Run</button></td>
            </tr>
          ))}
          {!items.length && <tr><td>No report definitions yet.</td></tr>}
        </tbody>
      </table>
      {result && <p>{result.total} rows</p>}
    </div>
  );
}
