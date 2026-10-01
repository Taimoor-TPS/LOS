import { useState } from 'react';
import { api, money, rateLabel } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

const STEPS = [
  'Identity',
  'Amount and tenor',
  'Pricing',
  'Repayment',
  'Fees and taxes',
  'Eligibility',
  'Credit policy',
  'Collateral',
  'Documents',
  'Integrations',
  'Workflow',
  'Accounting',
  'Servicing and collections',
  'Customer presentation',
];

export default function ProductFactoryPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    productCode: 'PF-SAL-GOV',
    name: 'Personal finance — salaried government',
    family: 'Personal finance',
    structure: 'Conventional',
    currency: 'PKR',
    amount: 500000,
    tenorMonths: 36,
    rate: 0.2,
    minAge: 21,
    maxAge: 60,
    dbrCap: 40,
  });
  const [simulation, setSimulation] = useState(null);
  const [error, setError] = useState('');

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function simulate() {
    setError('');
    try {
      const body = await api('/api/platform/products/simulate', { method: 'POST', body: form });
      setSimulation(body.simulation);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageTitle kicker="Versioned product" title="Product factory">
        <button className="primary" type="button" onClick={simulate}>Simulate key facts</button>
      </PageTitle>
      <div className="wizard">
        <ol>
          {STEPS.map((label, index) => (
            <li key={label} className={index === step ? 'on' : ''}>
              <button type="button" className="quiet" onClick={() => setStep(index)}>{index + 1}. {label}</button>
            </li>
          ))}
        </ol>
        <section className="panel">
          <h2>Step {step + 1} — {STEPS[step]}</h2>
          {step === 0 && (
            <>
              <div className="field"><label>Product code</label><input value={form.productCode} onChange={(event) => set('productCode', event.target.value)} /></div>
              <div className="field"><label>Name</label><input value={form.name} onChange={(event) => set('name', event.target.value)} /></div>
              <div className="field"><label>Family</label><input value={form.family} onChange={(event) => set('family', event.target.value)} /></div>
              <p className="muted">Conventional or Islamic, segment, currency, channels and the regulatory regime are stored on the product version.</p>
            </>
          )}
          {step === 1 && (
            <>
              <div className="field"><label>Sample amount</label><input value={form.amount} onChange={(event) => set('amount', Number(event.target.value))} /></div>
              <div className="field"><label>Tenor (months)</label><input value={form.tenorMonths} onChange={(event) => set('tenorMonths', Number(event.target.value))} /></div>
            </>
          )}
          {step === 2 && (
            <div className="field"><label>Annual rate</label><input value={form.rate} onChange={(event) => set('rate', Number(event.target.value))} /></div>
          )}
          {step === 5 && (
            <>
              <div className="field"><label>Minimum age</label><input value={form.minAge} onChange={(event) => set('minAge', Number(event.target.value))} /></div>
              <div className="field"><label>DBR cap %</label><input value={form.dbrCap} onChange={(event) => set('dbrCap', Number(event.target.value))} /></div>
            </>
          )}
          {step !== 0 && step !== 1 && step !== 2 && step !== 5 && (
            <p className="muted">
              This step is part of the published product version: {STEPS[step].toLowerCase()}. The simulator uses the amount, tenor and rate already captured. Islamic late-payment amounts are mapped to charity payable, not income.
            </p>
          )}
          <div className="actions">
            <button className="ghost" type="button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>Back</button>
            <button className="primary" type="button" disabled={step === STEPS.length - 1} onClick={() => setStep((value) => value + 1)}>Next</button>
          </div>
          {error && <p className="chip bad">{error}</p>}
          {simulation && (
            <div className="banner" style={{ marginTop: 12 }}>
              <b>{simulation.productCode}</b> indicative instalment {money(simulation.instalment)} · APR {simulation.apr}% · fee {money(simulation.fee)}
              <div>Rate {rateLabel(simulation.rate)} · total payable {money(simulation.totalPayable)}</div>
              <div className="muted">Labelled indicative. The offer locks pricing when it is generated.</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
