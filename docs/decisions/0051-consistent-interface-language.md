# 0051: Consistent interface language across account roles

- Status: Accepted
- Date: 2026-11-17

## Context

The public event route and header supported English while student, employee,
admin, authentication and policy screens still displayed Portuguese. Several
seeded FAQ English fields also contained copied Portuguese content.

## Decision

Reuse `useLanguage` and the `fallstack-language` cookie for interface copy.
`UiLanguageProvider` supplies the selected language to client components;
`useUiText` translates their explicit display strings and interpolates values.
Server pages use the request language already set by middleware through
`getUiText` / `getUiLanguage`. Small server-rendered labels can use `UiText`
without turning their parent into a client component or passing server render
callbacks across the client boundary.

Keep stored identifiers, enum values, submitted field names, user names,
biographies, comments and URLs unchanged. Translate enum labels at display
boundaries. Unknown user-created content remains unchanged. Do not translate
rendered DOM or change authentication grants to provide language support.

Repair the known seeded FAQ entries through a migration, preserving Portuguese
and independently preserving existing custom English questions and answers.
Administrators continue to own subsequent FAQ edits in the database.

## Consequences

Shared labels, forms and validation messages now follow the same preference.
New interface strings need both Portuguese and English copy. The existing
client hook restores a saved cookie after hydration; public event route
language takes precedence. The static public layout does not read cookies on
the server, preserving its request-independent caching contract.

Inactive accounts receive an explanation and sign-out/account-switch action,
while normal session and route authorization remain enforced. Partners without
a usable destination are displayed without links. Event-hour guidance points
to the database-backed programme instead of duplicating a conflicting closing
time. Dinner and interview details link to the existing support contact until
organisers publish specific participation information.
