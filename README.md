# TPS LOS

Loan origination for a demo bank, Noor Horizon. Customer journey is the phone on the right. The back office is the credit desk.

## Run

```bash
npm run install:all
npm test
npm run seed
npm run dev:api
npm run dev:web
```

Open http://localhost:5173

Staff password for every back-office user: `Los@Demo2026`

Sign in as Omar Siddiqui to review Farooq, Sadia Rahman for four-eyes and committee support, Hina Baig for the second committee vote, Farah Naveed for fulfilment, and Noman Dealer for the counter.

## What is configured

Regulatory DBR caps, price bands, delegation, fraud thresholds, Shariah step lists and reason text resolve from general to specific: system, jurisdiction, tenant, entity, segment, product, channel. Scorecards and extra rules are versioned with maker-checker. Pakistan, Saudi and UAE packs are illustrative and must be replaced from the current circular before any live lending.

## Security in this build

HttpOnly session cookie, bcrypt passwords, login lockout, AES-256-GCM for CNIC and phone, masked identities on staff lists, role checks, maker-checker on policy changes, append-only decision records and audit log, consent required before a bureau pull, helmet, and a client header on browser writes. There is no separate security or theme file in `document`; controls follow the product NFR section, and colours live in `frontend/src/theme/tokens.css`.
"# LOS" 
