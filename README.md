## Ezra Test Suite Quick Guide

### Setup Steps
- Install dependencies: `npm install`
- Create `.env` with credentials (use `.env.example` as template) for `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, Stripe test card data, etc.
- Launch Playwright browsers once: `npx playwright install`
- To run the happy-path booking flow: `npx playwright test tests/schedule-scan-payment.spec.ts --reporter=list`
- To run the declined-card guardrail: `npx playwright test tests/schedule-scan-payment-decline.spec.ts --reporter=list`
- To run the full registration-to-payment flow: `npx playwright test tests/register-schedule-payment.spec.ts --reporter=list`

### Notes & Assumptions
- Tests target `myezra-staging.ezra.com`; update URLs if environments change.
- Stripe iframe fields appear conditionally; the page objects tolerate optional email/phone inputs.
- Time-slot availability is dynamic, so helpers fall back to the first enabled `:30` slot when the preferred time is missing.
- Questionnaire entry starts from the dashboard’s `Start` button (`DashboardPage.clickStartQuestionnaire`).
- Newly created accounts in the end-to-end flow rely on the staging environment allowing repeated test registrations.

### Scalability & Future Enhancements
- Split long end-to-end flows into reusable segments (login, scheduling, payment) to improve parallelization.
- Capture network mocks for deterministic slot availability and Stripe declines to reduce external flakiness.
- Extend coverage with additional payment edge cases (Affirm/Bank flows, promo code errors) and questionnaire completion.
- Add CI wiring (e.g., GitHub Actions) with trace/video artifacts to surface regressions automatically.

