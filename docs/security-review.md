# Security review — 4 October 2026

## Scope and improvements

Reviewed authentication, session cookies, permission and ownership enforcement, SQL query construction, request handling, static serving, and server/client separation of secrets.

- Mutation origin checks now compare scheme, host, and port. A matching hostname with a different HTTP/HTTPS scheme no longer passes.
- Requests identified by browser Fetch Metadata as cross-site are rejected before body parsing or authentication work.
- API rate limiting runs before JSON parsing and includes the database health endpoint.
- API error responses, including malformed and oversized JSON, carry `Cache-Control: no-store`.
- Login rejects unexpected request fields. Express's identifying header is explicitly disabled.
- Production startup requires secure cookies and a configured public HTTPS origin. Local HTTP development remains supported.

Existing protections verified by tests include salted scrypt password hashes, hashed session tokens, HttpOnly/SameSite cookies, expiry and logout, session revocation after member access changes, administrator-only account creation, and per-account record ownership. Queries use parameters for submitted values; interpolated table/column names in reviewed routes come from fixed application lists.

## Production configuration

Set these in the deployment environment, using your actual domain:

```dotenv
NODE_ENV=production
COOKIE_SECURE=true
APP_ORIGIN=https://your-domain.example
```

An HTTPS reverse proxy must terminate TLS and forward to the local Node server. Startup validation checks configuration; it does not install or verify that proxy. Keep MySQL and phpMyAdmin private. Proxy-aware client IP configuration remains a deployment task: the app currently leaves Express proxy trust disabled, so limits behind a proxy can apply to its shared IP. Do not enable blanket proxy trust.

## Verification and limits

62 automated tests passed, including full-origin checks, production configuration rejection, body limits, error caching headers, and health rate limiting. Tests use an in-memory database double; this is not a penetration test or a verification of the deployed infrastructure.

The npm production-dependency audit was attempted but could not reach the npm advisory endpoint. No clean dependency audit is claimed; retry `npm audit --omit=dev` when registry access is available. No dependency versions were changed by this review.

Remaining improvements before broader public use include administrator MFA, a durable security event log, deployment-specific distributed rate limiting, and tested backup restoration. No database schema change is required for this patch. Restart the Node server to apply it.
