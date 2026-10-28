# ZITADEL cross-project role claims

Fallstack reads `employee` from its own ZITADEL project and `admin` from the
shared NEI project. A valid NEI admin assignment can otherwise produce an app
session with `admin: false` and leave the user in the student area.

## Required project settings

Apply these settings independently on `auth.nei-isep.org` and
`auth.dev.nei-isep.org`, using each environment's project IDs and OIDC client.

1. Open **Projects > Fallstack > General**.
2. Turn **Return user roles during authentication** off and save.
   This is the project-level `ProjectRoleAssertion` setting, also called
   **Assert Roles on Authentication** in older versions.
3. Keep the web application's ID-token and access-token role assertion settings
   enabled. Keep existing role assignments and authentication restrictions.
4. Request roles explicitly through `AUTH_SCOPES`, including the NEI project
   audience. The repository defaults include both project audiences:

   ```dotenv
   AUTH_SCOPES="openid email profile urn:zitadel:iam:org:projects:roles urn:zitadel:iam:org:project:id:fallstack_project_id:aud urn:zitadel:iam:org:project:id:nei_global_project_id:aud"
   AUTH_ROLE_CLAIM="urn:zitadel:iam:org:project:fallstack_project_id:roles"
   AUTH_GLOBAL_ROLE_CLAIM="urn:zitadel:iam:org:project:nei_global_project_id:roles"
   ```

   Replace the placeholder IDs with the matching environment's IDs. Existing
   scopes such as `offline_access` may remain. Avoid adding specific
   `urn:zitadel:iam:org:project:role:*` scopes: they filter returned role keys.

This workaround changes only the Fallstack project's automatic role assertion.
The NEI project's own assertion setting can remain enabled. Changing only this
ZITADEL setting needs no app deployment or database migration.

## Why automatic assertion breaks global admins

[ZITADEL issue #12673](https://github.com/zitadel/zitadel/issues/12673) describes
the interaction between automatic role assertion and cross-project claims.
Automatic assertion adds role scopes for the authenticating project's role
keys. Fallstack defines only `employee`, so the resulting requested-role filter
also excludes the NEI project's `admin` role. An audience scope alone does not
remove that implicit filter.

With automatic assertion disabled, the explicit
`urn:zitadel:iam:org:projects:roles` scope requests roles for the project
audiences without injecting the `employee` filter. ZITADEL can then return the
project-qualified NEI `admin` claim and Fallstack `employee` claim according to
the user's existing assignments. Keep this workaround until an upstream fix is
deployed and verified. See ZITADEL's [reserved scopes](https://zitadel.com/docs/apis/openidoauth/scopes).

## Verify after changing an environment

Reload the project settings and confirm the checkbox remains off. Then use
fresh application logins; an existing signed app cookie retains its old role
claims for up to eight hours.

- **NEI admin:** sign out of Fallstack and sign in with an account assigned the
  NEI `admin` role. Confirm `/overview` opens and `/api/auth/session` returns a
  non-null `adminRole` matching the account's local admin tier. An admin without
  a local tier defaults to `SUPER_ADMIN`.
- **Student:** use an existing student without the NEI `admin` role. Confirm
  `/api/auth/session` returns `adminRole: null` and the admin area denies access.
- **Employee:** use an existing account with the Fallstack `employee` role and
  a linked employee profile. Confirm its session still has `role: "EMPLOYEE"`
  and the company dashboard opens.

When inspecting the provider response, the configured global role claim must
contain an `admin` key for an NEI admin. Inspect only the required role fields;
keep authorization codes, tokens, cookies, and secrets out of logs and PRs.

These checks require the hosted identity provider and real role assignments.
Local application tests cannot reproduce ZITADEL's automatic scope injection;
record the environment and checks actually performed in the PR.
