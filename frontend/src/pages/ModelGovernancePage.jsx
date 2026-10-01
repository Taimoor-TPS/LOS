import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function ModelGovernancePage() {
  const [models, setModels] = useState([]);
  useEffect(() => { api('/api/model-risk').then((data) => setModels(data.models)); }, []);
  return (
    <div>
      <PageTitle kicker="Model risk" title="Model cards" />
      <div className="split">
        {models.map((model) => (
          <article className="panel" key={model.code}>
            <h2>{model.name}</h2>
            <span className={`pill ${model.status === 'champion' ? 'good' : 'warn'}`}>{model.status}</span>
            <p>{model.purpose}</p>
            <p className="muted">{model.limits}</p>
            <p className="mono">Gini {model.metrics?.gini} · KS {model.metrics?.ks} · PSI {model.metrics?.psi}</p>
            <p>{model.fairness}</p>
            <p className="muted">Validator: {model.validator}. {model.monitoring}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
