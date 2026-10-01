import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, apiUpload, money, text } from '../../api/client.js';
import { useAuth, useLocale } from '../../context/AppState.jsx';
import { DynamicForm } from '../../components/common/widgets.jsx';

function useSession(key, initial) {
  const [value, setValue] = useState(() => sessionStorage.getItem(key) || initial);
  function update(next) {
    sessionStorage.setItem(key, next);
    setValue(next);
  }
  return [value, update];
}

export function WelcomePage() {
  const { setLocale, locale } = useLocale();
  return (
    <div className="sheet">
      <h1>Welcome</h1>
      <p>Open an account or sign in to continue an application.</p>
      <div className="lang">
        {['en', 'ur', 'ar'].map((code) => <button key={code} className={locale === code ? 'on' : ''} type="button" onClick={() => setLocale(code)}>{code}</button>)}
      </div>
      <Link className="primary" to="/register">Create account</Link>
      <Link className="ghost" to="/signin">Sign in</Link>
    </div>
  );
}

export function RegisterPage() {
  const [mobile, setMobile] = useState('');
  const [cnic, setCnic] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [, setRegistration] = useSession('registrationId', '');
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    try {
      const data = await api('/api/channel/register/start', { method: 'POST', body: { mobile, cnic, consent: true } });
      setRegistration(data.registrationId);
      sessionStorage.setItem('regMobile', mobile);
      navigate('/register/otp');
    } catch (err) { setError(err.message); }
  }
  return (
    <form className="sheet" onSubmit={submit}>
      <h1>Create account</h1>
      <label className="field">Mobile<input value={mobile} placeholder="03XXXXXXXXX" onChange={(event) => setMobile(event.target.value)} /></label>
      <label className="field">Identity number<input value={cnic} placeholder="#####-#######-#" onChange={(event) => setCnic(event.target.value)} /></label>
      <label className="check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I agree to the terms</label>
      {error && <p className="bad">{error}</p>}
      <button className="primary" type="submit" disabled={!consent}>Send code</button>
    </form>
  );
}

export function OtpPage() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [registrationId] = useSession('registrationId', '');
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    try {
      await api('/api/channel/register/verify-otp', { method: 'POST', body: { registrationId, otp } });
      navigate('/register/identity');
    } catch (err) { setError(err.message); }
  }
  return (
    <form className="sheet" onSubmit={submit}>
      <h1>Enter the code</h1>
      <p className="muted">The code is in the SMS inbox beside the phone.</p>
      <label className="field">Code<input value={otp} onChange={(event) => setOtp(event.target.value)} /></label>
      {error && <p className="bad">{error}</p>}
      <button className="primary" type="submit">Verify</button>
      <button className="ghost" type="button" onClick={() => api('/api/channel/register/resend', { method: 'POST', body: { registrationId } })}>Resend</button>
    </form>
  );
}

export function IdentityPage() {
  const [info, setInfo] = useState(null);
  const [residenceType, setResidence] = useState('Owned');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [registrationId] = useSession('registrationId', '');
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    try {
      const data = await api('/api/channel/register/identity', { method: 'POST', body: { registrationId, email: email || undefined, addressConfirmed: true, residenceType } });
      setInfo(data.identity);
    } catch (err) { setError(err.message); }
  }
  return (
    <form className="sheet" onSubmit={info ? (event) => { event.preventDefault(); navigate('/register/password'); } : submit}>
      <h1>Confirm identity</h1>
      {info && (
        <article className="panel">
          <p>{info.fullName}</p>
          <p>{info.fatherName}</p>
          <p>{info.dateOfBirth}</p>
          <p>{info.address}</p>
        </article>
      )}
      {!info && (
        <>
          <label className="field">Email (optional)<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="field">Residence
            <select value={residenceType} onChange={(event) => setResidence(event.target.value)}>
              <option>Owned</option><option>Rented</option><option>Family</option>
            </select>
          </label>
        </>
      )}
      {error && <p className="bad">{error}</p>}
      <button className="primary" type="submit">{info ? 'Set a password' : 'Verify'}</button>
    </form>
  );
}

export function PasswordPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [registrationId] = useSession('registrationId', '');
  const { setUser } = useAuth();
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    try {
      const data = await api('/api/channel/register/password', { method: 'POST', body: { registrationId, password } });
      setUser(data.user);
      navigate('/home');
    } catch (err) { setError(err.message); }
  }
  return (
    <form className="sheet" onSubmit={submit}>
      <h1>Set a password</h1>
      <label className="field">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <p className="bad">{error}</p>}
      <button className="primary" type="submit">Finish</button>
    </form>
  );
}

export function SignInPage() {
  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    try {
      const data = await api('/api/channel/login', { method: 'POST', body: { identifier, secret } });
      setUser(data.user);
      navigate('/home');
    } catch (err) { setError(err.message); }
  }
  return (
    <form className="sheet" onSubmit={submit}>
      <h1>Sign in</h1>
      <label className="field">Mobile or identity number<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} /></label>
      <label className="field">Password or MPIN<input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} /></label>
      {error && <p className="bad">{error}</p>}
      <button className="primary" type="submit">Sign in</button>
    </form>
  );
}

export function HomePage() {
  const [data, setData] = useState({ applications: [], loans: [], notifications: [] });
  useEffect(() => {
    Promise.all([
      api('/api/channel/applications'),
      api('/api/channel/loans'),
      api('/api/channel/notifications'),
    ]).then(([applications, loans, notifications]) => setData({
      applications: applications.items || [],
      loans: loans.items || [],
      unread: notifications.unread || 0,
    })).catch(() => {});
  }, []);
  const application = data.applications[0];
  const loan = data.loans[0];
  return (
    <div className="sheet">
      <h1>Home</h1>
      <Link to="/notifications">Notifications {data.unread ? `(${data.unread})` : ''}</Link>
      {application && <article className="panel"><strong>{application.reference}</strong><p>{application.stage}</p><Link to={`/track/${application._id}`}>Track</Link></article>}
      {loan && <article className="panel"><strong>{loan.loanAccountNo}</strong><p>Next due {loan.firstDueDate}</p><Link to={`/pay/${loan._id}`}>Pay</Link></article>}
      <Link className="primary" to="/discover">Browse products</Link>
    </div>
  );
}

export function DiscoverPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { api('/api/channel/products').then((data) => setItems(data.items || [])).catch(() => {}); }, []);
  return (
    <div className="sheet">
      <h1>Products</h1>
      {items.map((product) => (
        <Link key={product.code} className="panel" to={`/product/${product.code}`}>
          <strong>{text(product.name)}</strong>
          <p>{product.presentation?.shortDescription || product.summary}</p>
        </Link>
      ))}
    </div>
  );
}

export function ProductPage() {
  const { code } = useParams();
  const [product, setProduct] = useState(null);
  const [amount, setAmount] = useState(0);
  const [tenor, setTenor] = useState(0);
  const [quote, setQuote] = useState(null);
  useEffect(() => {
    api(`/api/channel/products/${code}`).then((data) => {
      setProduct(data.product);
      setAmount(data.product.minAmount);
      setTenor(data.product.minTenor);
    }).catch(() => {});
  }, [code]);
  useEffect(() => {
    if (!product || !amount || !tenor) return undefined;
    const handle = setTimeout(() => {
      api(`/api/channel/products/${code}/calculate`, { method: 'POST', body: { amount: Number(amount), tenorMonths: Number(tenor) } }).then(setQuote).catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [amount, tenor, code, product]);
  if (!product) return <p>Loading…</p>;
  return (
    <div className="sheet">
      <h1>{text(product.name)}</h1>
      <p>{product.summary}</p>
      <label className="field">Amount<input type="range" min={product.minAmount} max={product.maxAmount} step={product.amountStep || 5000} value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label>
      <label className="field">Tenor<input type="range" min={product.minTenor} max={product.maxTenor} step={product.tenorStep || 6} value={tenor} onChange={(event) => setTenor(Number(event.target.value))} /></label>
      {quote && <p>{money(quote.instalment)} / month · APR {quote.apr}%</p>}
      <Link className="primary" to={`/eligibility/${code}`}>Check eligibility</Link>
    </div>
  );
}

export function EligibilityPage() {
  const { code } = useParams();
  const [income, setIncome] = useState('');
  const [obligations, setObligations] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    try {
      setResult(await api('/api/channel/eligibility', { method: 'POST', body: { productCode: code, employmentType: 'salaried', netMonthlyIncome: Number(income), existingObligations: Number(obligations || 0), requestedAmount: 300000, tenorMonths: 24 } }));
    } catch (err) { setError(err.message); }
  }
  return (
    <form className="sheet" onSubmit={submit}>
      <h1>Quick eligibility</h1>
      <label className="field">Net monthly income<input value={income} onChange={(event) => setIncome(event.target.value)} /></label>
      <label className="field">Existing obligations<input value={obligations} onChange={(event) => setObligations(event.target.value)} /></label>
      {error && <p className="bad">{error}</p>}
      {result && <p>{result.outcome || (result.eligible ? 'Likely eligible' : 'Not eligible')} {result.reasons?.join(' ')}</p>}
      <button className="primary" type="submit">Check</button>
      <Link to={`/apply/${code}`}>Start application</Link>
    </form>
  );
}

export function ApplyPage() {
  const { code } = useParams();
  const [application, setApplication] = useState(null);
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [attributes, setAttributes] = useState({});
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    const key = `draft-${code}`;
    const existing = sessionStorage.getItem(key);
    const start = existing
      ? api(`/api/channel/applications/${existing}`).then((data) => data.application)
      : api('/api/channel/applications', { method: 'POST', body: { productCode: code } }).then((data) => {
        sessionStorage.setItem(key, data.application._id);
        return data.application;
      });
    start
      .then((application) => {
        setApplication(application);
        setAttributes(application.attributes || {});
        return api(`/api/channel/forms/${code}/S0`);
      })
      .then((data) => { setForm(data.form); setFields(data.fields || []); })
      .catch((err) => setError(err.message));
  }, [code]);
  async function save(event) {
    event.preventDefault();
    await api(`/api/channel/applications/${application._id}`, { method: 'PATCH', body: { attributes } });
    navigate(`/documents/${application._id}`);
  }
  if (error) return <p className="bad">{error}</p>;
  if (!form) return <p>Loading the form…</p>;
  return (
    <form className="sheet" onSubmit={save}>
      <h1>Application</h1>
      <DynamicForm sections={form.sections || []} fields={fields} value={attributes} onChange={setAttributes} />
      <button className="primary" type="submit">Save and continue</button>
    </form>
  );
}

export function DocumentsPage() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [required, setRequired] = useState([]);
  const navigate = useNavigate();
  function load() { api(`/api/channel/applications/${id}/documents`).then((data) => setItems(data.items || [])); }
  useEffect(() => {
    load();
    api(`/api/channel/applications/${id}`).then((data) => api(`/api/channel/products/${data.application.productCode}`)).then((data) => setRequired(data.product.documentRequirements || [])).catch(() => {});
  }, [id]);
  async function upload(code, file) {
    const body = new FormData();
    body.append('file', file);
    body.append('code', code);
    body.append('label', code);
    await apiUpload(`/api/channel/applications/${id}/documents`, body);
    load();
  }
  return (
    <div className="sheet">
      <h1>Documents</h1>
      {(required.length ? required : [{ code: 'CNIC', label: 'Identity card' }]).map((doc) => (
        <label className="field" key={doc.code}>{doc.label || doc.code}
          <input type="file" accept="image/*,application/pdf" capture="environment" onChange={(event) => event.target.files[0] && upload(doc.code, event.target.files[0])} />
        </label>
      ))}
      <ul>{items.map((item) => <li key={item._id}>{item.code}: {item.status} {item.rejectReason}</li>)}</ul>
      <button className="primary" type="button" onClick={() => navigate(`/review/${id}`)}>Review</button>
    </div>
  );
}

export function ReviewPage() {
  const { id } = useParams();
  const [error, setError] = useState('');
  const navigate = useNavigate();
  async function submit() {
    try {
      await api(`/api/channel/applications/${id}/submit`, { method: 'POST', body: { consents: [
        { purpose: 'bureau', textVersion: 'v1' },
        { purpose: 'terms', textVersion: 'v1' },
        { purpose: 'mandate', textVersion: 'v1' },
      ] } });
      navigate(`/track/${id}`);
    } catch (err) { setError(err.message); }
  }
  return (
    <div className="sheet">
      <h1>Review and consent</h1>
      <p>Bureau inquiry, data sharing, terms and the auto-debit mandate.</p>
      {error && <p className="bad">{error}</p>}
      <button className="primary" type="button" onClick={submit}>Submit</button>
    </div>
  );
}

export function TrackPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  useEffect(() => { api(`/api/channel/applications/${id}`).then(setData).catch(() => {}); }, [id]);
  if (!data) return <p>Loading…</p>;
  const action = (data.documents || []).find((doc) => doc.status === 'REJECTED');
  return (
    <div className="sheet">
      <h1>Tracker</h1>
      {action && <article className="panel"><strong>Action needed</strong><p>Upload {action.code} again. {action.rejectReason}</p><Link to={`/documents/${id}`}>Upload</Link></article>}
      <ol>{(data.history || []).map((row) => <li key={row._id}>{row.customerMilestone || row.outcome} · {row.at ? new Date(row.at).toLocaleString() : ''}</li>)}</ol>
      {data.application?.status === 'APPROVED' && <Link to={`/offer/${id}`}>Open the offer</Link>}
      {data.application?.status === 'DISBURSED' && <Link to={`/funds/${id}`}>Funds sent</Link>}
    </div>
  );
}

export function OfferPage() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useEffect(() => { api(`/api/channel/applications/${id}`).then((data) => setApplication(data.application)).catch((err) => setError(err.message)); }, [id]);
  const offer = application?.offer;
  async function accept(event) {
    event.preventDefault();
    try {
      const data = await api(`/api/channel/applications/${id}/offer/accept`, { method: 'POST', body: sent ? { otp } : {} });
      if (data.otpSent) setSent(true);
      else navigate(`/track/${id}`);
    } catch (err) { setError(err.message); }
  }
  if (!offer) return <p>{error || 'Loading the offer…'}</p>;
  return (
    <form className="sheet" onSubmit={accept}>
      <h1>Key facts</h1>
      <p>{money(offer.amount)} · {offer.tenorMonths} months · {money(offer.instalment)} · APR {offer.apr}%</p>
      {sent && <label className="field">Code from SMS<input value={otp} onChange={(event) => setOtp(event.target.value)} /></label>}
      {error && <p className="bad">{error}</p>}
      <button className="primary" type="submit">{sent ? 'Confirm' : 'Accept with a code'}</button>
    </form>
  );
}

export function FundsPage() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  useEffect(() => { api(`/api/channel/applications/${id}`).then((data) => setApplication(data.application)); }, [id]);
  return <div className="sheet"><h1>Funds sent</h1><p>Reference {application?.reference}</p><Link to="/my-loans">My loans</Link></div>;
}

export function LoansPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { api('/api/channel/loans').then((data) => setItems(data.items || [])); }, []);
  return <div className="sheet"><h1>My loans</h1>{items.map((loan) => <Link key={loan._id} to={`/pay/${loan._id}`}>{loan.loanAccountNo} · {money(loan.principalOutstanding)}</Link>)}</div>;
}

export function PayPage() {
  const { loanId } = useParams();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event) {
    event.preventDefault();
    const data = await api(`/api/channel/loans/${loanId}/payments`, { method: 'POST', body: { amount: Number(amount), method: 'LINKED_ACCOUNT', idempotencyKey: `pay-${loanId}-${Date.now()}` } });
    setMessage(data.idempotent ? 'Already posted' : 'Payment received');
  }
  return <form className="sheet" onSubmit={submit}><h1>Pay now</h1><label className="field">Amount<input value={amount} onChange={(event) => setAmount(event.target.value)} /></label>{message && <p>{message}</p>}<button className="primary" type="submit">Pay</button></form>;
}

export function NotificationsPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { api('/api/channel/notifications').then((data) => setItems(data.items || [])); }, []);
  return (
    <div className="sheet">
      <h1>Notifications</h1>
      {items.map((item) => <button key={item._id} className="panel" type="button" onClick={() => api(`/api/channel/notifications/${item._id}/read`, { method: 'POST', body: {} })}><strong>{item.title}</strong><p>{item.body}</p></button>)}
    </div>
  );
}

export function ProfilePage() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [items, setItems] = useState([]);
  useEffect(() => { api('/api/channel/complaints').then((data) => setItems(data.items || [])).catch(() => {}); }, []);
  return (
    <form className="sheet" onSubmit={async (event) => { event.preventDefault(); await api('/api/channel/complaints', { method: 'POST', body: { subject, body } }); const data = await api('/api/channel/complaints'); setItems(data.items || []); }}>
      <h1>Profile</h1>
      <label className="field">Complaint subject<input value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
      <label className="field">Details<textarea value={body} onChange={(event) => setBody(event.target.value)} /></label>
      <button className="primary" type="submit">Send complaint</button>
      <ul>{items.map((item) => <li key={item._id}>{item.reference} · {item.status}</li>)}</ul>
    </form>
  );
}

export function ApplicationsPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { api('/api/channel/applications').then((data) => setItems(data.items || [])); }, []);
  return <div className="sheet"><h1>My applications</h1>{items.map((item) => <Link key={item._id} to={`/track/${item._id}`}>{item.reference} · {item.status}</Link>)}</div>;
}
