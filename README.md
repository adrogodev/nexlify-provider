# nexlify-provider

[![CI](https://github.com/adrogodev/nexlify-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/adrogodev/nexlify-provider/actions/workflows/ci.yml)

HTTP provider service for the **Nexlify** platform, a transactional email service for LatAm businesses. It onboards client companies, issues access credentials and hashed API keys, holds the platform-wide email configuration (SMTP), sends emails (single or bulk, from templates), tracks what happens after sending (bounces, unsubscribes, replies), issues verifiable delivery certificates and notifies clients through signed webhooks.

- **Stack**: NestJS 11 · TypeScript · Prisma 7 (PostgreSQL) · nodemailer + react-email · JWT (HS512) · bcrypt password hashing · pdfkit · Anthropic SDK (optional AI)
- **Architecture**: clean/hexagonal layering — `src/presentation` (controllers, guards, server) → `src/core/application` (use cases, contracts, DTOs, mappers) → `src/core/domain` (entities, exceptions, enums, models) → `src/infrastructure` (Prisma repositories, helpers, services, environment).
- **API reference**: `docs/openapi.json` is the hand-written, single source of truth of the API. It is served with Scalar at `/api/docs` (raw JSON at `/api/docs-json`).
- **Front**: the admin dashboard, the client portal and the public certificate verification live in the separate `nexlify` repository.

## How it works

1. The admin configures the SMTP server and the sender account (`api/smtp-server`, `api/configuration`). Without it, sending is rejected.
2. The admin registers a client (`api/client/register`). The client starts as `HABILITACION_PENDIENTE` and receives a credential-assignment email.
3. The client opens the link (front `/portal/activate`), sets username and password (`api/client/assign-credentials`) and becomes `ACTIVO`.
4. The admin generates the client's API key (`api/nexlify-keys/generate`). Its system sends with `X-API-Key` through `api/email/send` (single) or `api/email/diffuse` (bulk, queued).
5. Each send checks the daily limit, the template variables and the suppression list, adds `List-Unsubscribe`, DKIM-signs when the sender domain is verified and goes out through SMTP. Failures are retried by a scheduler.
6. Bounces, unsubscribes and replies come back through signed endpoints, update the email state and, for replies, run the optional AI analysis. Clients are notified through signed webhooks.
7. A sent email can be certified (`NXC-…` code, PDF) and verified publicly without revealing its content.

## Run

```bash
pnpm install
pnpm db:migrate         # prisma migrate deploy (applies the committed migrations)
pnpm db:seed            # creates the platform admin_user from env vars (idempotent)
pnpm db:seed:templates  # upserts the LatAm Spanish email templates by name (idempotent)
pnpm start:dev          # development server (port from PORT env)
pnpm test               # unit tests (Jest)
pnpm test:e2e           # e2e smoke tests (no live database required)
pnpm build              # production build
```

> A database created before the migrations existed needs a one-time baseline before the first deploy: `pnpm prisma migrate resolve --applied 0_init`.

## Docker

`deploy/docker-compose.yml` runs the whole stack. It expects the front repository as a sibling folder (`<root>/nexlify-provider` and `<root>/nexlify`). From the provider root:

```bash
cp deploy/stack.env.example deploy/.env   # then fill the secrets (deploy/.env is gitignored)
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build                   # postgres + provider + front
docker compose -f deploy/docker-compose.yml --env-file deploy/.env --profile local up -d --build   # + Mailpit (fake SMTP inbox on :8025)
```

| Service | Port | Notes |
| --- | --- | --- |
| `postgres` | internal | postgres:16-alpine with a persistent volume and a health check |
| `provider` | 3600 | Built from this repo (Node 24, non-root). Health check: `GET /api/verify` |
| `front` | 3000 | Built from `../../nexlify`; talks to the provider over the internal network |
| `mailpit` | 8025 | Only with the `local` profile |

The provider entrypoint runs `prisma migrate deploy` when `RUN_MIGRATIONS` is `true` (default) and the seeds when `RUN_SEED=true`, then starts `node dist/src/main`.

## Environment variables

Required (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP listen port |
| `NODE_ENV` | `development` / `staging` / `production` |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Initial platform admin (used by the seed script) |
| `PLATFORM_URL` | Public base URL of the client portal, e.g. `https://app.example.com/portal`. Emails link to `${PLATFORM_URL}/activate?token=…` (credential assignment) and `${PLATFORM_URL}/reset-password?token=…` (password recovery) |
| `CORS_ORIGINS` | Optional, comma-separated extra browser origins allowed by CORS. The origin of `PLATFORM_URL` is always allowed; requests without an `Origin` header (server-to-server clients with `X-API-Key`) are not affected |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | HS512 signing key for all issued tokens |
| `JWT_EXPIRATION_TIME` | Session token lifetime, in hours |
| `ENCRYPT_KEY` | AES-GCM key protecting tokens stored at rest |
| `MAILER_TLS_REJECT_UNAUTHORIZED` | Optional, defaults to `true`. Only set `false` for local SMTP relays with self-signed certificates. |
| `INBOUND_WEBHOOK_SECRET` | HMAC secret of the signed inbound (`api/email/inbound`) and bounce (`api/email/events/bounce`) webhooks |
| `PUBLIC_API_URL` | Optional, defaults to `http://localhost:${PORT}`. Public base URL of this API, used to build `List-Unsubscribe` links and certificate verification links. |
| `ANTHROPIC_API_KEY` | Optional. Enables the AI reply intelligence; without it the feature reports itself disabled and nothing fails. |
| `ANTHROPIC_MODEL` | Optional, defaults to `claude-opus-5-5`. Claude model used for reply analysis. |
| `RUN_MIGRATIONS` / `RUN_SEED` | Docker only. Startup behavior of the entrypoint (defaults `true` / `false`; compose sets `RUN_SEED=true`). |

> `JWT_SECRET_KEY` and `ENCRYPT_KEY` are required: requests with an empty value fail fast instead of falling back to default secrets.
>
> UUID identifiers (`emails.email_uuid`, `templates.id_template`) are generated **by the database** with `gen_random_uuid()` (Prisma `@default(dbgenerated(...))`); the code never emits a v4 uuid except for the password-recovery jti. `gen_random_uuid()` is built-in for PostgreSQL ≥ 13; add `CREATE EXTENSION IF NOT EXISTS pgcrypto;` for older versions.

## Data model (20 tables)

`admin_user` (platform admins) · `clients` (companies/persons) · `client_credentials` (login, encrypted `auth_token`/`recovery_token`) · `nexlify_keys` (SHA-256 hashed client API keys) · `nexlify_keys_logs` (API key audit) · `smtp_servers` (SMTP provider catalog) · `diffusion_information` (per-client mail credentials, not used by the send path) · `templates` · `users` (end-users of a client) · `nexlify_configuration` (singleton: sender identity, SMTP credentials, send limits, email header/footer) · `id_types` (identification document catalog) · `emails` (persistent delivery records, sent and received) · `email_send_logs` (per-attempt audit) · `email_attachments` (attachments of inbound replies) · `email_event_subscriptions` (per-client event subscriptions and field toggles) · `webhook_endpoints` (client delivery-status receivers) · `webhook_deliveries` (signed webhook attempts) · `sending_domains` (DKIM keys and SPF/DKIM/DMARC verification) · `suppressions` (addresses that must not be emailed) · `email_certificates` (frozen delivery evidence).

Schema changes ship as Prisma migrations in `prisma/migrations` (`0_init` baseline + `20261105000000_platform_completion`, purely additive).

Password hashing: bcrypt (cost 12). Legacy unsalted SHA-256 hashes are still accepted for backwards compatibility and are upgraded to bcrypt automatically on the next successful login.

### Email delivery pipeline

Every send is a persistent record with three identifiers:

- `id_email` (BigInt) — internal PK, never exposed.
- `email_uuid` (UUID v4) — public API identifier.
- `short_code` (`NX-XXXXXXX`, base62) — human reference for UI/log search.

States: `QUEUED → SENT | RETRYING`, `RETRYING → WARNING | FAILED`, plus `BOUNCED` (hard bounce / complaint reported after sending), `SUPPRESSED` (never sent: recipient on the suppression list) and `RECEIVED` (inbound reply). `SENDING` exists in the enum but is never assigned. A QUEUED record is consumed by the queue-driven tick; a failed attempt with attempts left enters the retry machine. Every attempt writes an `email_send_logs` row with level `SUCCESS` (first-attempt success), `WARNING` (success after retries) or `ERROR` (failure), the SMTP host used and the message. `nexlify_configuration.daily_send_limit` caps sends per day; `max_retries` and `retry_interval_seconds` drive the retry machine. A scheduler (`EmailRetryScheduler`, every 30s) processes the queue FIFO (`QUEUED` first, then due `RETRYING`), capped by the remaining daily budget; a failed batch never stops the rest.

### Delivery-status webhooks

When an email reaches `SENT` / `WARNING` / `FAILED`, one `webhook_deliveries` row is enqueued per active `webhook_endpoints` row of that client. A scheduler (`WebhookDeliveryScheduler`, 30s) POSTs `{ event, email_uuid, short_code, attempts, subject, to_email, sent_at }` with `X-Nexlify-Event`, `X-Nexlify-Delivery` and `X-Nexlify-Signature` (HMAC-SHA256 hex of the exact serialized body, using the endpoint secret that is returned exactly once at registration). 2xx delivers; otherwise retry every `60s × attempt`, max 3 attempts, then give up recording `ok=false`.

- Authentication model: `api/email/**`, `api/webhooks/**`, `api/email-events/subscriptions/**`, `api/stats/overview`, certificates and `api/ai/status` accept **X-API-Key** (client programmatic access, SHA-256 hashed keys, `nexlify_keys`) *or* the bearer JWT; every other endpoint uses pure JWT. See the endpoint table below.
- Rate limiting: the public authentication routes (`api/admin-user/auth`, `api/client/sign-in`, `api/client/assign-credentials`, `api/client/forgot-password`, `api/client/reset-password`) accept 5 requests per minute per IP and answer `429` after that (`@nestjs/throttler`).
- Client isolation: a client (JWT session or X-API-Key) only lists, reads, downloads attachments of, retries and certifies its own emails (anything else answers 404, as if it did not exist); emails it sends are stored under its `id_client`. Admins see every email.

## Endpoints

| Method | Path | Guards | Purpose |
| --- | --- | --- | --- |
| POST | `api/admin-user/auth` | — | Admin login (username/password + IP binding), returns JWT |
| GET | `api/admin-user/data` | AuthGuard | Current admin session data |
| POST | `api/client/register` | AuthGuard, SmtpServerExistsGuard | Register a client and email the credential-assignment link |
| POST | `api/verify/credential-assignment` | — | Validate the emailed assignment token (decrypt → verify → mark used) |
| POST | `api/client/assign-credentials` | — | Set username/password from the assignment token, activate client, mint API key |
| POST | `api/client/sign-in` | — | Client login; session JWT stored encrypted, revoked IP binding enforced |
| GET | `api/client/get-clients` | AuthGuard | Paginated client listing with filters |
| GET | `api/client/data` | AuthGuard | Current client session data |
| POST | `api/email/send` | EmailAuthGuard (JWT or X-API-Key), ConfigurationExistsGuard | Persist + send an email; returns `email_uuid` and `short_code` |
| GET | `api/email` | EmailAuthGuard | List delivery records (filters: state, client, dates, short_code; paginated) |
| GET | `api/email/:emailId` | EmailAuthGuard | Email detail with full attempt log history (`emailId` = uuid or short code) |
| POST | `api/email/:emailId/retry` | EmailAuthGuard, ConfigurationExistsGuard | Retry one specific delivery in one click |
| POST | `api/email/diffuse` | EmailAuthGuard, ConfigurationExistsGuard | Bulk send 1–500 recipients: queues them respecting the remaining daily budget; the scheduler sends them FIFO |
| POST | `api/webhooks` | EmailAuthGuard | Register a delivery-status webhook for the calling client (secret returned once) |
| GET | `api/webhooks/my` | EmailAuthGuard | List own webhook endpoints (secret never exposed) |
| PUT | `api/webhooks/:endpointUuid` | EmailAuthGuard | Update url / active toggle (uuid DB-side) |
| POST | `api/email/inbound` | HMAC signature (INBOUND_WEBHOOK_SECRET) | Reply ingestion: threading by In-Reply-To/References, attachments ≤5MB, idempotent |
| POST | `api/email-events/subscriptions` | EmailAuthGuard | Subscribe to events (RECEIVED_REPLY) choosing fields: body/dates/sender/recipients/attachments/AI analysis |
| GET | `api/email-events/subscriptions/my` | EmailAuthGuard | The client's subscriptions (admin sees all) |
| PUT | `api/email-events/subscriptions/:subscriptionUuid` | EmailAuthGuard | Update events/fields/state |
| GET | `api/email/:emailId/attachments/:index` | EmailAuthGuard | Base64 download of an attachment |
| POST | `api/email/events/bounce` | HMAC signature (INBOUND_WEBHOOK_SECRET) | Bounce/complaint ingestion: `BOUNCED` + suppression (hard bounce / complaint), log only for soft bounces |
| POST | `api/domains` | AuthGuard | Register a sending domain: DKIM RSA-2048 keypair + SPF/DKIM/DMARC records to publish |
| GET | `api/domains` | AuthGuard | List sending domains (own for clients, all for admin) |
| POST | `api/domains/:domainUuid/verify` | AuthGuard | Resolve DNS and store `spf/dkim/dmarc_verified` |
| DELETE | `api/domains/:domainUuid` | AuthGuard | Delete a sending domain |
| GET | `api/suppressions` | AuthGuard | Paginated suppression list (filters: email, reason; admin: id_client) |
| POST | `api/suppressions` | AuthGuard | Add a MANUAL suppression (idempotent per client + address) |
| DELETE | `api/suppressions/:suppressionUuid` | AuthGuard | Remove a suppression |
| GET | `api/unsubscribe/:token` | — (signed token) | Public HTML confirmation page |
| POST | `api/unsubscribe/:token` | — (signed token) | RFC 8058 one-click unsubscribe (reason `UNSUBSCRIBE`) |
| GET | `api/stats/overview?from&to&id_client` | EmailAuthGuard | Dashboard KPIs: totals per state, delivery/bounce rate, replies, daily series, remaining daily budget, AI intents |
| POST | `api/email/:emailId/certificate` | EmailAuthGuard | Issue the immutable certificate of a SENT/WARNING email (idempotent) |
| GET | `api/email/:emailId/certificate` | EmailAuthGuard | Read the certificate (404 if none) |
| GET | `api/email/:emailId/certificate/pdf` | EmailAuthGuard | Download the certificate PDF |
| GET | `api/certificates/:code/verify` | — (public) | Verify a certificate: validity + hashes, no body content |
| POST | `api/email/:emailId/analyze` | EmailAuthGuard | Re-run the AI analysis of a RECEIVED reply (503 when disabled) |
| GET | `api/ai/status` | EmailAuthGuard | `{ enabled, model }` of the AI reply intelligence |
| GET | `api/webhooks/:endpointUuid/deliveries?page&limit` | EmailAuthGuard | Paginated delivery history of an own endpoint |
| POST | `api/webhooks/deliveries/:deliveryId/redeliver` | EmailAuthGuard | Re-queue a delivery (resets the same row) |
| POST | `api/webhooks/:endpointUuid/test` | EmailAuthGuard | Synchronous signed `ping` with status and duration |
| POST | `api/nexlify-keys/generate` | AuthGuard | Generate a client API key (raw key returned once) |
| GET | `api/nexlify-keys/my` | AuthGuard | List the calling client's API keys (masked) |
| PUT | `api/nexlify-keys/:id/revoke` | AuthGuard | Revoke an API key |
| POST | `api/client/update` | AuthGuard | Update client contact data (own, or any for admin) |
| PUT | `api/client/state` | AuthGuard (admin) | Suspend/reactivate a client |
| POST | `api/client/forgot-password` | — | Recovery link email (generic response; single-use encrypted JWT stored in `recovery_token`) |
| POST | `api/client/reset-password` | — | Password reset with the encrypted recovery token (bcrypt + single use) |
| POST | `api/users` | AuthGuard | Create an end-user under a client |
| GET | `api/users` | AuthGuard | Paginated users (own client for clients; all/filtered for admin) |
| PUT | `api/users/:id` | AuthGuard | Update a user profile / state toggle |
| POST | `api/templates` | AuthGuard (admin) | Create an email template (uuid PK generated by the DB; `variables`, `category`, `locale`) |
| GET | `api/templates` | AuthGuard | List templates (active only for clients; all for admin; `?category=`) |
| PUT | `api/templates/:id` | AuthGuard (admin) | Update a template (subject/body/is_active/variables/category/locale) |
| POST | `api/smtp-server/add` | AuthGuard, ConfigurationExistsGuard | Add an SMTP server to the catalog |
| POST | `api/configuration/add` | AuthGuard | Create the global Nexlify configuration |
| GET | `api/configuration/get` | AuthGuard | Read global configuration |
| PUT | `api/configuration/update` | AuthGuard | Update global configuration |
| GET | `api/master/id-types` | AuthGuard | Identification types (master data) |
| GET | `api/verify` | — | Health check |

## Authentication model

`AuthGuard` + `AuthenticatedUserSecurity` implement **dual authentication**: the Bearer token is resolved against either `clients` (state `ACTIVO`) or `admin_user` (`is_active`), and the IP embedded in the token must match the request IP. Session context is exposed through `AsyncLocalStorage` (`ContextInterceptor`) and consumed by the `*/data` use cases.

### Reception of replies (inbound mapping)

```mermaid-text
POST api/email/inbound  →  HMAC verify (INBOUND_WEBHOOK_SECRET)  →  thread reply
```

- Every successful send persists the SMTP `Message-ID` in `emails.message_id`; replies that arrive with `In-Reply-To` / `References` matching it are created as `RECEIVED` rows linked via `parent_email_id` (direction enum SENT/RECEIVED). Unmatchable messages are stored standalone (admin-visible). Ingestion is idempotent per `message_id`.
- `POST api/email/inbound` is PUBLIC but signed: `X-Nexlify-Inbound-Signature` = HMAC-SHA256 hex of the raw body using `INBOUND_WEBHOOK_SECRET` (required env; add it to your `.env`). Design your provider (Mailgun, SendGrid, Postmark, Cloudflare Email Routing) to forward the parsed fields: `{ sender, message_id, in_reply_to_message_id, references, subject, body_text, body_html, received_at, attachments[{filename,contentType,size,content(base64)}] }` — attachments > 5MB are rejected per-item without aborting.
- `email_event_subscriptions` lets each client choose what to receive through its webhook endpoint: `RECEIVED_REPLY` events gated field-by-field (`include_body`, `include_dates`, `include_sender`, `include_recipients`, `include_attachments` — metadata only; binary never travels in webhooks). The delivery scheduler posts the stored payload signed as usual.
- Downloads: `GET api/email/:emailId/attachments/:index` (dual auth) returns the base64 attachment.

### Template variables

- Templates declare `variables` (string[]), `category` and `locale`. Subject and HTML body use `{{name}}` placeholders (inner spaces allowed: `{{ name }}`).
- `POST api/email/send` (and `api/email/diffuse`) accept `id_template` + `variables`. The template provides subject and HTML body; explicit `subject` / `html` / `text` override it (and are rendered too). Every placeholder used must have a value, otherwise `400 Faltan variables de plantilla: a, b`.
- Values are HTML-escaped inside the HTML body only (subject and text are plain). The email stores `id_template` and `template_variables`, both returned by the email detail.
- `pnpm db:seed:templates` upserts professional Spanish (neutral) templates by name: `factura_electronica_emitida`, `recordatorio_pago`, `aviso_cobro_vencido`, `notificacion_legal`, `bienvenida`, `recuperacion_contrasena`.

### Sending domains (SPF / DKIM / DMARC)

- `POST api/domains` generates an RSA-2048 DKIM keypair (`node:crypto`); the private key is stored encrypted with `ENCRYPT_KEY` (AES-GCM) and never returned. The response lists the TXT records to publish:
  - SPF at `<domain>`: `v=spf1 <mechanism> ~all`, where the mechanism is derived from the configured SMTP server (`a:<host>`, `ip4:`/`ip6:` for an IP host, `mx` when no SMTP server is configured). Assumption: `a:` is used instead of `include:` because a relay host does not necessarily publish its own SPF record; providers that document an `include:` (e.g. Google Workspace) can publish it, but verification then expects the suggested mechanism.
  - DKIM at `nexlify._domainkey.<domain>`: `v=DKIM1; k=rsa; p=<public key>`.
  - DMARC at `_dmarc.<domain>`: `v=DMARC1; p=none; rua=mailto:dmarc@<domain>`.
- `POST api/domains/:domainUuid/verify` resolves the TXT records and stores `spf_verified`, `dkim_verified` (exact public key), `dmarc_verified` and `last_checked_at`.
- Every email whose `from` domain is a DKIM-verified domain is DKIM-signed by nodemailer.

### Suppressions, bounces and unsubscribe

- `suppressions` holds addresses that must not receive email, per client (`id_client = null` = platform-wide), with reason `HARD_BOUNCE`, `SOFT_BOUNCE`, `COMPLAINT`, `UNSUBSCRIBE` or `MANUAL`. Rows are deduplicated per client + address.
- Every send attempt (single send, queued diffusion tick, retries) checks the list **before** SMTP: a suppressed recipient leaves the email in `SUPPRESSED` with an ERROR log, no SMTP call and no retry. A client's email is blocked by its own and platform-wide rows; an email without a client by any row of the address. With several recipients, one suppressed recipient blocks the whole email.
- `POST api/email/events/bounce` (same HMAC header as inbound) finds the email by `email_uuid` or `message_id`; `HARD_BOUNCE` / `COMPLAINT` set `BOUNCED` + `bounced_at` and suppress the address; `SOFT_BOUNCE` only logs a WARNING.
- Every single-recipient email carries `List-Unsubscribe: <PUBLIC_API_URL/api/unsubscribe/<token>>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. The token is an HMAC-SHA256 (key derived from `ENCRYPT_KEY`) over recipient + client and does not expire. Multi-recipient emails get no unsubscribe header (a token identifies one recipient).
- `GET api/unsubscribe/:token` renders a self-contained Spanish confirmation page (no scripts, own strict CSP); `POST` suppresses with reason `UNSUBSCRIBE`.

### Dashboard stats

`GET api/stats/overview` aggregates in the database (Prisma `groupBy` + one parameterized `$queryRaw` for the daily series). Clients always see only their own emails; admins see all or filter by `id_client`. The range is a set of inclusive UTC days (default: last 30 days, max 366). `totals` has one counter per `EmailState` (new states appear automatically), `delivery_rate = (SENT+WARNING) / (SENT+WARNING+FAILED+BOUNCED)`, `bounce_rate = BOUNCED / (SENT+WARNING+BOUNCED)` (0..1), `replies` = RECEIVED, `daily` is zero-filled per day, and `budget` is the global `daily_send_limit` minus the SENT/WARNING/BOUNCED emails sent today (a bounce happened after the email left the server, so it still consumes the budget; the same rule the send path enforces).

### Certified email

`POST api/email/:emailId/certificate` freezes an immutable evidence snapshot of a SENT/WARNING email in `email_certificates` and returns `{ certificate_uuid, certificate_code (NXC-XXXXXXXXXX), issued_at, content_hash, evidence_hash, verify_url }`. Issuing again returns the same certificate.

- `content_hash` = SHA-256 (hex) of `subject + "\n" + body_html + "\n" + body_text`, with missing bodies as empty strings.
- The evidence is canonical JSON (keys sorted recursively, no whitespace, bigint as string, dates in ISO-8601) with the email identity, `message_id`, `content_hash`, every attempt log (timestamp, level, SMTP host, message) in chronological order and the reply chain. It never stores the body. `evidence_hash` = SHA-256 (hex) of that exact text.
- `GET api/email/:emailId/certificate/pdf` renders a Spanish PDF (pdfkit) from the stored evidence, with both formulas and the verification URL `${PUBLIC_API_URL}/api/certificates/<code>/verify`.
- Public verification recomputes the SHA-256 of the stored evidence: `valid` is true only when it still equals `evidence_hash`. Recipients are masked and no body content is returned.

### AI reply intelligence

When `ANTHROPIC_API_KEY` is set, every ingested RECEIVED reply is analyzed with Claude (`ANTHROPIC_MODEL`, default `claude-opus-5-5`, structured outputs) **after** it is persisted: the analysis runs in the background and never blocks or fails the ingestion. It stores `ai_intent` (ACCEPT, REJECT, QUESTION, PAYMENT_PROMISE, COMPLAINT, OUT_OF_OFFICE, UNSUBSCRIBE_REQUEST, OTHER), `ai_sentiment` (POSITIVE, NEUTRAL, NEGATIVE), a Spanish `ai_summary` and extracted entities (dates, amounts, references), exposed as `ai_analysis` in the email detail and `ai_intent` in the list (`GET api/email?ai_intent=`). An `UNSUBSCRIBE_REQUEST` adds an `UNSUBSCRIBE` suppression for the sender (deduplicated per client + email).

- Webhooks: subscriptions accept `include_ai_analysis`. While AI is enabled, the `RECEIVED_REPLY` deliveries of a reply are enqueued **once its analysis finishes**, so subscribers receive `ai_analysis` (`null` if the analysis failed — the webhook still goes out). With AI disabled the deliveries are enqueued immediately, as before. Analyses in flight when the process stops are not retried automatically; `POST api/email/:emailId/analyze` re-runs one on demand (it does not re-send webhooks).
- Without a key the feature reports `enabled: false` (`GET api/ai/status`), `analyze` answers 503 `Análisis IA deshabilitado`, and nothing else changes.
- Privacy: the reply subject and text (HTML stripped, truncated to 20,000 characters) are sent to Anthropic **only when `ANTHROPIC_API_KEY` is configured**. The content is delimited as untrusted data in the prompt.

### Webhook deliveries DX

- `GET api/webhooks/:endpointUuid/deliveries` lists the delivery history of an own endpoint (newest first, same paginated envelope as `GET api/email`), including the email `short_code`.
- `POST api/webhooks/deliveries/:deliveryId/redeliver` resets **the same row** (`attempt 0`, `ok/status_code/error` null, `next_retry_at` now); the scheduler ships its stored payload on its next tick, so the history shows the latest outcome of that delivery.
- `POST api/webhooks/:endpointUuid/test` sends `{ event: "ping", endpoint_uuid, sent_at }` synchronously with the same headers and HMAC signature as real deliveries and returns `{ ok, status_code, error, duration_ms }`. Nothing is persisted.

## Tests

- Unit specs are colocated next to the code (`*.spec.ts`) and cover helpers, guards and use cases with mocked repositories — no database required.
- `pnpm test:e2e` boots the full Nest module against a mocked Prisma provider and asserts the real HTTP surface, including an authenticated X-API-Key request.
- GitHub Actions (`.github/workflows/ci.yml`) runs the typecheck, unit tests, e2e tests and the production build on every push and pull request to `main`.

## Known limitations

Found while reading and testing the code; they are not fixed yet.

| Limitation | Effect |
| --- | --- |
| Emails sent before per-client isolation have `id_client: null` | Only admins see them; assigning them to their client needs a data migration |
| Request `attachments` on send are accepted but not passed to the mailer | Recipients get the email without attachments |
| `api/email/diffuse` always sends from `configuration.sender_email` | The request `from` is ignored for bulk sends |
| `sender_name`, `reply_to_email` and the configured header/footer are not applied when sending | They are only used by the credential-assignment email |
| The API key minted at activation is never shown | A new one must be generated from the admin dashboard |
| Session IP binding compares `request.ip` without a trusted proxy | Behind the front's server actions it binds to the front server's IP |
| The daily budget is global and counted from server-local midnight | One client can exhaust everyone's quota; stats days are UTC |
| `api/webhooks/my` lists endpoints of the caller's `id_user` | The admin dashboard webhooks page shows only the admin's own endpoints |
| `sending_domains.domain` is unique platform-wide; new tables have no foreign keys; `suppressions` has no unique (client, email) | Data-model follow-ups |
| AI analyses in flight when the process stops are not retried | `api/email/:emailId/analyze` re-runs one on demand |
