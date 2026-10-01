import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AppState.jsx';

const NAV = [
  ['Work', '/office', 'Dashboard', 'dashboard:view'],
  ['Work', '/office/queue', 'Work queue', 'application:view'],
  ['Work', '/office/applications', 'Applications', 'application:view'],
  ['Work', '/office/customers', 'Customers', 'customer:view'],
  ['Book', '/office/loans', 'Loans', 'loan:view'],
  ['Book', '/office/collections', 'Collections', 'collection:view'],
  ['Finance', '/office/accounting', 'Accounting', 'gl:view'],
  ['Finance', '/office/provisioning', 'Provisioning', 'provision:view'],
  ['Finance', '/office/reports', 'Reports', 'report:view'],
  ['Factory', '/office/product-factory', 'Product factory', 'product:view'],
  ['Configure', '/office/fields', 'Fields', 'config:view'],
  ['Configure', '/office/forms', 'Forms', 'config:view'],
  ['Configure', '/office/rules', 'Rules', 'config:view'],
  ['Configure', '/office/workflows', 'Workflows', 'config:view'],
  ['Configure', '/office/scorecards', 'Scorecards', 'config:view'],
  ['Configure', '/office/masters', 'Master data', 'config:view'],
  ['Configure', '/office/templates', 'Templates', 'config:view'],
  ['Configure', '/office/configuration', 'Parameters', 'config:view'],
  ['Configure', '/office/escalations', 'Escalations', 'config:view'],
  ['Configure', '/office/organisation', 'Organisation', 'config:view'],
  ['Access', '/office/access', 'Users, roles and SoD', 'rbac:view'],
  ['Platform', '/office/integrations', 'Integrations', 'integration:view_logs'],
  ['Platform', '/office/audit', 'Audit', 'audit:view'],
  ['Platform', '/office/system', 'System', 'gl:view'],
];

const EXTENDED = [
  ['Extended', '/office/campaigns', 'Campaigns'],
  ['Extended', '/office/dealer', 'Dealer counter'],
  ['Extended', '/office/schemes', 'Schemes'],
  ['Extended', '/office/models', 'Model governance'],
  ['Extended', '/office/shariah', 'Shariah desk'],
  ['Extended', '/office/warnings', 'Early warning'],
  ['Extended', '/office/analytics', 'MIS analytics'],
  ['Extended', '/office/regulatory', 'Regulatory packs'],
  ['Extended', '/office/rm', 'Relationship manager'],
];

export default function OfficeShell() {
  const { user, logout, permissions } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [meta, setMeta] = useState({ businessDate: '', eodStatus: '' });
  const [clock, setClock] = useState('');
  const extended = import.meta.env.VITE_FEATURES_EXTENDED === 'true';
  const items = [...NAV, ...(extended ? EXTENDED : [])].filter((row) => !row[3] || permissions.includes(row[3]));
  let lastGroup = '';

  useEffect(() => {
    api('/api/dashboard')
      .then((data) => setMeta({ businessDate: data.businessDate || '', eodStatus: 'from journals' }))
      .catch(() => {});
  }, [location.pathname]);

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
      api(`/api/dashboard/search?q=${encodeURIComponent(query.trim())}`)
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
              <a key={`${hit.type}-${hit.id}`} href="#result" onClick={(event) => {
                event.preventDefault();
                setQuery('');
                setHits([]);
                navigate(hit.type === 'loan' ? `/office/loans/${hit.label}` : hit.type === 'application' ? `/office/workbench/${hit.id}` : `/office/customers/${hit.id}`);
              }}>
                {hit.label}
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
          <div className="muted">{user?.username || 'Staff'}</div>
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
