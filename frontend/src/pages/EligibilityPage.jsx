import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api/client.js';

export default function EligibilityPage() {
  const [form, setForm] = useState({
    employmentType: 'Salaried-Govt',
    netMonthlyIncome: 150000,
    employer: 'Government of Pakistan',
    city: 'Karachi',
    existingObligations: 25000,
    requestedAmount: 500000,
    tenorMonths: 36,
    age: 32,
    idNumber: '421010000000001',
    annualRate: 0.2,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const body = await api('/api/platform/eligibility', { method: 'POST', body: form });
      setResult(body);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2 className="display">Quick eligibility</h2>
      <p className="muted">This is a soft check. It does not place a hard bureau enquiry.</p>
      <form onSubmit={submit}>
        <label className="field">Employment
          <select value={form.employmentType} onChange={(event) => set('employmentType', event.target.value)}>
            <option>Salaried-Govt</option>
            <option>Salaried-Private</option>
            <option>Self-employed</option>
          </select>
        </label>
        <label className="field">Monthly income<input value={form.netMonthlyIncome} onChange={(event) => set('netMonthlyIncome', Number(event.target.value))} /></label>
        <label className="field">Employer<input value={form.employer} onChange={(event) => set('employer', event.target.value)} /></label>
        <label className="field">City<input value={form.city} onChange={(event) => set('city', event.target.value)} /></label>
        <label className="field">Existing obligations<input value={form.existingObligations} onChange={(event) => set('existingObligations', Number(event.target.value))} /></label>
        <label className="field">ID number<input value={form.idNumber} onChange={(event) => set('idNumber', event.target.value)} /></label>
        <button className="primary" type="submit">Check</button>
      </form>
      {error && <p className="bad pill">{error}</p>}
      {result && (
        <article className="card">
          <b>{result.eligibility.outcome === 'LIKELY_ELIGIBLE' ? 'Likely eligible' : result.eligibility.outcome === 'UNDER_REVIEW' ? 'Need a review' : 'Not eligible'}</b>
          {result.eligibility.eligible && <p>Up to {money(result.eligibility.indicativeLimit)} · instalment {money(result.eligibility.proposedInstalment)}</p>}
          {result.eligibility.reasons.map((reason) => <p key={reason} className="muted">{reason}</p>)}
          <p className="muted">Debt burden {result.eligibility.dbr ?? '—'}% against a {result.eligibility.dbrCap}% cap.</p>
          {result.eligibility.eligible && <Link className="primary" to="/discover">Continue to products</Link>}
        </article>
      )}
    </div>
  );
}
