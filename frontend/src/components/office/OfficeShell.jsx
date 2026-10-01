import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_LABEL, api } from '../../api/client.js';
import { useAuth } from '../../context/AppState.jsx';

const NAV = [
  ['Work', '/office', 'Dashboard'],
  ['Work', '/office/queue', 'Work queue'],
  ['Work', '/office/applications', 'Applications'],
  ['Work', '/office/customers', 'Customers'],
  ['Book', '/office/loans', 'Loans'],
  ['Book', '/office/collections', 'Collections'],
  ['Finance', '/office/accounting', 'Accounting'],
  ['Finance', '/office/provisioning', 'Provisioning'],
  ['Finance', '/office/reports', 'Reports'],
  ['Factory', '/office/product-factory', 'Product factory'],
  ['Factory', '/office/configuration', 'Configuration'],
  ['Factory', '/office/access', 'Access control'],
  ['Platform', '/office/integrations', 'Integrations'],
  ['Platform', '/office/audit', 'Audit'],
  ['Platform', '/office/system', 'System'],
];

export default function OfficeShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [meta, setMeta] = useState({ businessDate: '2026-10-01', eodStatus: 'COMPLETE' });
  const [clock, setClock] = useState('');
  const dealer = user?.role === 'dealer';
  const items = dealer ? [['Work', '/office/dealer', 'Dealer counter']] : NAV;
  let lastGroup = '';

  useEffect(() => {
    if (dealer) return undefined;
    api('/api/platform/overview')
      .then((data) => setMeta({ businessDate: data.businessDate, eodStatus: data.eodStatus }))
      .catch(() => {});
    return undefined;
  }, [dealer, location.pathname]);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleString('en-PK', { hour12: false }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (query.trim().length < 3) {
      setHits([]);
      return undefined;
    }
    const handle = setTimeout(() => {
      api(`/api/platform/search?q=${encodeURIComponent(query.trim())}`)
        .then((data) => setHits(data.matches || []))
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="office">
      <header className="topbar">
        <div className="entity">Pakistan retail</div>
        <input
          aria-label="Search CNIC, application or loan account"
          placeholder="CNIC, application no., loan account, mobile"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="spacer">
          <span>Business date {meta.businessDate}</span>
          <span>{user?.name}</span>
        </div>
        {!!hits.length && (
          <div className="search-hits">
            {hits.map((hit) => (
              <a key={hit.loanAccountNo} href={`/office/loans/${hit.loanAccountNo}`} onClick={(event) => { event.preventDefault(); setQuery(''); setHits([]); navigate(`/office/loans/${hit.loanAccountNo}`); }}>
                {hit.loanAccountNo} · {hit.cifName}
              </a>
            ))}
          </div>
        )}
      </header>
      <aside className="side">
        <div className="brand"><small>Lending platform</small><strong>LOS · LMS</strong></div>
        <nav>
          {items.map(([group, to, label]) => {
            const heading = group !== lastGroup ? group : '';
            lastGroup = group;
            return (
              <div key={to}>
                {heading && <div className="nav-group">{heading}</div>}
                <NavLink to={to} end={to === '/office'} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>
              </div>
            );
          })}
        </nav>
        <div className="who">
          <div>{user?.name}</div>
          <div className="muted">{ROLE_LABEL[user?.role] || 'Super Admin'}</div>
          <button className="ghost" type="button" onClick={async () => { await logout(); navigate('/office/login'); }}>Sign out</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
      <footer className="statusbar">
        <span>UAT</span>
        <span>EOD {meta.eodStatus}</span>
        <span>{clock}</span>
        <span>Standalone GL</span>
      </footer>
    </div>
  );
}

export function PageTitle({ kicker, title, children }) {
  return (
    <div className="main-top">
      <div>
        {kicker && <div className="eyebrow">{kicker}</div>}
        <h1>{title}</h1>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
