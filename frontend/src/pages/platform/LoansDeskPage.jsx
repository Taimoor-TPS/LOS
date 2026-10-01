import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, money, rateLabel } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

function tone(loan) {
  if (loan.status === 'WRITTEN_OFF') return 'bad';
  if (loan.regulatoryClassification === 'Regular') return 'ok';
  return 'warn';
}

export default function LoansDeskPage() {
  const { accountNo } = useParams();
  const [loans, setLoans] = useState([]);
  const [loan, setLoan] = useState(null);
  const [amount, setAmount] = useState('5000');
  const [method, setMethod] = useState('Raast');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  function loadList() {
    api('/api/loans?pageSize=50').then((data) => setLoans(data.items || [])).catch((err) => setError(err.message));
  }

  function loadOne(id) {
    api(`/api/loans/${id}`).then((data) => setLoan(data.loan)).catch((err) => setError(err.message));
  }

  useEffect(() => { loadList(); }, []);
  useEffect(() => { if (accountNo) loadOne(accountNo); }, [accountNo]);

  async function pay(event) {
    event.preventDefault();
    setNotice('');
    setError('');
    try {
      const body = await api(`/api/loans/${loan?._id || accountNo}/payments`, {
        method: 'POST',
        body: { amount: Number(amount), method, idempotencyKey: `${accountNo}-${amount}-${Date.now()}` },
      });
      setNotice(body.receipt?.reference || body.transaction?.reference || 'Payment posted');
      loadOne(accountNo);
      loadList();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!accountNo) {
    return (
      <div>
        <PageTitle kicker="System of record" title="Loans" />
        {error && <p className="chip bad">{error}</p>}
        <section className="panel">
          <table>
            <thead>
              <tr><th>Account</th><th>Customer</th><th>Product</th><th>Outstanding</th><th>DPD</th><th>Classification</th><th>Stage</th></tr>
            </thead>
            <tbody>
              {loans.map((row) => (
                <tr key={row.loanAccountNo}>
                  <td><Link to={`/office/loans/${row.loanAccountNo}`}>{row.loanAccountNo}</Link></td>
                  <td>{row.cifName}</td>
                  <td>{row.productName}</td>
                  <td>{money(row.principalOutstanding)}</td>
                  <td>{row.dpd}</td>
                  <td><span className={`chip ${tone(row)}`}>{row.regulatoryClassification}</span></td>
                  <td>{row.ifrs9Stage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    );
  }

  if (!loan) return <p>{error || 'Loading account…'}</p>;

  return (
    <div>
      <PageTitle kicker={loan.productName} title={loan.loanAccountNo}>
        <Link className="ghost" to="/office/loans">All loans</Link>
      </PageTitle>
      <div className="kpis">
        <article className="kpi"><span>Outstanding</span><b>{money(loan.principalOutstanding)}</b></article>
        <article className="kpi"><span>Instalment</span><b>{money(loan.instalment)}</b></article>
        <article className="kpi"><span>DPD / bucket</span><b>{loan.dpd} · {loan.bucket}</b></article>
        <article className="kpi"><span>Rate</span><b>{rateLabel(loan.rate)}</b></article>
      </div>
      <div className="split">
        <section className="panel">
          <h2>Contract</h2>
          <p>{loan.cifName} · {loan.idNumber} · branch {loan.branch}</p>
          <p>Mode {loan.repaymentMode} · {loan.islamic ? 'Islamic — late amounts go to charity' : 'Conventional'}</p>
          <p><span className={`chip ${tone(loan)}`}>{loan.status === 'WRITTEN_OFF' ? loan.writeOffSubState : loan.regulatoryClassification}</span> IFRS 9 stage {loan.ifrs9Stage}</p>
          <form onSubmit={pay} className="field">
            <label>Post a repayment</label>
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" />
            <select value={method} onChange={(event) => setMethod(event.target.value)}>
              <option>Raast</option>
              <option>Wallet auto-debit</option>
              <option>1Bill</option>
              <option>Branch cash</option>
            </select>
            <button className="primary" type="submit">Allocate</button>
          </form>
          {notice && <p className="chip ok">{notice}</p>}
          {error && <p className="chip bad">{error}</p>}
        </section>
        <section className="panel">
          <h2>Balances due</h2>
          <table>
            <tbody>
              <tr><td>Principal overdue</td><td>{money(loan.principalOverdue)}</td></tr>
              <tr><td>Profit overdue</td><td>{money(loan.interestOverdue)}</td></tr>
              <tr><td>Fees</td><td>{money(loan.feesDue)}</td></tr>
              <tr><td>Accrued not due</td><td>{money(loan.interestAccrued)}</td></tr>
              <tr><td>Booked provision</td><td>{money(loan.bookedProvision)}</td></tr>
            </tbody>
          </table>
        </section>
      </div>
      <section className="panel">
        <h2>Schedule version {loan.scheduleVersion}</h2>
        <table>
          <thead><tr><th>#</th><th>Due</th><th>Instalment</th><th>Principal</th><th>Profit</th><th>Closing</th><th>Status</th></tr></thead>
          <tbody>
            {(loan.schedule || []).slice(0, 18).map((row) => (
              <tr key={row.n}>
                <td>{row.n}</td><td>{row.due}</td><td>{money(row.instalment)}</td><td>{money(row.principal)}</td><td>{money(row.profit)}</td><td>{money(row.closing)}</td>
                <td><span className={`chip ${row.status === 'PAID' ? 'ok' : row.status === 'OVERDUE' ? 'bad' : 'info'}`}>{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
