import { Link } from 'react-router-dom';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

const REPORTS = [
  ['Application register / pipeline', 'Daily operations'],
  ['Sanction and deviation register', 'Credit governance'],
  ['Disbursement register', 'Operations and finance'],
  ['Repayment and receipt register', 'Finance'],
  ['Overdue and DPD ageing', 'Collections and risk'],
  ['Classification and provisioning statement', 'Regulatory returns'],
  ['IFRS 9 ECL and stage migration', 'Financial reporting'],
  ['Write-off and recovery register', 'Board reporting'],
  ['Restructured loans register', 'Regulatory monitoring'],
  ['Bureau submission and exceptions', 'Bureau compliance'],
  ['Consent register', 'Data protection'],
  ['Complaints register with TAT', 'Consumer protection'],
  ['AML screening and EDD register', 'AML'],
  ['Islamic financing and charity', 'Shariah'],
];

export default function ReportsDeskPage() {
  return (
    <div>
      <PageTitle kicker="Metadata catalogue" title="Reports">
        <Link className="ghost" to="/office/analytics">MIS analytics</Link>
      </PageTitle>
      <section className="panel">
        <table>
          <thead><tr><th>Report</th><th>Purpose</th><th>Export</th></tr></thead>
          <tbody>
            {REPORTS.map(([name, purpose]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{purpose}</td>
                <td><span className="chip info">CSV / XLSX</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">PII columns stay masked unless the user holds view_full_pii. Regulatory layouts attach reporting tags from the field registry.</p>
      </section>
    </div>
  );
}
