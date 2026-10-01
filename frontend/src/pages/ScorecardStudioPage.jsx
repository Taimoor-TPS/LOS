import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PageTitle } from '../components/office/OfficeShell.jsx';

export default function ScorecardStudioPage() {
  const [cards, setCards] = useState([]);
  const [result, setResult] = useState(null);
  useEffect(() => { api('/api/scorecards').then((data) => setCards(data.scorecards)); }, []);

  async function simulate(card) {
    const data = await api(`/api/scorecards/${card._id}/simulate`, {
      method: 'POST',
      body: { features: { bureauScore: 742, capacityScore: 80, salaryMonths: 14, relationshipYears: 4, cashflowStability: 78, altDataQuality: 76, cleanFile: 100 } },
    });
    setResult({ name: card.name, ...data.result });
  }

  return (
    <div>
      <PageTitle kicker="Scoreboard" title="Scorecards" />
      {cards.map((card) => (
        <article className="panel" key={card._id}>
          <div className="row">
            <h2>{card.name}</h2>
            <span className={`pill ${card.status === 'active' ? 'good' : 'warn'}`}>{card.status} v{card.version}</span>
          </div>
          <p className="muted">Approve {card.approveCutoff} · refer {card.referCutoff} · products {card.products.join(', ')}</p>
          {card.factors.map((factor) => (
            <div className="row" key={factor.key}><span>{factor.label}</span><b>{factor.weight}</b></div>
          ))}
          <button className="ghost" type="button" onClick={() => simulate(card)}>Simulate Ayesha’s features</button>
        </article>
      ))}
      {result && <section className="panel"><h2>{result.name}: {result.score} · {result.band}</h2></section>}
    </div>
  );
}
