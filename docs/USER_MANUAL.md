# TPS LOS Horizon — User Manual

**Product:** TPS LOS Horizon  
**Bank in the demo:** Noor Horizon Bank  
**Audience:** Customers, and back-office staff  
**Version:** Demo build  

This manual describes how to use Horizon as it works today. Figures, rates, regulatory packs, and decisions in the demo are illustrative. They are not a live bank offer and they are not a substitute for the current circular of the State Bank of Pakistan, SAMA, or the Central Bank of the UAE.

Open the customer app at `http://localhost:5173`. Staff enter at `http://localhost:5173/office/login`.

---

## 1. What Horizon does

Horizon is a loan origination system. A customer can see a personalised offer, try an amount, give consent, receive a decision with a reason, read the key facts, sign, and — when every required step is complete — receive funds. Staff work the cases the engine cannot finish alone: reviews, four-eyes approvals, credit committee, Shariah evidence, and disbursement.

The same policy drives both sides. Scorecards, affordability caps, rules, pricing bands, and delegation limits are configuration. A change in the engine changes the next decision. It does not require a software release.

Two entrances:

| Entrance | Who | Address |
| --- | --- | --- |
| Customer phone | Borrowers | `/` |
| Staff desk | Bank and dealer users | `/office/login` |

A customer session cannot open the desk. A staff session cannot open the customer phone.

---

## 2. How to start a session

### Customers

1. Open the welcome screen.
2. Choose a person. The featured walk-throughs are Ayesha Khan, Sana Iqbal, Hamza Qureshi, and Imran Farooqi. Other seeded customers exist in the directory and can be used the same way.
3. Horizon signs that person in and opens **Home**.

There is no customer password on the welcome screen. The demo enters the chosen profile directly.

### Staff

1. Open **Staff entrance** from the welcome screen, or go to `/office/login`.
2. Type the work email and password, or tap a name in the directory. Tapping a name fills the email and the shared demo password.
3. Choose **Enter the desk**.

Demo password for every staff user: `Los@Demo2026`.

Dealers land on the dealer counter. Everyone else lands on the command center. The left menu shows only the screens that role is allowed to open.

Sign out from the bottom of the menu (staff) or from **Profile** (customers).

### Language on the phone

The status bar offers **en**, **ur**, and **ar**. Urdu and Arabic switch the phone to right-to-left. Labels for Home, Simulate, Loans, Profile, and the offer shelf follow the chosen language. Decision reasons are stored in English, Urdu, and Arabic and follow the same setting.

---

# Part A — Customer guide

The phone has four tabs once you are signed in:

| Tab | What it is for |
| --- | --- |
| Home | Offers prepared for you |
| Simulate | Try an amount and tenor |
| Loans | Facilities already booked |
| Profile | Your details, consent, and sign-out |

The journey the bank designed is: see the offer, try the amount, verify once, read the facts, receive the funds.

## A1. Home — offers for you

Home greets you by first name and shows pre-approved offers. Each card names the product, explains why it is there, and shows a limit.

Filter the shelf with **All**, **Conventional**, or **Islamic**.

**See what it costs** opens the calculator for that product, carrying the offer and a starting amount.

If a shelf is empty, use **Simulate** to browse a product directly. **Ideas after good repayment** opens the top-up screen.

What you will see with the featured people:

| Person | What the shelf is built around |
| --- | --- |
| Ayesha Khan, Karachi, salaried | Personal Finance and Auto Ijarah, after 14 months of salary credits. She already has a booked facility. |
| Sana Iqbal, Karachi, thin file | A small Micro Limit that can grow with on-time repayment. |
| Hamza Qureshi, Karachi, SME | Working-capital cases of this size go to committee. His shelf may be empty; staff already have his case. |
| Imran Farooqi, Riyadh, expat | Saudi parameter pack (Saudi riyal, Tawarruq). |

## A2. Simulate — see the cost before you apply

The calculator shows the product name, whether it is conventional or Islamic, and a short description.

Move **Amount** and **Tenor**. The quote updates as you move the sliders. Amount and tenor stay inside that product’s minimum and maximum.

The quote shows:

- Estimated monthly instalment
- Rate label and rate
- Whether the instalment sits inside your comfort zone, or is tight
- A headroom meter
- Total payable, fees, and total cost
- Debt-burden ratio (DBR) for salaried products, or cash-flow cover for business products
- A disclaimer that the figures are illustrative until a live bank publishes its own disclosure

**Compare** lists a sibling product and its instalment. Open it to try that product at a similar amount.

**Continue with this** keeps the amount, tenor, and offer and opens the application.

### Products you can be offered

| Code | Name | Family | Currency | Amount | Tenor | What it is |
| --- | --- | --- | --- | --- | --- | --- |
| PF_CONV | Personal Finance | Conventional | PKR | 50,000 – 1,500,000 | 6–60 months | Reducing-balance personal loan for salaried customers. Can disburse straight through after signing. |
| PF_MURABAHA | Personal Murabaha | Islamic | PKR | 50,000 – 1,500,000 | 6–60 months | The bank buys the asset, takes ownership, then sells it to you at a disclosed profit. |
| AUTO_IJARAH | Auto Ijarah | Islamic | PKR | 300,000 – 3,000,000 | 12–60 months | Vehicle lease. Ownership, possession, and takaful are evidenced before the lease starts. |
| SME_WC | SME Working Capital | Conventional | PKR | 500,000 – 15,000,000 | 6–36 months | Cash-flow lending for a trading business. Room for a guarantee scheme. |
| HOME_DM | Home Finance | Islamic | PKR | 1,000,000 – 25,000,000 | 60–240 months | Diminishing Musharakah: you and the bank co-own, then you buy the bank’s units over time. |
| MICRO_WALLET | Micro Limit | Conventional | PKR | 5,000 – 100,000 | 1–12 months | A small limit that can use wallet and bill-payment history you consent to share. |
| PF_TAWARRUQ | Tawarruq Personal | Islamic | SAR | 5,000 – 150,000 | 6–60 months | Commodity purchase and sale under the GCC pack. |

Indicative base rates in the demo run from 12% to 22% a year depending on the product. The decision engine can price inside each product’s floor and cap using your score grade. A relationship of three years or more can apply a small discount. Treat every rate on screen as illustrative.

Islamic products mark late-payment amounts as charity, not bank income.

## A3. Application — check what the bank already knows

Horizon fills the form from your profile:

- Name, city, employer
- Income (salary, or business cash flow where that is how you are assessed)
- CNIC
- The amount and tenor you chose

Read the card. **This looks right** creates the application and moves you to verification. You can leave and return; the application stays with this session until you submit it.

Nothing else needs to be typed on this screen.

## A4. Verification — consent, then the checks

Before the decision, you choose what the bank may use. These are on by default:

| Consent | What the bank uses it for |
| --- | --- |
| Face match and CNIC | Confirm you are you |
| Credit bureau | Read repayment history |
| Salary credits | Confirm income from the account, not a scanned slip |

Optional:

| Consent | What the bank uses it for |
| --- | --- |
| Wallet and bills | Only if you want a thin-file limit to use alternative data |

You can withdraw any purpose later in **Profile**. Withdrawal stops new use of that purpose.

**Submit application** records the consents, runs verification, and opens the decision screen.

## A5. Decision — the reason either way

**Show me the decision** runs the scorecard, the affordability cap, and the policy rules together.

You will see one of four outcomes:

| Outcome | What it means for you |
| --- | --- |
| Approve | You can continue to the key facts. |
| Decline | The bank will not proceed on this request. The reason is on the screen. |
| Refer | A person will review the file. You do not sign yet. |
| Committee | The amount sits above the committee threshold. You do not sign yet. |

The screen shows the amount, the monthly instalment and rate when a price was produced, and the reasons in your language. An offer is valid for the number of days shown (7 days on the Pakistan consumer pack in the demo, 5 days on the Saudi pack).

**Read key facts** appears only after an approval.

Reasons you may see, in plain language:

- Repayments fit inside the affordability cap, income has been steady, or credit history supports the offer
- The instalment would take repayments above the affordability cap
- Business cash flow does not cover the instalment safely
- The score needs a person, or sits below the decline cut-off
- The amount is above straight-through or committee limits
- A politically exposed person match needs review
- Salary credits have stopped, so new credit is paused
- Alternative data is not strong enough for the small-ticket product
- Age, employment, amount, tenor, identity, residency, delinquency, a write-off, sanctions, or a cooling-off window blocks the request

## A6. Key facts

The disclosure lists amount, tenor, instalment, rate, fee, and total cost, plus the late-payment wording and a disclaimer.

**I have read this** accepts the statement and opens signing. Only an approved application can be accepted.

## A7. Sign with a code

Horizon sends a six-digit code. In production that code goes by SMS. In the demo the code is shown on the screen so you can finish.

Type the six digits and choose **Sign and finish**.

What happens next depends on the product and the decision:

- A straight-through personal finance approval, with every digital step already captured, disburses in the same sitting.
- Islamic products, and any case that still needs evidence, move to operations. The screen says the file is with operations until ownership and the other required steps are on the file.

## A8. Funds

If the status is disbursed, the screen shows the amount credited, the masked account, and the rail (Raast in the demo). Auto-debit is on the 5th. **View schedule** opens the instalments.

If the file is still with operations, funds are not sent yet. Islamic and high-value cases wait until every ownership step has evidence.

## A9. Loans and the repayment schedule

**Loans** lists each booked facility: product, principal, how many instalments are paid, the monthly amount, and the debit day.

**Open schedule** shows the rate, tenor, and the first eight rows, each marked paid or due. Conventional facilities label the charge as an interest component. Islamic facilities label it as profit or rental.

Ayesha Khan already has a Personal Finance facility with six instalments paid, so this screen is populated as soon as you enter as her.

## A10. A careful next step — top-up

After good repayment, **Ideas after good repayment** lets you ask for a top-up of Rs 50,000 on a booked facility.

The request is scored again. It is not granted because you tapped the button. If the affordability cap is tight, or salary credits have stopped, the answer is no. If the engine approves, the screen shows **offered** and a new instalment. The booked loan itself changes only if that offer is later accepted through servicing.

New credit is not offered when salary credits have stopped.

## A11. Profile — consent and sign-out

Profile shows your name, city, and CNIC.

You can withdraw consent for:

- Identity
- Bureau
- Salary
- Marketing
- Alternative data
- Open banking

Withdrawal is recorded immediately. It stops new use of that purpose. It does not rewrite a decision that was already made.

**Sign out** returns you to the welcome screen.

---

# Part B — Back-office guide

The desk is branded **TPS LOS Horizon**. The left menu is grouped into Desk, Relationship, Engine, and Assurance. Your role decides which items appear.

## B1. Who can sign in

Shared demo password: `Los@Demo2026`.

| Name | Email | Role | Delegation (PKR) | Branch |
| --- | --- | --- | --- | --- |
| Zara Qureshi | zara.qureshi@noorhorizon.demo | Relationship manager | 500,000 | khi-clifton |
| Omar Siddiqui | omar.siddiqui@noorhorizon.demo | Underwriter | 2,000,000 | khi-clifton |
| Sadia Rahman | sadia.rahman@noorhorizon.demo | Credit officer | 5,000,000 | khi-clifton |
| Hina Baig | hina.baig@noorhorizon.demo | Credit committee | — | khi-clifton |
| Kamran Ali | kamran.ali@noorhorizon.demo | Credit committee | — | khi-clifton |
| Farah Naveed | farah.naveed@noorhorizon.demo | Operations | — | khi-clifton |
| Idrees Qadri | idrees.qadri@noorhorizon.demo | Shariah advisor | — | khi-clifton |
| Meher Khan | meher.khan@noorhorizon.demo | Marketing | — | khi-clifton |
| Tariq Jameel | tariq.jameel@noorhorizon.demo | Credit policy | — | khi-clifton |
| Hira Latif | hira.latif@noorhorizon.demo | Model risk | — | khi-clifton |
| Rabia Noor | rabia.noor@noorhorizon.demo | Compliance | — | khi-clifton |
| Imtiaz Shah | imtiaz.shah@noorhorizon.demo | Auditor | — | khi-clifton |
| Noman Dealer | noman.dealer@noorhorizon.demo | Dealer (Clifton Motors) | 3,000,000 | khi-clifton |
| TPS Admin | admin@noorhorizon.demo | System admin | — | khi-clifton |

A branch-officer role exists in the menu rules (command center, queue, RM book, and early warning). The demo directory does not include a branch-officer login.

Delegation is the largest amount that person may approve by override. An amount above that limit is refused, even if the Approve button is visible.

## B2. What each role is for

| Role | Day-to-day work |
| --- | --- |
| Relationship manager | Customer book, customer 360, early warning, schemes (read). |
| Underwriter | Queue and workbench. Approve or decline referred cases inside the delegation, with a written reason. |
| Credit officer | Queue, workbench, and committee list. Second approval on four-eyes cases. Higher delegation than the underwriter. |
| Credit committee | Cases above the committee threshold. Two approve votes book an approval. Two decline votes book a decline. |
| Operations | Fulfilment. Record remaining evidence and disburse. Also sees Shariah sequencing. |
| Shariah advisor | Shariah control, fulfilment, products, regulatory packs, and configuration. Can approve Islamic and reason-catalogue configuration. |
| Marketing | Campaigns and MIS. |
| Credit policy | Products, rules, scorecards, regulatory packs, configuration, schemes, models, campaigns. Maker on policy changes. |
| Model risk | Scorecards, rules (read), configuration, model cards, MIS. |
| Compliance | Audit trail, user access, rules approval, regulatory packs, configuration, warnings, analytics. Checker on policy. |
| Auditor | Read-only assurance: queue, products, rules, scorecards, packs, configuration, models, MIS, and the audit trail. |
| Dealer | Originate an Auto Ijarah walk-in at the counter. |
| System admin | Every menu. Use it to demonstrate the whole bank, not as a credit approver. Delegation on the seeded admin is zero, so overrides above zero are refused. |

Checker roles for configuration and rules are credit policy, compliance, system admin, and — for keys that start with `islamic.` or `reason.` — the Shariah advisor. The person who submits a rule cannot be the person who approves it.

## B3. Menu map

### Desk

| Screen | Roles | Purpose |
| --- | --- | --- |
| Command center | All staff except dealer | Book health at a glance |
| Application queue | Credit, RM, branch, operations, compliance, auditor, committee, admin | Every application, filterable |
| Credit committee | Committee, credit officer, admin | Cases waiting on a vote |
| Fulfilment | Operations, Shariah advisor, admin | Evidence and disbursement |
| Shariah control | Shariah advisor, operations, compliance, admin | Islamic sequencing |
| Dealer counter | Dealer, admin | Walk-in auto finance |

### Relationship

| Screen | Roles | Purpose |
| --- | --- | --- |
| RM workbench | RM, branch officer, admin | Customer book |
| Early warning | RM, credit officer, operations, compliance, admin | Portfolio signals |
| Campaigns | Marketing, credit policy, admin | Offer runs with consent and holdout |

### Engine

| Screen | Roles | Purpose |
| --- | --- | --- |
| Products | Credit policy, Shariah, compliance, auditor, admin | Catalogue |
| Rules studio | Credit policy, compliance, underwriter, model risk, auditor, admin | No-code policy |
| Scorecards | Credit policy, model risk, compliance, auditor, admin | Cut-offs and weights |
| Regulatory packs | Credit policy, compliance, Shariah, auditor, admin | DBR and age packs |
| Configuration engine | Credit policy, compliance, Shariah, model risk, auditor, admin | See which layer wins |
| Schemes | Credit policy, compliance, RM, admin | Guarantee templates |
| Model governance | Model risk, credit policy, compliance, auditor, admin | Model cards |

### Assurance

| Screen | Roles | Purpose |
| --- | --- | --- |
| MIS analytics | Admin, credit officer, marketing, auditor, credit policy, model risk, compliance | Funnel and reason counts |
| Audit trail | Auditor, compliance, admin | Who did what |
| User access | System admin, compliance | Roles and delegation |

## B4. Command center

The command center is the opening screen for staff who are not dealers.

It shows:

- Application count
- Approval rate
- Straight-through share of approved cases
- Open early warnings
- Pipeline amount
- Offers viewed out of offers issued
- Booked loans
- Average decision turnaround in hours
- A count of applications by status

Use it to see whether the book is moving, not to work a single case. Open the queue for that.

## B5. Application queue

The queue lists reference, customer, product, amount, status, score, and SLA.

Filter by status:

- referred
- pending_second_approval
- committee
- pending_fulfilment
- approved
- declined
- disbursed

SLA is **Inside** while the due time has not passed, and **Breached** when a referred or committee case is past its due time. The demo SLA is 4 hours from submission. Cases with no SLA clock show a dash.

Click a row to open the underwriter workbench.

### Status meanings

| Status | Meaning |
| --- | --- |
| verified | Checks are done. The customer can ask for a decision. |
| approved | Engine or a person approved. Customer may read key facts and sign. |
| declined | Engine or a person declined. |
| referred | Score, policy, PEP, or amount needs a person inside delegation. |
| pending_second_approval | First approver said yes, and the amount is above the four-eyes line (Rs 1,000,000). A different person must confirm. |
| committee | Amount is above the committee line (Rs 5,000,000). Two matching votes close it. |
| accepted | Customer accepted the key facts. |
| pending_fulfilment | Signed, or approved and Islamic, but evidence is still open. Operations must finish the sequence before money moves. |
| disbursed | A loan account exists. |

### Cases already on the book

| Customer | What staff will find |
| --- | --- |
| Ayesha Khan | Personal Finance of Rs 250,000, disbursed, six instalments paid. |
| Farooq Ahmed | Personal Finance of Rs 1,200,000. Score sits in the review band, so the case is referred. |
| Nida Pervez | Personal Finance of Rs 600,000. The instalment crosses the affordability cap, so the case is declined. |
| Hamza Qureshi | SME working capital of Rs 6,000,000. Above the committee line, with the SME guarantee scheme attached. Sadia Rahman has already voted to approve. One more approve vote closes it. |
| Adeel Mir | Personal Finance of Rs 500,000. PEP flag routes it to review. |
| Usman Raza | Auto Ijarah of Rs 900,000 on a 2024 Toyota Yaris from Clifton Motors. If approved, the file waits in fulfilment for Shariah evidence. |

## B6. Underwriter workbench

Open a case from the queue. The header is the application reference and the customer name.

The left side shows product, amount, tenor, city, employer, bureau score, status, and channel, then:

- Why the engine said this (the same reasons the customer can see)
- Affordability (DBR or cash-flow cover)
- A justification box, when you are allowed to act

The right side shows the score waterfall: each factor, its contribution, the refer and approve cut-offs, probability of default, expected credit loss, the price (rate, grade, instalment), and notes already on the file.

### Who can decide here

Underwriters, credit officers, and the system admin see **Approve** and **Decline** when the status is `referred` or `pending_second_approval`.

Before you click:

1. Read the reasons and the score.
2. Write a justification of at least 20 characters. The box starts with a sample sentence; replace it with the reason for this case.
3. Confirm the amount is inside your delegation.

**Approve** records a manual decision.

- At or under Rs 1,000,000, the case becomes approved.
- Above Rs 1,000,000, the case becomes `pending_second_approval`. You cannot second-approve your own decision. A different credit user opens the same case and chooses **Second approval**.

**Decline** records a manual decline at once. Four-eyes does not apply to a decline.

If the amount is above your delegation, Horizon refuses the action. Farooq’s Rs 1,200,000 case fits Omar (limit Rs 2,000,000) and will then need Sadia, or another different approver, for the second eye. A Rs 6,000,000 SME case is committee work, not an underwriter override.

## B7. Credit committee

**Credit committee** lists every case in status `committee`: customer, reference, product, votes so far, and amount.

**Open pack** shows the amount, product, scheme, status, score, and reasons, then the votes already cast.

Write your minute and choose **Approve** or **Decline**.

Rules:

- You can vote once.
- The case must still be in committee.
- Two approve votes set the status to approved.
- Two decline votes set the status to declined.
- One vote on each side leaves the case open.

Hamza’s pack already contains Sadia Rahman’s approve vote and the SME guarantee scheme. Hina Baig or Kamran Ali can cast the second vote. Sign in as the other committee member if you already voted as Sadia; a credit officer who has voted cannot vote again under the same name.

## B8. Fulfilment

Fulfilment lists applications in `pending_fulfilment`. Each card shows the customer, product, amount, asset (or “Unsecured”), and every step in the contract sequence with its status.

**Record remaining evidence and disburse** writes evidence for each required step that is still open, then disburses. Disbursement is refused while any required step is open.

Use this after a customer has signed a straight-through product that still had a condition, and for every Islamic contract. Operations and the Shariah advisor can open this screen. The system admin can as well.

## B9. Shariah control

This screen lists applications whose contract is not conventional: Murabaha, Ijarah, Diminishing Musharakah, and Tawarruq.

Each card shows the customer, contract type, application status, and the sequence. A complete step is marked good. A pending step stays in warning.

Disbursement stays closed until the required steps are complete. Late-payment amounts on these products are charity, not income.

### Sequences the engine expects

**Conventional:** identity, key facts, contract signed, disbursement account confirmed.

**Murabaha:** identity, asset quotation, bank purchase, ownership, possession, Murabaha sale, key facts, signature.

**Ijarah:** identity, asset identified, valuation, bank purchase, ownership, possession, Ijarah contract, takaful, key facts, signature.

**Diminishing Musharakah:** identity, property valuation, partnership agreement, co-ownership, lease of the bank’s share, unit purchase schedule, key facts, signature.

**Tawarruq:** identity, commodity purchased by the bank, ownership, sale to the customer, customer’s sale of the commodity, key facts, signature.

Digital steps (identity, key facts, signature, and account confirmation where they apply) are completed when the customer signs in the app. Purchase, ownership, possession, valuation, takaful, and the commodity steps are completed by operations on Fulfilment, and reviewed here.

## B10. Dealer counter

Sign in as Noman Dealer. The counter is Clifton Motors, Karachi.

1. Choose the walk-in. Hiba Merchant is the seeded customer for this counter.
2. Enter the finance amount. The screen starts at Rs 1,800,000.
3. The customer is treated as having agreed, at the counter, to identity, bureau, and salary checks.
4. **Ask for a decision** originates an Auto Ijarah for 36 months on a 2025 Honda City valued at Rs 6,500,000.

The result shows the outcome, amount, score, and reasons.

A dealer ticket above Rs 2,000,000 is referred even when the score would otherwise pass. That rule is active in the rules studio (`DEALER_HIGH_TICKET`).

## B11. Relationship manager workbench and Customer 360

**RM workbench** is the customer book: name, segment, city, income (or cash flow), and bureau score. Open a name for Customer 360.

Customer 360 shows customer number, segment, bureau, income, CNIC, and the consent ledger. Each consent is active or withdrawn, with the channel it was given on. If the customer has not consented yet, the ledger says so.

Segments in the demo: salaried, expat, sme, thin_file.

## B12. Early warning

Signals sit on the portfolio, separate from a single application.

Bilal Hassan is seeded with an open high-severity signal: salary credits have stopped. The recommended action is a soft contact and a restructure conversation, and no new limit.

**Acknowledge** records your name and clears the open state. Acknowledged signals stay on the screen so the next reader can see who took them.

## B13. Campaigns

The seeded campaign is **Salary-day personal finance**: salaried segment, app channel, Personal Finance, at most 2 contacts in 7 days, 10% holdout.

**Run with consent and holdout** issues offers only where consent and the frequency cap allow, holds out the configured share (Nadia Control is the seeded holdout customer), and skips the rest.

The result line reports how many were issued, held out, and skipped.

Quiet hours in configuration are 22:00 to 08:00, with a wider cap of 4 contacts in 30 days. The campaign screen itself shows the campaign’s own cap and holdout.

## B14. Products

The catalogue lists every product: family, jurisdiction, name, amount band, base rate, and contract type. This screen is a reading of the live catalogue. Limits and rates used in the calculator come from here.

## B15. Rules studio

Rules are no-code policy. Each row shows the name, stage, the condition, the outcome and reason code, and the status.

Active rules in the demo:

| Rule | When | Then |
| --- | --- | --- |
| Thin-file alternative data floor | Micro Limit, thin-file, Pakistan, alternative-data quality below 50 | Decline, reason ALT_DATA_WEAK |
| Dealer tickets above 2 million are reviewed | Channel is dealer and amount is above 2,000,000 | Refer, reason DOA_ABOVE_STP |

### Add a rule

1. Sign in as someone who can draft, for example Tariq Jameel (credit policy).
2. Name the rule. The screen starts with “Cooling off after a decline”.
3. **Save draft** creates a rule that declines when duplicate applications are 3 or more, reason `COOLING_OFF`, and submits it for approval.
4. Sign in as a different checker (compliance, or another checker role). The maker cannot approve their own rule.
5. **Approve** makes the rule active. The next decision will use it.

## B16. Scorecards

Each card shows name, status, version, approve cut-off, refer cut-off, products, and factor weights.

| Scorecard | Products | Approve / refer | What it weighs |
| --- | --- | --- | --- |
| Salaried application | Personal Finance, Murabaha, Auto Ijarah | 72 / 55 | Bureau 30, affordability 25, salary continuity 20, relationship 15, balance stability 10 |
| SME cash-flow | SME Working Capital | 70 / 55 | Cash-flow stability 30, cover 30, bureau 25, relationship 15 |
| Thin-file alternative data | Micro Limit | 70 / 55 | Alternative data 40, affordability 30, wallet stability 20, relationship 10 |
| Home finance | Home Finance | 74 / 58 | Bureau 25, affordability 30, income continuity 20, relationship 15, stability 10 |
| GCC salaried | Tawarruq | 72 / 55 | Bureau 30, debt-burden headroom 30, salary continuity 25, relationship 15 |

A score at or above the approve cut-off can be approved by the engine, still subject to affordability, rules, and delegation. Between the refer and approve cut-offs, a person reviews. Below the refer cut-off, the engine declines.

**Simulate Ayesha’s features** runs that card against a fixed feature set (bureau 742, and the other values shown in the studio) and prints the score and band. It does not change a live application.

Model cards for the salaried champion and a shadow challenger live under Model governance. The challenger does not make decisions.

## B17. Regulatory packs

These are versioned parameter packs. A live bank replaces the numbers from the current circular without a code release.

The screen shows active `regulatory.dbr` layers, general to specific:

| Layer | What the demo sets |
| --- | --- |
| System | Max DBR 50%, age 18–70, offer validity 14 days, minimum cash-flow cover 1.3 |
| Pakistan | Max DBR 40%, age 21–65, offer validity 7 days, authority SBP |
| Saudi Arabia | Max DBR 33%, age 21–60, offer validity 5 days, authority SAMA, non-residents allowed |
| UAE | Max DBR 50%, age 21–65, offer validity 5 days, authority CBUAE |
| Noor Horizon overlay | Pack name only; numbers inherit |
| Home Finance product | Max DBR 50% for that product |
| SME Working Capital product | Minimum cash-flow cover 1.5 |

A more specific layer overrides only the fields it sets. Other fields inherit.

## B18. Configuration engine

Use this when you need to see which number a decision will actually use.

The form starts at key `regulatory.dbr`, jurisdiction PK, segment salaried, product PF_CONV, channel app.

**Resolve** shows:

- The value after inheritance
- The chain of layers from general to specific, with version and the fields each layer contributed

The same inheritance applies to pricing bands, the delegation matrix, fraud thresholds, the reason catalogue, and Islamic sequences. Change the key to inspect another family. Keys the decision service loads are:

- `regulatory.dbr`
- `pricing.bands`
- `doa.matrix`
- `fraud.thresholds`
- `reason.catalogue`
- `islamic.sequences`

### Delegation matrix in the demo

| Parameter | Value |
| --- | --- |
| Straight-through limit | Rs 1,500,000 |
| Four-eyes above | Rs 1,000,000 |
| Officer limit | Rs 5,000,000 |
| Committee above | Rs 5,000,000 |
| SLA | 4 hours |
| Group exposure cap | Rs 25,000,000 |

Straight-through also requires the product to be marked STP-eligible. In the catalogue that is Personal Finance and Micro Limit. Islamic products always wait for their sequence.

### Pricing bands

Grades in the demo: A from score 80 (no premium), B from 72 (+0.50 point), C from 55 (+1.50 points), D below that (+3.00 points). Floor 8%, cap 28%. Three or more relationship years: 0.50 point discount. The product’s own minimum and maximum rate still apply.

### Fraud thresholds

Two similar recent applications refer. Four decline. A device risk score of 70 or more refers. A PEP match refers.

## B19. Schemes

| Scheme | Cover | Cap | Who it is for |
| --- | --- | --- | --- |
| SME guarantee scheme | 60% | Rs 10,000,000 | Trading SMEs with 12 months of banked cash flow. Attached to Hamza’s committee case. |
| Housing support scheme | Support template, 0% guarantee cover | Rs 15,000,000 | First home, inside the configured price cap. |

Both are marked illustrative. The authority line on the screen says so. Do not treat the percentages as a live SBP or housing-scheme circular.

## B20. Model governance

Each model card shows purpose, status, limits, Gini, KS, PSI, a fairness note, the validator, and how often it is watched.

| Model | Status | Use |
| --- | --- | --- |
| Salaried scorecard | Champion | Ranks probability of default for salaried personal and auto applications. Not for thin-file or undocumented SME income. |
| Salaried challenger | Challenger | Shadow model with utility-payment regularity. Not used for decisions. |

Monitoring on the champion is quarterly PSI, KS, and override review.

## B21. MIS analytics

The funnel repeats application counts by status as bars, then lists decline and refer reason codes with counts. Use it beside the command center when you need the mix of reasons, not only the approval rate.

## B22. Audit trail

The trail lists when, who (name and role), the action, and the resource. It is written when the platform is seeded and when staff and customers do governed actions: decision, key-facts acceptance, e-sign, override, four-eyes, committee vote, and sequence evidence.

Auditors, compliance, and the system admin can open it. The trail is the record of the action. It is not an editor.

## B23. User access

Compliance and the system admin can read the directory: name, email, role, delegation, and branch. This is the same delegation the workbench enforces. Changing a person’s limit is an administration task outside this screen in the current build; the screen is the register of who can do what.

---

# Part C — How a case moves

```text
Customer sees offer
        │
        ▼
Simulates amount and tenor
        │
        ▼
Confirms prefilled application
        │
        ▼
Gives consent and verifies
        │
        ▼
Decision engine
   ┌────┴─────────────┬──────────────┐
Approve            Refer          Decline
   │                 │               │
   │            Workbench        Customer
   │            ┌────┴────┐       sees why
   │         ≤ 1m      > 1m
   │         Approved  Second approver
   │
   │         Amount > 5m ──► Committee (2 votes)
   │
   ▼
Key facts accepted
        │
        ▼
e-Sign
        │
        ├─ STP product and sequence complete ──► Disbursed ──► Schedule
        │
        └─ Islamic or open conditions ──► Fulfilment ──► Disbursed
```

Dealer origination skips the phone and starts at the counter, then uses the same engine. A dealer amount above Rs 2,000,000 is referred by rule.

Top-up starts from a booked loan, is scored again, and becomes an offer only when the engine approves.

---

# Part D — Worked examples

## A salaried customer who can finish in one sitting

1. On the welcome screen, choose **Ayesha Khan**.
2. On Home, open **Personal Finance** and choose **See what it costs**.
3. Set an amount inside Rs 50,000–1,500,000 and a tenor, and continue.
4. Confirm the prefilled details.
5. Leave identity, bureau, and salary consent on. Submit.
6. Show the decision. If it is approved, read the key facts and sign with the demo code.
7. When the screen says funds were sent, open the schedule. Auto-debit is on the 5th.

Her existing Rs 250,000 facility is already under **Loans**, with six payments made. From there you can ask for a Rs 50,000 top-up and see the re-score.

## A case a person must finish

1. Sign in as **Omar Siddiqui**.
2. Open **Application queue**, filter **referred**, and open Farooq Ahmed.
3. Read the score waterfall and write a justification.
4. Approve. Because Rs 1,200,000 is above the four-eyes line, the status becomes pending second approval.
5. Sign out. Sign in as **Sadia Rahman**.
6. Open the same case and choose **Second approval**. The status becomes approved.

## A committee case

1. Sign in as **Hina Baig**.
2. Open **Credit committee**, then Hamza Qureshi’s pack.
3. Read the score, the SME guarantee scheme, and Sadia’s existing approve vote.
4. Approve with a minute. Two approve votes set the case to approved.

## An Islamic file that cannot disburse yet

1. Sign in as **Idrees Qadri**.
2. Open **Shariah control** and find Usman Raza’s Ijarah.
3. Confirm which of valuation, purchase, ownership, possession, lease, and takaful are still pending.
4. Sign in as **Farah Naveed**, open **Fulfilment**, and record the remaining evidence. Disbursement runs only after the sequence is complete.

## A policy change with two people

1. Sign in as **Tariq Jameel**. Open **Rules studio**, name the rule, and save the draft.
2. Sign in as **Rabia Noor**. Approve the pending rule.
3. The next application is scored with that rule active. **Audit trail** shows both actions.

---

# Part E — Troubleshooting

| What you see | What to do |
| --- | --- |
| “Opening TPS LOS…” does not finish | The API on port 4000 is not running, or the browser cannot reach it. Start the backend, then refresh. |
| Staff sign-in says the request failed | Use `Los@Demo2026` and an email from the directory. |
| Decision says identity is not complete | Submit verification before asking for the decision. |
| Key facts will not open | The outcome is not approve. Referred, committee, and declined files do not sign. |
| “That code does not match” | Use the six-digit demo code on the sign screen. It changes each time the screen loads. |
| Approve on the workbench is refused | The amount is above your delegation, the justification is shorter than 20 characters, or the case is not referred or waiting for a second approval. |
| Second approval is refused | You are the same person who recorded the first override, or the case is not in `pending_second_approval`. |
| Committee vote is refused | You already voted, or the case has left committee. |
| Disburse is refused | A required Shariah or condition step is still pending, or the status is not ready. |
| Rule approval is refused | You drafted it. A different checker has to approve it. |
| Top-up comes back declined or referred | The re-score failed the cap, the score, or a stop rule such as salary credits stopping. Read the reason on the card. |
| Menu item is missing | Your role does not include that screen. Sign in as a role from the menu map. |
| Offer shelf is empty for a filter | That customer has no offer in that family. Switch to All, or open Simulate. |

---

# Part F — Glossary

| Term | Meaning |
| --- | --- |
| DBR | Debt-burden ratio. Instalments as a share of income. The Pakistan pack caps consumer DBR at 40% in the demo. |
| Cover | Business cash flow divided by the instalment. SME working capital looks for at least 1.5 times. |
| STP | Straight-through processing. The engine approves and, after signing, disburses without a person, inside the STP limit and only on STP-eligible products. |
| Four-eyes | A second, different person confirms an approval above Rs 1,000,000. |
| DOA | Delegation of authority. The amount a user may approve. |
| Score cut-off | Approve at or above the approve line. Refer between the lines. Decline below the refer line. |
| KFS | Key facts statement. Amount, tenor, instalment, rate, fee, and total cost, accepted before signature. |
| Sequence | The ordered evidence a contract needs before disbursement. |
| Holdout | A share of customers kept out of a campaign so uplift can be measured. |
| Champion / challenger | The model that makes decisions, and a shadow model that is scored beside it and does not decide. |
| PEP | Politically exposed person. A match is referred. |
| ECL | Expected credit loss shown on the workbench from the decision snapshot. |
| Reason code | A stable identifier, such as `DBR_CAP`, with customer-safe text in English, Urdu, and Arabic. |

---

# Part G — Customers in the demo

| Name | Email | City | Segment | Why they are in the book |
| --- | --- | --- | --- | --- |
| Ayesha Khan | ayesha.khan@customer.demo | Karachi | Salaried | Pre-approved after 14 salary credits. Has a disbursed loan. |
| Farooq Ahmed | farooq.ahmed@customer.demo | Karachi | Salaried | Score in the review band. |
| Nida Pervez | nida.pervez@customer.demo | Lahore | Salaried | Instalment would cross the affordability cap. |
| Hamza Qureshi | hamza.qureshi@customer.demo | Karachi | SME | Working capital above the committee threshold. |
| Sana Iqbal | sana.iqbal@customer.demo | Karachi | Thin file | Regular wallet inflows, no bureau file. |
| Adeel Mir | adeel.mir@customer.demo | Islamabad | Salaried | PEP flag routes the case to review. |
| Bilal Hassan | bilal.hassan@customer.demo | Karachi | Salaried | Salary credits have stopped. Early warning is open. |
| Nadia Control | nadia.control@customer.demo | Karachi | Salaried | Held out of campaigns. |
| Imran Farooqi | imran.farooqi@customer.demo | Riyadh | Expat | Saudi parameter pack. |
| Usman Raza | usman.raza@customer.demo | Karachi | Salaried | Auto Ijarah waiting on Shariah evidence. |
| Hiba Merchant | hiba.merchant@customer.demo | Karachi | Salaried | Walk-in at the dealer counter. |

Customer entry from the welcome screen uses the same demo identity store as staff. Customers do not use the staff password screen.

---

*End of manual. Horizon is an illustrative origination demo for Noor Horizon Bank. Confirm every limit, rate, and disclosure with the current circular before any live lending.*
