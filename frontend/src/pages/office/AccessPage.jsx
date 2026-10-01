import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';
import { Can, ConfirmDialog, DataTable } from '../../components/common/widgets.jsx';

export default function AccessPage() {
  const [tab, setTab] = useState('Users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rules, setRules] = useState([]);
  const [checker, setChecker] = useState(null);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState('');

  function load() {
    Promise.all([
      api('/api/admin/users?pageSize=50'),
      api('/api/admin/roles?pageSize=50'),
      api('/api/admin/permissions?pageSize=200'),
      api('/api/admin/sod-rules?pageSize=50'),
      api('/api/admin/checker-mode?permission=application:approve'),
    ]).then(([userPage, rolePage, permissionPage, rulePage, mode]) => {
      setUsers(userPage.items || []);
      setRoles(rolePage.items || []);
      setPermissions(permissionPage.items || []);
      setRules(rulePage.items || []);
      setChecker(mode);
    }).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  async function createUser(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api('/api/admin/users', { method: 'POST', body: {
        username: form.username,
        name: form.name,
        password: form.password,
        roles: form.roleId ? [{ roleId: form.roleId, scopeType: 'ALL' }] : [],
      } });
      setMessage(data.temporaryPassword ? `Temporary password: ${data.temporaryPassword}` : 'User created.');
      setForm({});
      load();
    } catch (err) { setError(err.message); }
  }

  async function createRole(event) {
    event.preventDefault();
    setError('');
    try {
      const selected = form.permissions ? form.permissions.split(',').map((code) => code.trim()).filter(Boolean) : [];
      const data = await api('/api/admin/roles', { method: 'POST', body: {
        code: form.code,
        name: form.name,
        type: form.type || 'BUSINESS',
        maxScope: 'ALL',
        permissions: selected,
        doa: [{ productFamily: form.family || 'PERSONAL', maxAmount: Number(form.maxAmount || 0), maxDeviationLevel: form.deviation || 'NONE' }],
      } });
      setMessage(data.warnings?.length ? data.warnings.map((row) => row.description || row.code).join(' ') : 'Role saved.');
      setForm({});
      load();
    } catch (err) { setError(err.message); }
  }

  async function remove() {
    try {
      await api(pending.href, { method: 'DELETE', body: { reason } });
      setPending(null);
      setReason('');
      load();
    } catch (err) { setError(err.message); setPending(null); }
  }

  return (
    <div>
      <PageTitle kicker={checker?.singleChecker ? 'Self-authorise is available' : 'A checker exists'} title="Access control" />
      {error && <p className="bad">{error}</p>}
      {message && <p className="panel">{message}</p>}
      <div className="row-actions">
        {['Users', 'Roles', 'Permissions', 'Segregation'].map((name) => <button key={name} className={tab === name ? 'primary' : 'ghost'} type="button" onClick={() => setTab(name)}>{name}</button>)}
      </div>
      {tab === 'Users' && (
        <>
          <Can perm="rbac:manage_users">
            <form className="panel" onSubmit={createUser}>
              <h2>New user</h2>
              <label className="field">Username<input value={form.username || ''} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
              <label className="field">Name<input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label className="field">Password<input type="password" value={form.password || ''} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
              <label className="field">Role
                <select value={form.roleId || ''} onChange={(event) => setForm({ ...form, roleId: event.target.value })}>
                  <option value="">None</option>
                  {roles.map((role) => <option key={role._id} value={role._id}>{role.name}</option>)}
                </select>
              </label>
              <button className="primary" type="submit">Create</button>
            </form>
          </Can>
          <DataTable
            columns={[
              { key: 'username', label: 'Username' },
              { key: 'name', label: 'Name' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: '', render: (row) => (
                <Can perm="rbac:manage_users">
                  <button className="ghost" type="button" onClick={() => api(`/api/admin/users/${row._id}/reset-password`, { method: 'POST', body: {} }).then((data) => setMessage(`One-time password: ${data.temporaryPassword}`))}>Reset</button>
                  <button className="ghost" type="button" onClick={() => api(`/api/admin/users/${row._id}/${row.status === 'DISABLED' ? 'enable' : 'disable'}`, { method: 'POST', body: { reason: 'Access change' } }).then(load)}>{row.status === 'DISABLED' ? 'Enable' : 'Disable'}</button>
                  <button className="ghost" type="button" onClick={() => setPending({ href: `/api/admin/users/${row._id}` })}>Delete</button>
                </Can>
              ) },
            ]}
            rows={users}
            page={1}
            pageSize={50}
            total={users.length}
          />
        </>
      )}
      {tab === 'Roles' && (
        <>
          <Can perm="rbac:manage_roles">
            <form className="panel" onSubmit={createRole}>
              <h2>New role</h2>
              <label className="field">Code<input value={form.code || ''} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
              <label className="field">Name<input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label className="field">Permissions (comma separated codes)<textarea value={form.permissions || ''} onChange={(event) => setForm({ ...form, permissions: event.target.value })} /></label>
              <label className="field">DoA amount<input type="number" value={form.maxAmount || ''} onChange={(event) => setForm({ ...form, maxAmount: event.target.value })} /></label>
              <button className="primary" type="submit">Save role</button>
            </form>
          </Can>
          <DataTable columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }]} rows={roles} page={1} pageSize={50} total={roles.length} />
        </>
      )}
      {tab === 'Permissions' && <DataTable columns={[{ key: 'code', label: 'Code' }, { key: 'module', label: 'Module' }, { key: 'description', label: 'Description' }]} rows={permissions} page={1} pageSize={200} total={permissions.length} />}
      {tab === 'Segregation' && (
        <>
          <Can perm="rbac:manage_roles">
            <form className="panel" onSubmit={async (event) => {
              event.preventDefault();
              await api('/api/admin/sod-rules', { method: 'POST', body: { code: form.code, permissionA: form.permissionA, permissionB: form.permissionB, level: form.level || 'CASE', action: form.action || 'BLOCK', description: form.description || '' } });
              load();
            }}>
              <label className="field">Code<input value={form.code || ''} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
              <label className="field">Permission A<input value={form.permissionA || ''} onChange={(event) => setForm({ ...form, permissionA: event.target.value })} /></label>
              <label className="field">Permission B<input value={form.permissionB || ''} onChange={(event) => setForm({ ...form, permissionB: event.target.value })} /></label>
              <button className="primary" type="submit">Add rule</button>
            </form>
          </Can>
          <DataTable columns={[{ key: 'code', label: 'Code' }, { key: 'permissionA', label: 'A' }, { key: 'permissionB', label: 'B' }, { key: 'action', label: 'Action' }]} rows={rules} page={1} pageSize={50} total={rules.length} />
        </>
      )}
      <ConfirmDialog open={Boolean(pending)} title="Delete this record" onCancel={() => setPending(null)} onConfirm={remove}>
        <label className="field">Reason<input value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      </ConfirmDialog>
    </div>
  );
}
