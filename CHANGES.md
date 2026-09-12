# Shiftly Roster Exchange Update

Implemented the requested consent-based roster exchange workflow.

## Core exchange behavior
- A working-day day-off request never mutates the roster immediately.
- Users can post a day-off request to the Marketplace or search for an exchange chain.
- Exchange chains support 2 through 5 participants.
- Each chain explicitly shows who replaces whose shift and the sequence of steps.
- Every participant must explicitly agree before approval.
- Pending proposals leave the live roster unchanged.
- Final roster changes are applied only after unanimous consent and after a full validation pass.
- Conflicting/stale proposals are rejected without a partial roster update.
- Multi-person exchanges have a shared exchange group chat/conversation and participant notifications.
- Recently approved exchange posts are shown in the Marketplace with participants and exchange summary.

## EH marketplace behavior
- EH is treated as a separate 5-hour full-day opportunity.
- EH reward is fixed at 2,000 TK.
- An existing EH day can be posted for sale/claim in the EH Marketplace.
- Only an employee who is already OFF on that date can claim the EH.
- An employee already rostered to work that date is blocked from claiming another person's EH.
- Normal shift exchange no longer silently creates or changes EH values.
- User-facing EH text no longer displays legacy `+2h`, `+3h`, etc. EH is shown as an `EH Day`.

## Verification
- All active `.ts`/`.tsx` source files were transpiled with TypeScript with zero syntax diagnostics.
- The exchange engine was behavior-tested with 3-person and 5-person closed-loop scenarios.
- A full `tsc --noEmit`/production build could not be completed in this environment because the project dependencies are not installed; `npm install` timed out twice. No source syntax errors were reported by the transpilation check.
