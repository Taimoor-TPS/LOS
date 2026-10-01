import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api('/api/compliance/audit').then((data) => setLogs(data.logs)); }, []);
  return (
    <div>
      <PageTitle kicker="Immutable" title="Audit trail" />
      <section className="panel">
        <table>
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Resource</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id}>
                <td className="mono">{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.actorName}<div className="muted">{log.actorRole}</div></td>
                <td>{log.action}</td>
                <td>{log.resource}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
