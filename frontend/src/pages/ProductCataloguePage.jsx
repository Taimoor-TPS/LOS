import { useEffect, useState } from 'react';
import { api, money, rateLabel } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';
import { useAuth } from '../context/AppState.jsx';

const emptyForm = {
  code: '',
  name: '',
  family: 'conventional',
  contractType: 'conventional',
  summary: '',
  minAmount: '',
  maxAmount: '',
  minTenor: '',
  maxTenor: '',
  baseRate: '',
  feeRate: '',
};

export default function ProductCataloguePage() {
  const { user } = useAuth();
  const canCreate = user?.role === 'system_admin';
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');

  function load() {
    api('/api/products').then((data) => setProducts(data.products));
  }

  useEffect(load, []);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createProduct(event) {
    event.preventDefault();
    setMessage('');
    try {
      const created = await api('/api/products', {
        method: 'POST',
        body: {
          code: form.code.trim(),
          name: form.name.trim(),
          family: form.family,
          contractType: form.contractType.trim(),
          summary: form.summary.trim() || undefined,
          minAmount: Number(form.minAmount),
          maxAmount: Number(form.maxAmount),
          minTenor: Number(form.minTenor),
          maxTenor: Number(form.maxTenor),
          baseRate: Number(form.baseRate),
          feeRate: form.feeRate === '' ? undefined : Number(form.feeRate),
        },
      });
      setForm(emptyForm);
      setMessage(`${created.product.name} is now in the catalogue.`);
      load();
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div>
      <PageTitle kicker="Catalogue" title="Products" />
      {canCreate && (
        <form className="panel" onSubmit={createProduct}>
          <h2>New product</h2>
          <label className="field">Code<input value={form.code} onChange={(event) => setField('code', event.target.value)} required /></label>
          <label className="field">Name<input value={form.name} onChange={(event) => setField('name', event.target.value)} required /></label>
          <label className="field">Family
            <select value={form.family} onChange={(event) => setField('family', event.target.value)}>
              <option value="conventional">Conventional</option>
              <option value="islamic">Islamic</option>
            </select>
          </label>
          <label className="field">Contract type<input value={form.contractType} onChange={(event) => setField('contractType', event.target.value)} required /></label>
          <label className="field">Summary<input value={form.summary} onChange={(event) => setField('summary', event.target.value)} /></label>
          <label className="field">Minimum amount<input type="number" min="1" value={form.minAmount} onChange={(event) => setField('minAmount', event.target.value)} required /></label>
          <label className="field">Maximum amount<input type="number" min="1" value={form.maxAmount} onChange={(event) => setField('maxAmount', event.target.value)} required /></label>
          <label className="field">Minimum tenor (months)<input type="number" min="1" step="1" value={form.minTenor} onChange={(event) => setField('minTenor', event.target.value)} required /></label>
          <label className="field">Maximum tenor (months)<input type="number" min="1" step="1" value={form.maxTenor} onChange={(event) => setField('maxTenor', event.target.value)} required /></label>
          <label className="field">Base rate (decimal, 0.15 = 15%)<input type="number" min="0" step="0.0001" value={form.baseRate} onChange={(event) => setField('baseRate', event.target.value)} required /></label>
          <label className="field">Fee rate (decimal)<input type="number" min="0" step="0.0001" value={form.feeRate} onChange={(event) => setField('feeRate', event.target.value)} /></label>
          <button className="primary" type="submit">Create product</button>
          {message && <p>{message}</p>}
        </form>
      )}
      <div className="kpis">
        {products.map((product) => (
          <article className="kpi" key={product.code}>
            <span>{product.code}</span>
            <b style={{ fontSize: 18 }}>{product.name}</b>
            <div className="muted">{product.family} · {product.contractType} · {product.glPool || product.jurisdiction}</div>
            <div className="muted">{money(product.minAmount, product.currency)} – {money(product.maxAmount, product.currency)} · {product.minTenor}–{product.maxTenor} months</div>
            <div className="mono">{[rateLabel(product.baseRate), product.scorecardId, product.ruleSetId].filter(Boolean).join(' · ')}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
