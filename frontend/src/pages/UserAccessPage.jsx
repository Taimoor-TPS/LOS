import { useEffect, useState } from 'react';
import { api, ROLE_LABEL } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function UserAccessPage() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api('/api/identity/users').then((data) => setUsers(data.users)); }, []);
  return (
    <div>
      <PageTitle kicker="Access" title="Roles and delegation" />
      <section className="panel">
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Delegation</th><th>Branch</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.name}<div className="muted">{user.email}</div></td>
                <td>{ROLE_LABEL[user.role] || user.role}</td>
                <td className="mono">{user.doaLimit || '—'}</td>
                <td>{user.branchId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
