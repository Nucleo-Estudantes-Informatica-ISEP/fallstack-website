# Google Wallet infrastructure

This document covers the infrastructure/onboarding work tracked by issue #340.
It intentionally does **not** implement the attendee-facing Wallet integration from
#3.

The Fallstack Wallet pass is a **Generic Pass** used as another presentation
surface for the existing attendee identifier. It is not an event ticket and the
Fallstack application remains the source of truth.

## What #340 must deliver

Before #3 starts, the project needs:

- a Google Wallet API Issuer account owned by NEI-ISEP;
- a Google Cloud project for the Wallet integration;
- the Google Wallet API enabled on that project;
- a service account authorized as a Developer on the Wallet Issuer account;
- a Fallstack 2026 Generic Class for testing;
- at least one demo Generic Object that can be added to Google Wallet;
- a verified QR/barcode rendering and scan against the existing Fallstack flow;
- publishing access requested in the Google Pay & Wallet console;
- the environment-specific identifiers and secret locations recorded here.

## 1. Create or confirm the Wallet Issuer account

1. Open the Google Pay & Wallet console with the Google account that should own
   the NEI-ISEP issuer.
2. Create the Google Wallet API Issuer account if one does not already exist.
3. Use the public organization name for the issuer/business profile.
4. Record the numeric **Issuer ID** in the project password manager/ops notes.
   The Issuer ID is configuration, not a private key, but it should still be
   managed deliberately rather than hard-coded throughout the application.

New issuers start in **Demo Mode**. While in Demo Mode, passes can only be issued
to Wallet users who are issuer Admins/Developers or explicitly configured test
accounts.

Official onboarding documentation:
https://developers.google.com/wallet/generic/getting-started/issuer-onboarding

## 2. Create/select the Google Cloud project

1. Create a dedicated Google Cloud project for the Fallstack Wallet integration,
   or select the existing NEI-ISEP project if infrastructure policy requires it.
2. Enable the **Google Wallet API** in that project.
3. Record the GCP project ID in ops documentation. The application does not need
   to expose this value to the browser.

## 3. Create and authorize the service account

1. Create a service account in the chosen GCP project.
2. Create a JSON key for it for the initial server-side integration.
3. Copy the service account email.
4. In the Google Pay & Wallet console, open **Users** and invite that service
   account email with the **Developer** role.
5. Store the JSON key only in the relevant secret store (local untracked `.env`
   for development, Coolify environment/secret configuration for hosted
   environments). Never commit the JSON key or private key material.

Official credential documentation:
https://developers.google.com/wallet/generic/getting-started/auth/rest

When #3 is implemented, the intended server-only configuration contract is:

| Variable | Secret | Purpose |
| --- | --- | --- |
| `GOOGLE_WALLET_ISSUER_ID` | No | Google Wallet Issuer ID. |
| `GOOGLE_WALLET_CLASS_ID` | No | Full Generic Class ID (`issuerId.suffix`) for that environment. |
| `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64` | **Yes** | Base64-encoded service-account JSON, decoded only on the server. |

These variables are documented now so infrastructure can be prepared before #3,
but they should only be added to the application's validated runtime schema when
#3 starts consuming them. Base64 is only a transport format; it does not make the
credential non-secret.

## 4. Create the Fallstack Generic Class

Create a **Generic** pass class in the Google Wallet Business Console.

Use a separate class per hosted environment so staging changes cannot alter the
production pass presentation. Suggested suffixes:

- `fallstack-2026-dev`
- `fallstack-2026-staging`
- `fallstack-2026`

A class ID has the form `ISSUER_ID.SUFFIX`.

The class should contain only shared Fallstack 2026 presentation data (brand,
logo/hero assets and common labels). Attendee-specific data belongs in the
Generic Object created by #3.

Official class/object documentation:
https://developers.google.com/wallet/generic/use-cases/create

## 5. Create a demo Generic Object

Before #3 is implemented, create one demo object using Google's Generic Pass
sample/codelab or REST API. Use a disposable object suffix, for example
`fallstack-2026-demo-<timestamp>`.

Minimum useful shape:

```json
{
  "id": "ISSUER_ID.fallstack-2026-demo-123",
  "classId": "ISSUER_ID.fallstack-2026-staging",
  "state": "ACTIVE",
  "cardTitle": {
    "defaultValue": {
      "language": "pt-PT",
      "value": "Fallstack 2026"
    }
  },
  "header": {
    "defaultValue": {
      "language": "pt-PT",
      "value": "Participante de teste"
    }
  },
  "barcode": {
    "type": "QR_CODE",
    "value": "FRESH_FALLSTACK_QR_VALUE"
  }
}
```

The Google Wallet API requires object IDs to be unique for the issuer and the
object must reference an existing Generic Class.

### Important: current Fallstack QR expiry

The current student QR is **not static**. `GET /api/qrcode` returns a signed JWT
containing the student's code with a 30-minute expiry. The existing company scan
flow sends that scanned JWT to `/api/saved`, where it is verified before the
student is saved.

For the #340 demo only:

1. Sign in to a non-production Fallstack environment as a test student.
2. Obtain a fresh `GET /api/qrcode` response (the profile QR UI already calls
   this endpoint).
3. Use the returned `data` JWT as the demo object's `barcode.value`.
4. Add the demo pass to a test Google Wallet account.
5. Scan it with an authenticated company/employee test account **within the
   30-minute validity window**.
6. Confirm the existing save/profile flow behaves the same as scanning the web
   QR.

Do **not** treat that short-lived JWT as the final design for #3. A Wallet pass
is persistent, so #3 must use a stable, revocable identification representation
that the backend can safely resolve (or explicitly extend the scanner to accept
the existing attendee code) instead of embedding a JWT that expires after 30
minutes.

## 6. Add Wallet test users

While the issuer remains in Demo Mode, add the Google accounts used for staging
validation as Wallet test accounts, unless they already have Admin/Developer
access on the issuer.

Verify on a real Android device that:

- the pass can be added from the generated Add to Google Wallet link/button;
- the Generic Pass branding renders as intended;
- the QR is visible and scannable;
- the scanned value reaches the normal Fallstack identification flow.

## 7. Complete the Business Profile and request publishing access

Publishing access is required before passes can be issued to arbitrary Google
Wallet users. Before requesting it:

1. Complete the Wallet **Business Profile**.
2. Ensure at least one Passes Class exists.
3. Keep the demo pass available for review/testing.
4. In the Google Pay & Wallet console, open **Google Wallet API** and choose
   **Request publishing access**.
5. Track the request/approval status in issue #340.

Official publishing documentation:
https://developers.google.com/wallet/generic/test-and-go-live/request-publishing-access

Do this early: approval is external to the Fallstack deployment process and #3
should not be left waiting on basic issuer setup.

## 8. Environment and secret placement

| Environment | Class | Credential location | Notes |
| --- | --- | --- | --- |
| Local/dev | Dedicated dev class | Local untracked `.env` | Use only test accounts; never commit the JSON key. |
| Staging | Dedicated staging class | Coolify staging secrets | Main end-to-end validation target before release. |
| Production | Production Fallstack 2026 class | Coolify production secrets | Only use after publishing access and final validation. |

Prefer distinct service-account keys per hosted environment if operationally
possible. Revoke/rotate keys that are no longer needed. Service-account material
must remain server-side; no Wallet private key or service-account JSON may be
exposed through `NEXT_PUBLIC_*` variables or sent to the browser.

## Handoff to #3

Issue #340 is complete when the external issuer/project/API/service-account
setup exists, the demo Generic Pass works end-to-end, publishing access has been
requested, and the concrete environment values/secret locations are recorded.

Issue #3 then owns the application work:

- authenticated endpoint/service for a student's Wallet object;
- ownership enforcement;
- deterministic/idempotent object IDs;
- safe handling of repeated Add-to-Wallet requests;
- the persistent Wallet QR/identifier design;
- the user-facing **Add to Google Wallet** action;
- unit/integration/UI tests and staging validation.
