import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function RelationshipManagerPage() {
  const [customers, setCustomers] = useState([]);
  useEffect(() => { api('/api/customers').then((data) => setCustomers(data.customers)); }, []);
  return (
    <div>
      <PageTitle kicker="Relationship" title="Customer book" />
      <section className="panel">
        <table>
          <thead><tr><th>Name</th><th>Segment</th><th>City</th><th>Income</th><th>Bureau</th></tr></thead>
          <tbody>
            {customers.map((customer) => (
              <tr className="click" key={customer.id}>
                <td><Link to={`/office/customers/${customer.id}`}>{customer.fullName}</Link></td>
                <td>{customer.segment}</td>
                <td>{customer.city}</td>
                <td>{money(customer.monthlyIncome || customer.cashflowMonthly)}</td>
                <td>{customer.bureauScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
