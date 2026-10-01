import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api/client.js';
import { useLocale } from '../context/AppState.jsx';

export default function DiscoverPage() {
  const { t } = useLocale();
  const [customer, setCustomer] = useState(null);
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [family, setFamily] = useState('all');

  useEffect(() => {
    api('/api/customers/me').then((data) => setCustomer(data.customer));
    api('/api/products').then((data) => setProducts(data.products || []));
    api('/api/engagement/offers/mine').then(async (data) => {
      setOffers(data.offers);
      await Promise.all(data.offers.map((offer) => api(`/api/engagement/offers/${offer._id}/view`, { method: 'POST', body: {} }).catch(() => null)));
    });
  }, []);

  const visible = offers.filter((offer) => family === 'all' || offer.product?.family === family);
  const catalogue = products.filter((product) => family === 'all' || product.family === family);
  const first = customer?.fullName?.split(' ')[0] || '';

  return (
    <div>
      <div className="eyebrow">{t('hello')}</div>
      <h2 className="display" style={{ fontSize: 34, margin: '4px 0 12px' }}>{first}</h2>
      {customer?.salaryMonths >= 12 && <p className="muted">Salary has landed for {customer.salaryMonths} months. That is why this limit is open.</p>}
      <div className="chips">
        {['all', 'conventional', 'islamic'].map((item) => (
          <button key={item} className={family === item ? 'on' : ''} type="button" onClick={() => setFamily(item)}>
            {item === 'all' ? 'All' : t(item)}
          </button>
        ))}
      </div>
      {visible.map((offer) => (
        <article className="hero" key={offer._id} style={{ marginBottom: 12 }}>
          <div>
            <div className="kicker">{t('forYou')}</div>
            <h2>{offer.product?.name}</h2>
            <p>{offer.message}</p>
          </div>
          <div>
            <div className="amount">{money(offer.limit, offer.currency)}</div>
            <Link className="primary" to={`/simulate/${offer.productCode}?offer=${offer._id}&amount=${Math.min(offer.limit, offer.product?.defaultAmount || 800000)}`}>{t('seeCost')}</Link>
          </div>
        </article>
      ))}
      {!visible.length && <p className="muted">No pre-approved offer in this stream. The catalogue is still open.</p>}
      <div className="eyebrow" style={{ marginTop: 8 }}>Catalogue</div>
      {catalogue.map((product) => (
        <article className="card" key={product.code}>
          <div className="row">
            <b>{product.name}</b>
            {product.family === 'islamic' && <span className="pill islamic">Islamic</span>}
          </div>
          <p className="muted">{product.summary}</p>
          <div className="muted">Up to {money(product.maxAmount, product.currency)} · {product.minTenor} to {product.maxTenor} months</div>
          <Link className="primary" to={`/simulate/${product.code}?amount=${product.defaultAmount || product.minAmount}`}>Calculate</Link>
          <Link className="ghost" to="/eligibility">Check eligibility</Link>
        </article>
      ))}
      <Link className="ghost" to="/grow">Ideas after good repayment</Link>
    </div>
  );
}
