import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function RegulatoryPacksPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api('/api/configuration?key=regulatory.dbr').then((data) => setRows(data.entries.filter((entry) => entry.status === 'active'))); }, []);
  return (
    <div>
      <PageTitle kicker="Parameter packs" title="Regulatory configuration" />
      <p className="muted">These numbers are illustrative and versioned. A live bank replaces them from the current SBP, SAMA or CBUAE circular without a code release.</p>
      <div className="chain">
        {rows.map((entry) => (
          <article key={entry._id}>
            <b>{entry.scope.level}</b> {entry.scope.jurisdiction || entry.scope.productCode || entry.scope.tenantId || 'default'}
            <div className="mono">max DBR {entry.value.maxDbr ?? 'inherits'} · min age {entry.value.minAge ?? 'inherits'} · {entry.value.authority || entry.value.packName || ''}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
