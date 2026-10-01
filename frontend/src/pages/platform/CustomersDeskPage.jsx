import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

export default function CustomersDeskPage() {
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/customers').then((data) => setCustomers(data.customers || [])).catch((err) => setError(err.message));
    api('/api/platform/loans').then((data) => setLoans((data.loans || []).filter((loan) => loan.writeOffSubState))).catch(() => {});
  }, []);

  return (
    <div>
      <PageTitle kicker="CIF and write-off register" title="Customers" />
      {error && <p className="chip bad">{error}</p>}
      <section className="panel">
        <h2>Customer file</h2>
        <table>
          <thead><tr><th>Name</th><th>Segment</th><th>City</th><th></th></tr></thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.fullName}</td>
                <td>{customer.segment}</td>
                <td>{customer.city}</td>
                <td><Link to={`/office/customers/${customer.id}`}>Open 360</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h2>Write-off register</h2>
        <p className="muted">A write-off is an accounting event. The debt remains recoverable and the customer stays on the bureau file until it is settled.</p>
        <table>
          <thead><tr><th>Customer</th><th>ID</th><th>Loan</th><th>Sub-state</th></tr></thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.loanAccountNo}>
                <td>{loan.cifName}</td>
                <td>{loan.idNumber}</td>
                <td><Link to={`/office/loans/${loan.loanAccountNo}`}>{loan.loanAccountNo}</Link></td>
                <td><span className="chip bad">{loan.writeOffSubState}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
