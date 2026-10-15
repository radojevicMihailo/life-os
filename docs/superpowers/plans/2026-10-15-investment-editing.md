# Investment editing implementation plan

> **For agentic workers:** Use superpowers:executing-plans for root integration and dispatching-parallel-agents for the independently owned backend correction implementation and invariant review. Steps use checkbox syntax.

**Goal:** Add the requested IBKR instrument, support NASDAQ/IBIS/IBIS2, hide completed opening forms, and edit opening positions plus subsequent buys/sells.

**Architecture:** Reuse the existing investment, journal correction, and FIFO models. Corrections retain original investment records and immutable journal postings, reverse only the changed cash journal, add a replacement, and rebuild derived FIFO allocations for affected account/instrument pairs in one transaction. Presentation uses posted records only and exposes correction forms per activity and per open position.

**Tech Stack:** Installed Next.js 16.3.2, React 19, Drizzle, PostgreSQL, Vitest.

**Spec:** User requests in this conversation on 2026-10-15, including the explicit answer “I kasnije kupovine/prodaje”. Preserve quantities and acquisition facts until the user submits an edit.

## Global constraints

- Do not increase costs or materially change hosting/services without explicit approval. Fly remains 512 MB.
- Do not edit production financial trades for testing. Only add the explicitly requested IBKR catalogue instrument through its validated UI.
- Retain existing journal immutability and correction chains; no schema migration is required.
- Read installed Next.js guides before changing page/actions/cookies.
- Leave unrelated AGENTS.md preference changes out of implementation commits.

## Review focus

- Editing an already sold acquisition recalculates later FIFO costs without changing unrelated pairs.
- A historical sale that becomes impossible causes a full rollback, including cash and reversal records.
- Repeated or simultaneous correction of the same record cannot reverse twice.
- Same-day date-only editing preserves the original hidden timestamp and FIFO tie ordering.
- Corrected/reversed acquisitions and disposals cannot leak into active basis or realized totals.

### Task 1: Exchange identity and immediate confirmed quote

Files: Alpha parser and adapter unit test, application/investments.ts and integration/application/investments.test.ts.

- [x] Prove NASDAQ resolution fails and verified instrument quotes are discarded.
- [x] Match exact US symbols for NASDAQ and persist the verified quote with the instrument atomically.
- [x] Treat IBIS and IBIS2 as the verified Xetra listing family, retain distinct broker labels in the UI.
- [x] Verify wrong currency/listing remains rejected.

### Task 2: Atomic investment corrections

Files: new application/investment-corrections.ts, investments repository, ports/api-errors, focused integration tests.

Interface: `correctInvestmentTransaction(deps, { originalId, investmentAccountId, instrumentId, quantity, grossAmount, feeAmount, tradeCurrencyCode, tradeFxRateToEur, occurredAt, preserveTimeOnSameDate? }): Promise<{id:string}>`.

- [x] Add failing cases for opening, buy and sell correction, historical FIFO changes, rollback, cross-account edits, repeat/concurrent edits.
- [x] Implement validated original-to-replacement links, cash reversal, affected-pair FIFO rebuilding and posted filters.
- [x] Run `pnpm exec vitest run tests/finance/integration/application/investment-corrections.test.ts --maxWorkers=1` and nearest investment tests.
- [x] Review rounding, lock ordering and derived realized/open basis.

### Task 3: User controls

Files: investment read model, investment forms/page/actions and form parser.

- [x] Add authenticated server action to remember opening setup visibility in a browser cookie.
- [x] Add “Završi početni unos” and “Prikaži početne pozicije”, preserving existing records.
- [x] Add explicit NASDAQ, IBIS and IBIS2 exchange options.
- [x] Add prefilled edit forms for initial buys and cash-affecting buys/sells; label total amount as excluding fees.
- [x] Expose edits from both position cards and activity history, including sold-out positions.
- [x] Fold the detailed FIFO list under a disclosure with a plain-language explanation; retain it for calculations.

### Task 4: Verify and deliver

- [x] Run focused parser/form tests, investment correction integration suites, full unit suite, scoped ESLint and production build.
- [x] Review the correction implementation independently.
- [ ] Commit only this task's files, push once, watch the existing deployment.
- [ ] Add IBKR using the repaired validated form; verify a current quote and empty initial-position form exist without entering quantity or purchase facts.
- [ ] Verify hide/reopen and refresh persistence through the UI; restore the opening form visible so the user can enter IBKR.
- [ ] Inspect edit fields on existing entries without saving financial mutations.
