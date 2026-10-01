import { useState } from 'react';
import { api } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function ConfigurationEnginePage() {
  const [form, setForm] = useState({ key: 'regulatory.dbr', jurisdiction: 'PK', segment: 'salaried', productCode: 'PF-SAL', channel: 'app' });
  const [resolved, setResolved] = useState(null);

  async function resolve(event) {
    event.preventDefault();
    const query = new URLSearchParams(form).toString();
    setResolved(await api(`/api/configuration/resolve?${query}`));
  }

  return (
    <div>
      <PageTitle kicker="Inheritance" title="Configuration engine" />
      <form className="panel" onSubmit={resolve}>
        {Object.entries(form).map(([key, value]) => (
          <label className="field" key={key}>{key}<input value={value} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>
        ))}
        <button className="primary" type="submit">Resolve</button>
      </form>
      {resolved && (
        <div className="split">
          <section className="panel">
            <h2>Resolved value</h2>
            <pre className="mono">{JSON.stringify(resolved.value, null, 2)}</pre>
          </section>
          <section className="panel chain">
            <h2>Layers, general to specific</h2>
            {resolved.chain.map((layer) => (
              <article key={layer.id}><b>{layer.level}</b> v{layer.version}<div className="mono">{JSON.stringify(layer.value)}</div></article>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
