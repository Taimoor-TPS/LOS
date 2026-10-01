import { useAuth } from '../../context/AppState.jsx';

export function Can({ perm, children }) {
  const { permissions } = useAuth();
  if (!perm) return children;
  if (!permissions?.includes(perm)) return null;
  return children;
}

export function ConfirmDialog({ open, title, confirmLabel = 'Confirm', onCancel, onConfirm, children }) {
  if (!open) return null;
  return (
    <div className="modal-back" role="presentation">
      <form className="modal" onSubmit={(event) => { event.preventDefault(); onConfirm(); }}>
        <h2>{title}</h2>
        {children}
        <div className="row-actions">
          <button className="ghost" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary" type="submit">{confirmLabel}</button>
        </div>
      </form>
    </div>
  );
}

export function DataTable({ columns, rows, sort, onSort, page, pageSize, total, onPage, empty = 'Nothing here yet.' }) {
  const pages = Math.max(1, Math.ceil((total || 0) / (pageSize || 20)));
  return (
    <div>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>
                <button className="sort" type="button" onClick={() => onSort?.(column.key)}>{column.label}{sort === column.key ? ' ↑' : sort === `-${column.key}` ? ' ↓' : ''}</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length}>{empty}</td></tr>}
          {rows.map((row) => (
            <tr key={row.id || row._id || row.code}>
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pager">
        <button className="ghost" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span>{page} / {pages} · {total || 0}</span>
        <button className="ghost" type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function EntityForm({ fields, value, onChange, onSubmit, submitLabel = 'Save' }) {
  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      {fields.map((field) => (
        <label className="field" key={field.name}>
          {field.label}
          {field.type === 'select' ? (
            <select value={value[field.name] ?? ''} onChange={(event) => onChange({ ...value, [field.name]: event.target.value })}>
              <option value="">Select</option>
              {(field.options || []).map((option) => <option key={option.value || option} value={option.value || option}>{option.label || option}</option>)}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea value={value[field.name] ?? ''} onChange={(event) => onChange({ ...value, [field.name]: event.target.value })} />
          ) : (
            <input type={field.type || 'text'} value={value[field.name] ?? ''} onChange={(event) => onChange({ ...value, [field.name]: field.type === 'number' ? Number(event.target.value) : event.target.value })} />
          )}
        </label>
      ))}
      <button className="primary" type="submit">{submitLabel}</button>
    </form>
  );
}

export function AuditTab({ items = [] }) {
  if (!items.length) return <p className="muted">No audit events for this record yet.</p>;
  return (
    <table>
      <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Reason</th></tr></thead>
      <tbody>
        {items.map((item) => (
          <tr key={item._id}>
            <td>{new Date(item.createdAt).toLocaleString()}</td>
            <td>{item.actorName}</td>
            <td>{item.action}</td>
            <td>{item.reason || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DynamicForm({ sections = [], fields = [], value, onChange }) {
  const meta = new Map(fields.map((field) => [field.fieldCode, field]));
  return (
    <div>
      {sections.map((section) => (
        <section key={section.code} className="panel">
          <h2>{section.title?.en || section.title}</h2>
          {(section.fields || []).map((slot) => {
            const field = meta.get(slot.fieldCode) || { fieldCode: slot.fieldCode, label: { en: slot.fieldCode }, dataType: 'TEXT' };
            const current = value[slot.fieldCode] ?? '';
            const label = field.label?.en || slot.fieldCode;
            return (
              <label className="field" key={slot.fieldCode}>
                {label}
                <input
                  value={current}
                  inputMode={field.dataType === 'AMOUNT' || field.dataType === 'INTEGER' ? 'decimal' : undefined}
                  onChange={(event) => onChange({ ...value, [slot.fieldCode]: event.target.value })}
                />
              </label>
            );
          })}
        </section>
      ))}
    </div>
  );
}
