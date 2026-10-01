# Demo script

Fresh database, then `npm run seed`. Sign in at `/office/login` as `admin`. Change the password when asked.

## Back office setup

1. Access control: create a role such as Credit Analyst, pick permissions, set a delegation limit, and save.
2. Create a second user and assign that role. Self-authorisation turns off once another active user holds the checker permission.
3. Product factory: open a published product or create a draft, walk the steps, simulate the key facts, submit, approve with a reason while you are the only checker, then publish.
4. Configuration, Forms: add `vehicle_colour` from the field registry to the Auto Ijarah application form and publish. Retiring `gross_monthly_income` lists the live references and is blocked while a rule still uses it.

## Customer

1. On the phone, create an account with a new mobile (`03XXXXXXXXX`) and a 13-digit identity number. The code appears in the SMS inbox. Confirm the identity, then set a password of at least 12 characters.
2. Browse published products, open one, move the amount and tenor, run quick eligibility, and start the application.
3. Complete the form (it is the published form, including any field you added), upload the documents, accept the consents, and submit.
4. The tracker shows Application received, then Under review. The case is in the back-office work queue. The customer cannot decide the case.

## Credit and booking

1. Open the queue, verify documents (or reject one: the customer sees Action needed and can upload again).
2. Run underwriting. Approve only when every deviation is closed and the amount is inside the role limit. Otherwise refer the case up.
3. The customer gets an in-app notice that the offer is ready, opens the key facts, and accepts with the code from the SMS inbox.
4. Complete the repayment mandate on the case and disburse. A loan account, schedule and balanced journals are stored. The customer sees Funds sent and the loan under My loans.
5. Pay an instalment from the phone. A receipt notice is stored.

## After booking

1. System: run end of day, or run to a later date. Unpaid loans pick up days past due, a collections case is opened, and classification and provisioning follow the regime. Trial balance and the reconciliation controls are calculated from journals and loan balances.
2. Collections: log an action (only between 09:00 and 19:00) and a promise to pay.
3. Restart the API. The same loans, journals and applications are still there.

## Decline path

Register a customer whose identity number ends in `0002`. Submit an application. Pre-screen declines it with a neutral message and a reason code. `0003` parks for compliance. `0004` stops at identity verification.
