import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth, useLocale } from '../../context/AppState.jsx';

export default function CustomerFrame() {
  const { user } = useAuth();
  const { locale, setLocale, dir } = useLocale();
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const loggedIn = user?.principal === 'CUSTOMER';
  const inWizard = /^\/(apply|documents|review|register|eligibility|pay|offer)\//.test(location.pathname) || location.pathname.startsWith('/register');

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const mobile = sessionStorage.getItem('regMobile') || '';
        const data = await api(`/api/channel/demo/outbox${mobile ? `?mobile=${encodeURIComponent(mobile)}` : ''}`);
        if (alive) setMessages(data.items || []);
      } catch {
        if (alive) setMessages([]);
      }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(id); };
  }, [location.pathname]);

  return (
    <div className="stage">
      <section className="stage-copy">
        <div>
          <div className="eyebrow">Lending platform</div>
          <h1>From the offer to the last instalment.</h1>
          <p>Register, check eligibility, apply, accept the key facts, then repay from the same phone.</p>
        </div>
        <aside className="sms-inbox">
          <button type="button" className="ghost" onClick={() => setOpen((value) => !value)}>{open ? 'Hide SMS inbox' : 'Show SMS inbox'}</button>
          {open && (
            <div>
              {(messages.length ? messages : [{ _id: 'empty', body: 'Codes sent by the bank appear here.' }]).map((row) => (
                <p key={row._id}>{row.body}</p>
              ))}
            </div>
          )}
        </aside>
      </section>
      <div className="device-wrap">
        <div className="device" dir={dir}>
          <div className="status-bar">
            <span>9:41</span>
            <div className="lang">
              {['en', 'ur', 'ar'].map((code) => (
                <button key={code} className={locale === code ? 'on' : ''} onClick={() => setLocale(code)} type="button">{code}</button>
              ))}
            </div>
          </div>
          <div className="device-body">
            <Outlet />
          </div>
          {loggedIn && !inWizard && (
            <nav className="bottom-nav">
              <NavLink to="/home" className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink>
              <NavLink to="/discover" className={({ isActive }) => isActive ? 'active' : ''}>Products</NavLink>
              <NavLink to="/applications" className={({ isActive }) => isActive ? 'active' : ''}>Applications</NavLink>
              <NavLink to="/my-loans" className={({ isActive }) => isActive ? 'active' : ''}>My loans</NavLink>
              <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>Profile</NavLink>
            </nav>
          )}
          <div className="home-bar"><span /></div>
        </div>
      </div>
    </div>
  );
}
