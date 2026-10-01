import { useEffect, useState } from 'react';
import { api, money } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

const STEPS = [
  'Identity', 'Amount and tenor', 'Pricing', 'Repayment', 'Fees and taxes', 'Eligibility',
  'Credit policy', 'Collateral', 'Documents', 'Integrations', 'Workflow', 'Accounting',
  'Servicing and collections', 'Customer presentation',
];

export default function ProductFactoryPage() {
  const [products, setProducts] = useState([]);
  const [code, setCode] = useState('');
  const [product, setProduct] = useState(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', family: 'PERSONAL', structure: 'CONVENTIONAL', minAmount: 50000, maxAmount: 1000000, minTenor: 6, maxTenor: 36 });
  const [simulation, setSimulation] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    api('/api/products?pageSize=50').then((data) => setProducts(data.items || data.products || [])).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  async function create(event) {
    event.preventDefault();
    setError('');
    const data = await api('/api/products', { method: 'POST', body: {
      code: form.code,
      name: form.name,
      family: form.family,
      structure: form.structure,
      currency: 'PKR',
      minAmount: Number(form.minAmount),
      maxAmount: Number(form.maxAmount),
      minTenor: Number(form.minTenor),
      maxTenor: Number(form.maxTenor),
      contractType: form.structure || 'conventional',
      baseRate: 0.2,
    } });
    setCode(data.product?.code || form.code);
    setProduct(data.product);
    setMessage('Draft saved.');
    load();
  }

  async function saveStep() {
    if (!code) return;
    const data = await api(`/api/products/${code}/draft`, { method: 'PATCH', body: { version: product?.version, step: step + 1, summary: form.summary || product?.summary } });
    setProduct(data.product);
    setMessage(`Step ${step + 1} saved.`);
  }

  async function simulate() {
    const data = await api(`/api/products/${code}/simulate`, { method: 'POST', body: { amount: Number(form.maxAmount) || 300000, tenorMonths: Number(form.maxTenor) || 24 } });
    setSimulation(data.kfs);
  }

  async function act(action) {
    setError('');
    try {
      const data = await api(`/api/products/${code}/${action}`, { method: 'POST', body: { reason: 'Single checker publish' } });
      setProduct(data.product);
      setMessage(data.product.status);
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <div>
      <PageTitle kicker="Product factory" title={code || 'New product'} />
      {error && <p className="bad">{error}</p>}
      {message && <p>{message}</p>}
      <label className="field">Open
        <select value={code} onChange={(event) => { setCode(event.target.value); setProduct(products.find((item) => item.code === event.target.value) || null); }}>
          <option value="">New draft</option>
          {products.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.status}</option>)}
        </select>
      </label>
      {!code && (
        <form className="panel" onSubmit={create}>
          <label className="field">Code<input value={form.code || ''} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
          <label className="field">Name<input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <button className="primary" type="submit">Create draft</button>
        </form>
      )}
      {code && (
        <>
          <ol className="steps">{STEPS.map((label, index) => <li key={label}><button type="button" className={index === step ? 'primary' : 'ghost'} onClick={() => setStep(index)}>{index + 1}. {label}</button></li>)}</ol>
          <section className="panel">
            <h2>{STEPS[step]}</h2>
            <p>Completeness {Math.round(((step + 1) / STEPS.length) * 100)}%</p>
            <button className="primary" type="button" onClick={() => saveStep().catch((err) => setError(err.message))}>Save step</button>
          </section>
          <div className="row-actions">
            <button className="ghost" type="button" onClick={() => simulate().catch((err) => setError(err.message))}>Simulate KFS</button>
            <button className="ghost" type="button" onClick={() => act('submit')}>Submit</button>
            <button className="ghost" type="button" onClick={() => act('approve')}>Approve</button>
            <button className="primary" type="button" onClick={() => act('publish')}>Publish</button>
            <button className="ghost" type="button" onClick={() => act('retire')}>Retire</button>
          </div>
          {simulation && <p>{money(simulation.instalment)} · APR {simulation.apr}%</p>}
        </>
      )}
    </div>
  );
}
