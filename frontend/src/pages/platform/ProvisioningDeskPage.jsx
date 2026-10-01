import { useEffect, useState } from 'react';
import { api, money } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

export default function ProvisioningDeskPage() {
  const [regimes, setRegimes] = useState([]);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/provisioning/regimes?pageSize=20').then((data) => setRegimes(data.items || [])).catch((err) => setError(err.message));
    api('/api/loans?pageSize=50').then((data) => setLoans(data.items || [])).catch(() => {});
  }, []);

  const outstanding = loans.reduce((sum, loan) => sum + Number(loan.principalOutstanding || 0), 0);
  const ecl = loans.reduce((sum, loan) => sum + Number(loan.eclAmount || 0), 0);
  const regulatory = loans.reduce((sum, loan) => sum + Number(loan.regulatoryProvision || 0), 0);
  const booked = loans.reduce((sum, loan) => sum + Number(loan.bookedProvision || 0), 0);

  return (
    <div>
      <PageTitle kicker={regimes[0]?.name || 'Classification regime'} title="Provisioning" />
      {error && <p className="bad">{error}</p>}
      <div className="kpis">
        <article className="kpi"><span>Outstanding</span><b>{money(outstanding)}</b></article>
        <article className="kpi"><span>IFRS 9 ECL</span><b>{money(ecl)}</b></article>
        <article className="kpi"><span>Prudential</span><b>{money(regulatory)}</b></article>
        <article className="kpi"><span>Booked</span><b>{money(booked)}</b></article>
      </div>
      <section className="panel">
        <table>
          <thead><tr><th>Loan</th><th>DPD</th><th>Class</th><th>Stage</th><th>Outstanding</th><th>ECL</th><th>Booked</th></tr></thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan._id}>
                <td>{loan.loanAccountNo}</td>
                <td>{loan.dpd}</td>
                <td>{loan.regulatoryClassification}</td>
                <td>{loan.ifrs9Stage}</td>
                <td>{money(loan.principalOutstanding)}</td>
                <td>{money(loan.eclAmount)}</td>
                <td>{money(loan.bookedProvision)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
