import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useLocale } from '../../context/AppState.jsx';

export default function CustomerFrame() {
  const { user } = useAuth();
  const { locale, setLocale, dir } = useLocale();
  const location = useLocation();
  const loggedIn = user?.role === 'customer';
  const inWizard = /^\/(apply|verify|decision|key-facts|sign|eligibility|pay|settlement)\//.test(location.pathname);
  return (
    <div className="stage">
      <section className="stage-copy">
        <div>
          <div className="eyebrow">Lending platform</div>
          <h1>From the offer to the last instalment.</h1>
          <p>Check eligibility, apply, sign the key facts, then repay from the same phone. Staff run origination, servicing, collections and the general ledger.</p>
          <div className="stage-steps">
            {['See the product', 'Check eligibility', 'Apply and sign', 'Track the decision', 'Repay the loan'].map((step, index) => (
              <span key={step}><i>{index + 1}</i>{step}</span>
            ))}
          </div>
        </div>
        <div className="eyebrow">Illustrative demo · not a live bank offer</div>
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
