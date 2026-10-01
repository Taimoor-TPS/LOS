import { useEffect, useState } from 'react';
import { api, money } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

export default function CollectionsDeskPage() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState('Contacted');
  const [notes, setNotes] = useState('');
  const [ptpAmount, setPtpAmount] = useState('10000');
  const [ptpDate, setPtpDate] = useState('2026-10-08');
  const [settleAmount, setSettleAmount] = useState('50000');
  const [reason, setReason] = useState('Single-user self-authorisation for the demo settlement.');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function load() {
    api('/api/platform/collections').then((body) => {
      setData(body);
      setSelected((current) => current || body.cases?.[0]?.id);
    }).catch((err) => setError(err.message));
  }

  useEffect(() => { load(); }, []);

  async function act(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await api(`/api/platform/collections/${selected}/actions`, {
        method: 'POST',
        body: { channel: 'Phone', result, notes, ptpAmount: Number(ptpAmount), ptpDate },
      });
      setMessage('Action recorded inside the 09:00–19:00 contact window.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function settle(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const body = await api(`/api/platform/collections/${selected}/settlements`, {
        method: 'POST',
        body: { amount: Number(settleAmount), reason },
      });
      setMessage(`${body.settlement.id} ${body.settlement.tag}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!data) return <p>{error || 'Loading collections…'}</p>;

  return (
    <div>
      <PageTitle kicker="Strategy, PTP and conduct" title="Collections" />
      <p className="banner">{data.conduct}</p>
      <div className="split">
        <section className="panel">
          <table>
            <thead><tr><th>Case</th><th>Customer</th><th>DPD</th><th>Strategy</th><th>Overdue</th></tr></thead>
            <tbody>
              {data.cases.map((item) => (
                <tr key={item.id} className="click" onClick={() => setSelected(item.id)}>
                  <td>{item.id}</td>
                  <td>{item.customer}</td>
                  <td>{item.dpd}</td>
                  <td>{item.strategy}</td>
                  <td>{money(item.overdue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>{selected}</h2>
          <form onSubmit={act}>
            <div className="field">
              <label>Result code</label>
              <select value={result} onChange={(event) => setResult(event.target.value)}>
                {['Contacted', 'No answer', 'PTP', 'Paid', 'Dispute', 'Refused'].map((code) => <option key={code}>{code}</option>)}
              </select>
            </div>
            <div className="field"><label>Notes</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
            {result === 'PTP' && (
              <>
                <div className="field"><label>Promise amount</label><input value={ptpAmount} onChange={(event) => setPtpAmount(event.target.value)} /></div>
                <div className="field"><label>Promise date</label><input value={ptpDate} onChange={(event) => setPtpDate(event.target.value)} /></div>
              </>
            )}
            <button className="primary" type="submit">Log action</button>
          </form>
          <form onSubmit={settle} style={{ marginTop: 16 }}>
            <h2>Settlement</h2>
            <div className="field"><label>Amount</label><input value={settleAmount} onChange={(event) => setSettleAmount(event.target.value)} /></div>
            <div className="field"><label>Self-authorise reason</label><textarea value={reason} onChange={(event) => setReason(event.target.value)} /></div>
            <button className="ghost" type="submit">Self-authorise settlement</button>
          </form>
          {message && <p className="chip ok">{message}</p>}
          {error && <p className="chip bad">{error}</p>}
        </section>
      </div>
      <section className="panel">
        <h2>Action log</h2>
        <table>
          <thead><tr><th>When</th><th>Case</th><th>Result</th><th>Notes</th></tr></thead>
          <tbody>
            {data.actions.map((action) => (
              <tr key={action.id}><td>{action.at}</td><td>{action.caseId}</td><td>{action.result}</td><td>{action.notes}</td></tr>
            ))}
          </tbody>
        </table>
        {!!data.ptps.length && <p className="muted">{data.ptps.length} open or recorded promise{data.ptps.length === 1 ? '' : 's'}.</p>}
      </section>
    </div>
  );
}
