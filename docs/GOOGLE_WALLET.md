# Google Wallet infrastructure

This guide covers the Google Wallet issuer, credentials, Generic Class, and
publishing setup. The application contract lives in `src/config/env.server.ts`,
`src/application/services/googleWalletService.ts`, and `POST /api/wallet`.

The Fallstack Wallet pass is a **Generic Pass** used as another presentation
surface for the existing attendee identifier. It is not an event ticket and the
Fallstack application remains the source of truth.

## Prerequisites

Before enabling Google Wallet for attendees, the project needs:

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
   If the `iam.disableServiceAccountKeyCreation` organization policy blocks this
   step, ask the GCP organization administrator to approve the credential plan.
3. Copy the service account email.
4. In the Google Pay & Wallet console, open **Users** and invite that service
   account email with the **Developer** role.
   Do not grant the service account GCP project IAM roles just for Wallet access;
   the Wallet issuer invitation grants the required access.
5. Store the JSON key only in the relevant secret store (local untracked `.env`
   for development, Coolify environment/secret configuration for hosted
   environments). Never commit the JSON key or private key material.

Official credential documentation:
https://developers.google.com/wallet/generic/getting-started/auth/rest

The application uses this server-only configuration contract:

| Variable                                 | Secret  | Purpose                                                          |
| ---------------------------------------- | ------- | ---------------------------------------------------------------- |
| `GOOGLE_WALLET_ISSUER_ID`                | No      | Google Wallet Issuer ID.                                         |
| `GOOGLE_WALLET_CLASS_ID`                 | No      | Full Generic Class ID (`issuerId.suffix`) for that environment.  |
| `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64` | **Yes** | Base64-encoded service-account JSON, decoded only on the server. |

All three variables are optional at process startup so environments without
Wallet can still boot. Configure all three before exposing the Wallet action in
an environment; otherwise `POST /api/wallet` returns 503. Base64 is only a
transport format; it does not make the credential non-secret.

Encode the **complete** JSON key file as a single line of standard base64 with
padding. The decoded JSON must contain `client_email` and `private_key`.

```sh
base64 -w0 key.json # Linux (GNU coreutils)
base64 -i key.json  # macOS
```

On Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path ./key.json)))
```

Paste the resulting single line into `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64`
in the secret store. Do not paste the JSON key or encoded value into a ticket,
PR, log, or chat.

## 4. Create the Fallstack Generic Class

Create a **Generic** pass class in the Google Pay & Wallet console.

Use a separate class per hosted environment so staging changes cannot alter the
production pass presentation. Suggested suffixes:

- `fallstack-2026-dev`
- `fallstack-2026-staging`
- `fallstack-2026`

A class ID has the form `ISSUER_ID.SUFFIX`.
Keep object IDs isolated by environment too. The application now derives each
object ID from the configured class ID and student ID, so use a distinct class ID
for every environment. A separate issuer for non-production adds another layer
of isolation when staging data is cloned from production.

The class should contain only shared Fallstack 2026 presentation data (brand,
logo/hero assets and common labels). Attendee-specific data belongs in the
Generic Object created by the application.

Official class/object documentation:
https://developers.google.com/wallet/generic/use-cases/create

## 5. Create a demo Generic Object

To validate the infrastructure before enabling the application flow, create one
demo object using Google's Generic Pass sample/codelab or REST API. Use a
disposable, environment-scoped object suffix, for example
`fallstack-2026-staging-demo-<timestamp>`.

Minimum useful shape:

```json
{
  "id": "ISSUER_ID.fallstack-2026-staging-demo-123",
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

For an infrastructure demo only:

1. Sign in to a non-production Fallstack environment as a test student.
2. Obtain a fresh `GET /api/qrcode` response (the profile QR UI already calls
   this endpoint).
3. Use the returned `data` JWT as the demo object's `barcode.value`.
4. Add the demo pass to a test Google Wallet account.
5. Scan it with an authenticated company/employee test account **within the
   30-minute validity window**.
6. Confirm the existing save/profile flow behaves the same as scanning the web
   QR.

Do **not** treat that short-lived JWT as the application design. A Wallet pass is
persistent, so the application uses the existing attendee code and the scanner
recognizes it instead of embedding a JWT that expires after 30 minutes. See
`src/application/services/googleWalletService.ts` and the QR scanner component.

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

Do this early: approval is external to the Fallstack deployment process. Do not
expose the Wallet action to attendees while basic issuer setup is incomplete.

## 8. Environment and secret placement

| Environment | Class                           | Credential location        | Notes                                                  |
| ----------- | ------------------------------- | -------------------------- | ------------------------------------------------------ |
| Local/dev   | Dedicated dev class             | Local untracked `.env`     | Use only test accounts; never commit the JSON key.     |
| Staging     | Dedicated staging class         | Coolify staging secrets    | Main end-to-end validation target before release.      |
| Production  | Production Fallstack 2026 class | Coolify production secrets | Only use after publishing access and final validation. |

Prefer distinct service-account keys per hosted environment if operationally
possible. Revoke/rotate keys that are no longer needed. Service-account material
must remain server-side; no Wallet private key or service-account JSON may be
exposed through `NEXT_PUBLIC_*` variables or sent to the browser.

In Coolify, set the three `GOOGLE_WALLET_*` values as **runtime** variables for
the `web` service, not Docker build arguments. The `web.environment` mapping in
`docker-compose.app.yml` must pass them into the container. Confirm this before
deployment; a value present in Coolify but absent from that mapping is invisible
to `src/config/env.server.ts`. Keep the service-account value secret and out of
image layers. `NEXT_PUBLIC_BASE_URL` must point at the actual public host for
each environment because the Save-to-Wallet JWT derives its allowed origin from
that URL.

## Operational handoff

Issue #340 is complete when the external issuer/project/API/service-account
setup exists, the demo Generic Pass works end-to-end, publishing access has been
requested, and the concrete environment values/secret locations are recorded.

PR #364 implements the application flow listed below and follows this merged
infrastructure guide (#363). The external setup and real-device validation in
#340 remain separate operational steps:

- authenticated endpoint/service for a student's Wallet object;
- ownership enforcement;
- deterministic/idempotent object IDs;
- safe handling of repeated Add-to-Wallet requests;
- the persistent Wallet QR/identifier design;
- the user-facing **Add to Google Wallet** action;
- unit/integration/UI tests.
