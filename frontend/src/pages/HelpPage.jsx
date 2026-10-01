import { Link } from 'react-router-dom';

const FAQS = [
  ['What does the monthly figure mean?', 'It is the payment for the amount and tenor you chose, from the same calculator used on the key facts statement.'],
  ['Why does an Islamic product look different?', 'The bank must own the asset before it sells or leases it to you. Those steps are shown before signing.'],
  ['What if I am declined?', 'You will see a plain-language reason. You can ask the bank to explain it, or to correct bureau information that is wrong.'],
  ['How do I raise a complaint?', 'Use the staff desk or your branch and quote the application reference. The case keeps that number.'],
];

export default function HelpPage() {
  return (
    <div>
      <div className="eyebrow">Support</div>
      <h2 className="display">Help</h2>
      <p className="muted">English and Urdu are on the language switch. Figures on this demo are illustrative.</p>
      {FAQS.map(([title, body]) => (
        <article className="card" key={title}>
          <b>{title}</b>
          <p className="muted">{body}</p>
        </article>
      ))}
      <Link className="ghost" to="/settings">Consent and language</Link>
    </div>
  );
}
