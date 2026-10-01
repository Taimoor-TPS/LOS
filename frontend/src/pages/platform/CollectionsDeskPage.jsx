import { useEffect, useState } from 'react';
import { api, money } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

export default function CollectionsDeskPage() {
  const [cases, setCases] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [notes, setNotes] = useState('');
  const [ptpAmount, setPtpAmount] = useState('');
  const [ptpDate, setPtpDate] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function load() {
    api('/api/collections/cases?pageSize=50').then((body) => {
      setCases(body.items || []);
      setSelected((current) => current || body.items?.[0]?._id);
    }).catch((err) => setError(err.message));
  }
  useEffect(load, []);
  useEffect(() => {
    if (!selected) return;
    api(`/api/collections/cases/${selected}`).then(setDetail).catch((err) => setError(err.message));
  }, [selected]);

  async function act(event) {
    event.preventDefault();
    setError('');
    try {
      await api(`/api/collections/cases/${selected}/actions`, { method: 'POST', body: { channel: 'Phone', contactPerson: 'Customer', resultCode: 'CONTACTED', notes } });
      setMessage('Action recorded.');
      const fresh = await api(`/api/collections/cases/${selected}`);
      setDetail(fresh);
    } catch (err) { setError(err.message); }
  }

  async function promise(event) {
    event.preventDefault();
    await api(`/api/collections/cases/${selected}/ptps`, { method: 'POST', body: { amount: Number(ptpAmount), promiseDate: ptpDate } });
    setMessage('Promise to pay saved.');
  }

  return (
    <div>
      <PageTitle kicker="From end-of-day DPD" title="Collections" />
      {error && <p className="bad">{error}</p>}
      {message && <p>{message}</p>}
      <div className="split">
        <section className="panel">
          <table>
            <tbody>
              {cases.map((row) => (
                <tr key={row._id} onClick={() => setSelected(row._id)}>
                  <td>{row.strategy || row.bucket}</td>
                  <td>DPD {row.dpd}</td>
                  <td>{money(row.amountDue || 0)}</td>
                </tr>
              ))}
              {!cases.length && <tr><td>No collection cases yet. Run end of day after a due date passes.</td></tr>}
            </tbody>
          </table>
        </section>
        {detail && (
          <section className="panel">
            <h2>{detail.item?.strategy}</h2>
            <form onSubmit={act}>
              <label className="field">Notes<input value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
              <button className="primary" type="submit">Log action</button>
            </form>
            <form onSubmit={promise}>
              <label className="field">Promise amount<input value={ptpAmount} onChange={(event) => setPtpAmount(event.target.value)} /></label>
              <label className="field">Date<input type="date" value={ptpDate} onChange={(event) => setPtpDate(event.target.value)} /></label>
              <button className="ghost" type="submit">Save promise</button>
            </form>
            <ul>{(detail.actions || []).map((row) => <li key={row._id}>{row.resultCode} · {row.notes}</li>)}</ul>
          </section>
        )}
      </div>
    </div>
  );
}
