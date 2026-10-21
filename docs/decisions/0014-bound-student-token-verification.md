# 0014: Bound student-token verification per employee

Status: Accepted
Date: 2026-10-21
Source: [Issue #393](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/393)

## Context

Four-character student codes can be guessed through the employee preview-token
endpoint. Checking a failure counter after an asynchronous lookup permits
unbounded parallel guesses. Reserving before each concurrent lookup instead
rejects valid scan bursts while those lookups are pending.

## Decision

Serialize verification per authenticated employee within each process. Reserve
one of five attempts before the lookup; keep it for an unknown code, refund it
for a valid code or infrastructure error. Waiting requests recheck the budget
when they enter verification. Other employees proceed independently.

After five invalid codes within a 60-second fixed window, reject all subsequent
requests with 429 and `Retry-After` until reset, including valid codes. Determining
whether a submitted code is valid requires the very lookup being limited;
allowing that lookup after exhaustion would preserve the enumeration oracle.
Valid scans do not consume the failure budget, but concurrent scans wait their
turn and a typo lockout requires waiting for reset. Five failures per minute is
the initial policy; confirm usability with event-day staging traffic.

The schema rejects malformed input before verification. Accepted input is a
normalized four-character alphanumeric string used in a parameterized unique
lookup and a fixed JWT payload. Unknown codes return null, not an exception;
lookup or signing exceptions indicate infrastructure/configuration failure and
do not consume the invalid-code budget.

Audit warnings contain event name, a SHA-256 fingerprint of the employee UUID,
and retry duration where applicable. The fingerprint correlates attempts while
preserving the logger’s raw-identifier redaction policy. They exclude submitted
codes, raw employee IDs, and JWTs.

## Consequences

This is single-process traffic shaping, not distributed brute-force protection.
With N replicas the failure budget can reach 5 × N per employee per window;
restarts reset state and fixed-window boundaries permit adjacent bursts.
Multiple employee accounts have independent budgets. Use shared atomic state
before relying on this limit across replicas. No database migration is needed.

One slow lookup delays that employee's queued scans. Queues are removed when
idle and released on errors. This bounds concurrent student lookups per employee,
not the number of incoming HTTP requests or total traffic across employees.
