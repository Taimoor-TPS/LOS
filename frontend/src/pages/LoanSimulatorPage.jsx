import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, money, rateLabel } from '../api/client.js';

export default function LoanSimulatorPage() {
  const { productCode } = useParams();
  const [params] = useSearchParams();
  const [product, setProduct] = useState(null);
  const [amount, setAmount] = useState(Number(params.get('amount') || 800000));
  const [tenor, setTenor] = useState(36);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/products/${productCode}`).then((data) => {
      setProduct(data.product);
      setAmount((current) => Math.min(data.product.maxAmount, Math.max(data.product.minAmount, current || data.product.minAmount)));
      setTenor((current) => Math.min(data.product.maxTenor, Math.max(data.product.minTenor, current)));
    }).catch((err) => setError(err.message));
  }, [productCode]);

  useEffect(() => {
    if (!product) return;
    const handle = setTimeout(() => {
      api('/api/products/quote', { method: 'POST', body: { productCode, amount, tenorMonths: tenor } })
        .then((data) => { setQuote(data); setError(''); })
        .catch((err) => setError(err.message));
    }, 200);
    return () => clearTimeout(handle);
  }, [product, productCode, amount, tenor]);

  if (!product) return <p className="muted">Preparing the calculator…</p>;
  const comfort = quote?.affordability?.pass ? 'Inside your comfort zone' : 'This instalment is tight';
  const headroom = quote?.affordability?.dbr != null ? Math.max(0, Math.min(100, (1 - quote.affordability.dbr / quote.affordability.maxDbr) * 100)) : 40;

  return (
    <div>
      <div className="eyebrow">{product.family === 'islamic' ? 'Islamic' : 'Conventional'}</div>
      <h2 className="display" style={{ marginTop: 4 }}>{product.name}</h2>
      <p className="muted">{product.summary}</p>
      <div className="card">
        <div className="row"><span>Amount</span><b>{money(amount, product.currency)}</b></div>
        <input className="slider" type="range" min={product.minAmount} max={product.maxAmount} step={product.maxAmount > 500000 ? 10000 : 1000} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        <div className="row" style={{ marginTop: 12 }}><span>Tenor</span><b>{tenor} months</b></div>
        <input className="slider" type="range" min={product.minTenor} max={product.maxTenor} step={1} value={tenor} onChange={(event) => setTenor(Number(event.target.value))} />
      </div>
      {quote && (
        <div className="card">
          <div className="muted">Estimated instalment · {quote.rateLabel} {rateLabel(quote.rate)}</div>
          <div className="amount">{money(quote.instalment, product.currency)}</div>
          <div className={`pill ${quote.affordability.pass ? 'good' : 'warn'}`}>{comfort}</div>
          <div className="meter" style={{ marginTop: 12 }}><span style={{ width: `${headroom}%` }} /></div>
          <div className="facts" style={{ marginTop: 12 }}>
            <div className="fact">Total payable<b>{money(quote.totalPayable, product.currency)}</b></div>
            <div className="fact">Fees<b>{money(quote.fee, product.currency)}</b></div>
            <div className="fact">Total cost<b>{money(quote.totalCost, product.currency)}</b></div>
            <div className="fact">{quote.affordability.mode === 'cashflow' ? 'Cover' : 'DBR'}<b>{quote.affordability.mode === 'cashflow' ? `${quote.affordability.cover}x` : `${Math.round(quote.affordability.dbr * 100)}%`}</b></div>
          </div>
          <p className="muted">{quote.disclaimer}</p>
        </div>
      )}
      {!!quote?.comparisons?.length && (
        <div className="card">
          <h3>Compare</h3>
          {quote.comparisons.map((item) => (
            <div className="row" key={item.code} style={{ marginTop: 8 }}>
              <Link to={`/simulate/${item.code}?amount=${amount}`}>{item.name}</Link>
              <span>{money(item.instalment, product.currency)}</span>
            </div>
          ))}
        </div>
      )}
      {error && <p className="bad pill">{error}</p>}
      <Link className="primary" to={`/apply/${productCode}?amount=${amount}&tenor=${tenor}&offer=${params.get('offer') || ''}`}>Continue with this</Link>
    </div>
  );
}
