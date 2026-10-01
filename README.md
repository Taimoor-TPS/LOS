# Lending platform

Origination, servicing, collections and the general ledger for the demo bank configured in `bank.profile` (default: Noor Horizon Bank).

## Setup

1. Copy `backend/.env.example` to `backend/.env` and set `JWT_SECRET`, `FIELD_ENCRYPTION_KEY` and `ADMIN_INITIAL_PASSWORD`. The API will not start without the first two. Seed will not run without the third.
2. Start MongoDB as a single-node replica set: `docker compose up -d mongo`
3. Install and seed:

```bash
npm run install:all
npm test
npm run seed
npm run dev:api
npm run dev:web
```

4. Open http://localhost:5173/office/login and sign in as `admin`. The first login forces a password change. The initial password is only the value you put in `ADMIN_INITIAL_PASSWORD`.

`npm run seed` creates one back-office user and reference data. It does not create customers, applications or loans. `npm run seed:sample` is optional and is not part of the default demo.

Set `DEMO_MODE=true` to show the SMS inbox beside the phone. Set `VITE_FEATURES_EXTENDED=true` when starting the web app if you want the extra desks (campaigns, dealer, schemes, and the rest).

## Demo identity suffixes

Mock identity, bureau and sanctions results depend on the last four digits of the CNIC:

| Suffix | Result |
|---|---|
| 0001 | Clean bureau |
| 0002 | Write-off hit, declined at pre-screen |
| 0003 | Sanctions potential match, compliance hold |
| 0004 | Identity document expired, hard stop |
| 0005 | Face match below threshold, manual review |
| 0006 | Bureau timeout, fallback |

The click path is in `docs/DEMO_SCRIPT.md`.
