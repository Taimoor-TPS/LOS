import { useEffect, useState } from 'react';
import { api, money } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function SchemeManagementPage() {
  const [schemes, setSchemes] = useState([]);
  useEffect(() => { api('/api/schemes').then((data) => setSchemes(data.schemes)); }, []);
  return (
    <div>
      <PageTitle kicker="Schemes" title="Guarantee and support templates" />
      {schemes.map((scheme) => (
        <article className="panel" key={scheme.code}>
          <h2>{scheme.name}</h2>
          <p>{scheme.eligibilityNote}</p>
          <p className="mono">{scheme.authority} · cover {scheme.coveragePercent}% · cap {money(scheme.maxAmount)} · {scheme.illustrative ? 'illustrative' : 'live'}</p>
        </article>
      ))}
    </div>
  );
}
