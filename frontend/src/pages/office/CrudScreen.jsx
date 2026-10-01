import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';
import { AuditTab, Can, ConfirmDialog, DataTable, EntityForm } from '../../components/common/widgets.jsx';

export default function CrudScreen({ title, endpoint, columns, fields, createPerm, editPerm, idKey = '_id' }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);
  const [reason, setReason] = useState('');
  const [audit, setAudit] = useState([]);
  const [selected, setSelected] = useState(null);

  async function load(nextPage = page) {
    setError('');
    try {
      const data = await api(`${endpoint}?page=${nextPage}&pageSize=20&sort=${encodeURIComponent(sort)}&q=${encodeURIComponent(q)}`);
      setRows(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(1); }, [endpoint, sort]);

  async function save() {
    setError('');
    try {
      if (editing) await api(`${endpoint}/${editing}`, { method: 'PATCH', body: { ...form, version: form.version } });
      else await api(endpoint, { method: 'POST', body: form });
      setEditing(null);
      setForm({});
      await load(1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove() {
    try {
      await api(`${endpoint}/${pendingDelete[idKey] || pendingDelete.id}`, { method: 'DELETE', body: { reason } });
      setPendingDelete(null);
      setReason('');
      await load(1);
    } catch (err) {
      setError(err.message);
    }
  }

  const tableColumns = [
    ...columns,
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <span className="row-actions">
          <Can perm={editPerm}><button className="ghost" type="button" onClick={() => { setEditing(row[idKey]); setForm(row); }}>Edit</button></Can>
          <Can perm={editPerm}><button className="ghost" type="button" onClick={() => setPendingDelete(row)}>Delete</button></Can>
          <button className="ghost" type="button" onClick={async () => {
            setSelected(row);
            const data = await api(`/api/audit?resourceId=${row[idKey]}&pageSize=20`).catch(() => ({ items: [] }));
            setAudit(data.items || []);
          }}>Audit</button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageTitle kicker="Records" title={title}>
        <Can perm={createPerm}><button className="primary" type="button" onClick={() => { setEditing(null); setForm({}); }}>New</button></Can>
      </PageTitle>
      <div className="filters">
        <input aria-label="Search" placeholder="Search" value={q} onChange={(event) => setQ(event.target.value)} />
        <button className="ghost" type="button" onClick={() => load(1)}>Search</button>
      </div>
      {error && <p className="bad pill">{error}</p>}
      <DataTable columns={tableColumns} rows={rows} sort={sort} onSort={(key) => setSort(sort === key ? `-${key}` : key)} page={page} pageSize={20} total={total} onPage={load} />
      {(editing || Object.keys(form).length > 0) && (
        <section className="panel">
          <h2>{editing ? 'Edit' : 'New'}</h2>
          <EntityForm fields={fields} value={form} onChange={setForm} onSubmit={save} />
        </section>
      )}
      {selected && <section className="panel"><h2>Audit</h2><AuditTab items={audit} /></section>}
      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete this record?" confirmLabel="Delete" onCancel={() => setPendingDelete(null)} onConfirm={remove}>
        <label className="field">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
      </ConfirmDialog>
    </div>
  );
}
