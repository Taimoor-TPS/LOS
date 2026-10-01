import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';
import { Can } from '../../components/common/widgets.jsx';

export default function WorkbenchPage() {
  const { applicationId } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Summary');
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  function load() {
    api(`/api/applications/${applicationId}`).then(setData).catch((err) => setError(err.message));
  }
  useEffect(load, [applicationId]);
  if (error) return <p className="bad">{error}</p>;
  if (!data) return <p>Loading the case…</p>;
  const { application } = data;
  async function act(outcome) {
    setError('');
    try {
      await api(`/api/applications/${applicationId}/transitions`, { method: 'POST', body: { outcome, version: application.version, reason, reasonCode: 'POLI' } });
      setReason('');
      load();
    } catch (err) { setError(err.message); }
  }
  return (
    <div>
      <PageTitle kicker={application.productCode} title={application.reference} />
      {error && <p className="bad">{error}</p>}
      <div className="row-actions">
        {['Summary', 'Applicant', 'Documents', 'Deviations', 'Decision', 'Audit'].map((name) => <button key={name} className={tab === name ? 'primary' : 'ghost'} type="button" onClick={() => setTab(name)}>{name}</button>)}
      </div>
      {tab === 'Summary' && <section className="panel"><p>Stage {application.stage} · {application.status}</p><p>Amount {application.amount}</p></section>}
      {tab === 'Applicant' && <section className="panel"><pre>{JSON.stringify(application.attributes || {}, null, 2)}</pre><p>{data.customer?.fullName}</p></section>}
      {tab === 'Documents' && (
        <section className="panel">
          {(data.documents || []).map((doc) => (
            <div key={doc._id}>
              <span>{doc.code} · {doc.status}</span>
              <Can perm="document:verify">
                <button className="ghost" type="button" onClick={() => api(`/api/applications/${applicationId}/documents/${doc._id}/verify`, { method: 'POST', body: { decision: 'VERIFIED' } }).then(load)}>Verify</button>
                <button className="ghost" type="button" onClick={() => api(`/api/applications/${applicationId}/documents/${doc._id}/verify`, { method: 'POST', body: { decision: 'REJECTED', reason: 'Please upload a clearer copy' } }).then(load)}>Reject</button>
              </Can>
            </div>
          ))}
        </section>
      )}
      {tab === 'Deviations' && (
        <section className="panel">
          {(data.deviations || []).map((item) => (
            <div key={item._id}>{item.code} · {item.status}
              <Can perm="application:override_rule">
                <button className="ghost" type="button" onClick={() => api(`/api/applications/${applicationId}/deviations/${item._id}`, { method: 'POST', body: { decision: 'APPROVED', justification: reason || 'Supported by documents' } }).then(load)}>Approve</button>
              </Can>
            </div>
          ))}
        </section>
      )}
      {tab === 'Decision' && (
        <section className="panel">
          <Can perm="application:recommend"><button className="ghost" type="button" onClick={() => api(`/api/applications/${applicationId}/underwrite`, { method: 'POST', body: {} }).then(load)}>Run underwriting</button></Can>
          <label className="field">Reason<input value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <Can perm="application:approve"><button className="primary" type="button" onClick={() => act('APPROVE')}>Approve</button></Can>
          <Can perm="application:decline"><button className="ghost" type="button" onClick={() => act('DECLINE')}>Decline</button></Can>
          <Can perm="application:return"><button className="ghost" type="button" onClick={() => act('RETURN')}>Return</button></Can>
          <Can perm="disbursement:authorise"><button className="primary" type="button" onClick={async () => {
            await api(`/api/applications/${applicationId}`, { method: 'PATCH', body: { version: application.version, checklist: [{ code: 'MANDATE', label: 'Repayment mandate', state: 'COMPLIED' }] } });
            const fresh = await api(`/api/applications/${applicationId}`);
            await api(`/api/applications/${applicationId}/disburse`, { method: 'POST', body: { reason: reason || 'Single checker disbursement' } });
            setData(fresh);
            load();
          }}>Disburse</button></Can>
          {application.decision && <pre>{JSON.stringify(application.decision, null, 2)}</pre>}
        </section>
      )}
      {tab === 'Audit' && <section className="panel"><ol>{(data.history || []).map((row) => <li key={row._id}>{row.outcome} → {row.toStage}</li>)}</ol></section>}
    </div>
  );
}
