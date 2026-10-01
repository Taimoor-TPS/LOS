import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function CampaignOrchestrationPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [result, setResult] = useState(null);
  function load() { api('/api/engagement/campaigns').then((data) => setCampaigns(data.campaigns)); }
  useEffect(load, []);
  async function run(id) {
    const data = await api(`/api/engagement/campaigns/${id}/run`, { method: 'POST', body: {} });
    setResult(data.result);
    load();
  }
  return (
    <div>
      <PageTitle kicker="Engagement" title="Campaigns" />
      {campaigns.map((campaign) => (
        <article className="panel" key={campaign._id}>
          <h2>{campaign.name}</h2>
          <p>{campaign.message}</p>
          <p className="muted">{campaign.segment} · {campaign.channel} · cap {campaign.frequencyCap} / 7 days · holdout {campaign.holdoutPercent}%</p>
          <button className="primary" type="button" onClick={() => run(campaign._id)}>Run with consent and holdout</button>
        </article>
      ))}
      {result && <p>Issued {result.issued} · held out {result.held} · skipped {result.skipped}</p>}
    </div>
  );
}
