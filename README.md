# nexlify-provider

HTTP provider service for the **Nexlify** platform. It onboards client companies, issues access credentials and hashed API keys, manages the platform-wide email configuration (SMTP), and sends emails.

- **Stack**: NestJS 11 · TypeScript · Prisma 7 (PostgreSQL) · nodemailer + react-email · JWT (HS512) · bcrypt password hashing
- **Architecture**: clean/hexagonal layering — `src/presentation` (controllers, guards, server) → `src/core/application` (use cases, contracts, DTOs, mappers) → `src/core/domain` (entities, exceptions, enums, models) → `src/infrastructure` (Prisma repositories, helpers, services, environment).

## Run

```bash
pnpm install
pnpm db:seed        # creates the platform admin_user from env vars
pnpm start:dev      # development server (port from PORT env)
pnpm test           # unit tests (Jest)
pnpm test:e2e       # e2e smoke tests (no live database required)
pnpm build          # production build
```

## Environment variables

Required (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP listen port |
| `NODE_ENV` | `development` / `staging` / `production` |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Initial platform admin (used by the seed script) |
| `PLATFORM_URL` | Public platform URL (used in credential-assignment emails) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | HS512 signing key for all issued tokens |
| `JWT_EXPIRATION_TIME` | Session token lifetime, in hours |
| `ENCRYPT_KEY` | AES-GCM key protecting tokens stored at rest |
| `MAILER_TLS_REJECT_UNAUTHORIZED` | Optional, defaults to `true`. Only set `false` for local SMTP relays with self-signed certificates. |
| `PUBLIC_API_URL` | Optional, defaults to `http://localhost:${PORT}`. Public base URL of this API, used in certificate verification links. |
| `ANTHROPIC_API_KEY` | Optional. Enables the AI reply intelligence; without it the feature reports itself disabled and nothing fails. |
| `ANTHROPIC_MODEL` | Optional, defaults to `claude-opus-5-5`. Claude model used for reply analysis. |

> `JWT_SECRET_KEY` and `ENCRYPT_KEY` are required: requests with an empty value fail fast instead of falling back to default secrets.
>
> UUID identifiers (`emails.email_uuid`, `templates.id_template`) are generated **by the database** with `gen_random_uuid()` (Prisma `@default(dbgenerated(...))`); the code never emits a v4 uuid except for the password-recovery jti. `gen_random_uuid()` is built-in for PostgreSQL ≥ 13; add `CREATE EXTENSION IF NOT EXISTS pgcrypto;` for older versions.

## Data model (15 tables)

`admin_user` (platform admins) · `clients` (companies/persons) · `client_credentials` (login, encrypted `auth_token`/`recovery_token`) · `nexlify_keys` (SHA-256 hashed client API keys) · `nexlify_keys_logs` (API key audit) · `smtp_servers` (SMTP provider catalog) · `diffusion_information` (per-client mail credentials) · `templates` · `users` (end-users of a client) · `nexlify_configuration` (singleton: sender identity, SMTP credentials, send limits, email header/footer) · `id_types` (identification document catalog) · `emails` (persistent delivery records) · `email_send_logs` (per-attempt audit) · `webhook_endpoints` (client delivery-status receivers) · `webhook_deliveries` (signed webhook attempts).

Password hashing: bcrypt (cost 12). Legacy unsalted SHA-256 hashes are still accepted for backwards compatibility and are upgraded to bcrypt automatically on the next successful login.

### Email delivery pipeline

Every send is a persistent record with three identifiers:

- `id_email` (BigInt) — internal PK, never exposed.
- `email_uuid` (UUID v4) — public API identifier.
- `short_code` (`NX-XXXXXXX`, base62) — human reference for UI/log search.

States: `QUEUED → SENDING → SENT | WARNING | FAILED → RETRYING` (a QUEUED record is consumed by the queue-driven tick; a FAILED record enters the retry machine). Every attempt writes an `email_send_logs` row with level `SUCCESS` (first-attempt success), `WARNING` (success after retries) or `ERROR` (failure), the SMTP host used and the message. `nexlify_configuration.daily_send_limit` caps sends per day; `max_retries` and `retry_interval_seconds` drive the retry machine. A scheduler (`EmailRetryScheduler`, every 30s) processes the queue FIFO (`QUEUED` first, then due `RETRYING`), capped by the remaining daily budget; a failed batch never stops the rest.

### Delivery-status webhooks

When an email reaches `SENT` / `WARNING` / `FAILED`, one `webhook_deliveries` row is enqueued per active `webhook_endpoints` row of that client. A scheduler (`WebhookDeliveryScheduler`, 30s) POSTs `{ event, email_uuid, short_code, attempts, subject, to_email, sent_at }` with `X-Nexlify-Event`, `X-Nexlify-Delivery` and `X-Nexlify-Signature` (HMAC-SHA256 hex of the exact serialized body, using the endpoint secret that is returned exactly once at registration). 2xx delivers; otherwise retry every `60s × attempt`, max 3 attempts, then give up recording `ok=false`.

- Authentication model: `api/email/**` accepts **X-API-Key** (client programmatic access, SHA-256 hashed keys, `nexlify_keys`) *or* the bearer JWT; every other endpoint uses pure JWT. See the endpoint table above.
- To create the new tables run `pnpm prisma migrate dev --name email_pipeline` (or `pnpm prisma db push`) with the database up.

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
| POST | `api/email/send` | EmailAuthGuard (JWT o X-API-Key), ConfigurationExistsGuard | Persist + send an email; returns `email_uuid` and `short_code` |
| GET | `api/email` | EmailAuthGuard | List delivery records (filters: state, client, dates, short_code; paginated) |
| GET | `api/email/:emailId` | EmailAuthGuard | Email detail with full attempt log history (`emailId` = uuid or short code) |
| POST | `api/email/:emailId/retry` | EmailAuthGuard, ConfigurationExistsGuard | Retry one specific delivery in one click |
| POST | `api/email/diffuse` | EmailAuthGuard, ConfigurationExistsGuard | Bulk send 1–500 recipients: queues them respecting the remaining daily budget; the scheduler sends them FIFO |
| POST | `api/webhooks` | EmailAuthGuard | Register a delivery-status webhook for the calling client (secret returned once) |
| GET | `api/webhooks/my` | EmailAuthGuard | List own webhook endpoints (secret never exposed) |
| PUT | `api/webhooks/:endpointUuid` | EmailAuthGuard | Update url / active toggle (uuid DB-side) |
| POST | `api/email/inbound` | Firma HMAC (INBOUND_WEBHOOK_SECRET) | Ingestión de respuestas: threading por In-Reply-To/References, adjuntos ≤5MB, idempotente |
| POST | `api/email-events/subscriptions` | EmailAuthGuard | Subscribe a eventos (RECEIVED_REPLY) eligiendo campos: body/dates/sender/recipients/attachments |
| GET | `api/email-events/subscriptions/my` | EmailAuthGuard | Suscripciones del cliente (admin ve todas) |
| PUT | `api/email-events/subscriptions/:subscriptionUuid` | EmailAuthGuard | Actualiza eventos/campos/estado |
| GET | `api/email/:emailId/attachments/:index` | EmailAuthGuard | Descarga base64 de un adjunto |
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
| POST | `api/templates` | AuthGuard (admin) | Create an email template (uuid PK generated by the DB) |
| GET | `api/templates` | AuthGuard | List templates (active only for clients; all for admin) |
| PUT | `api/templates/:id` | AuthGuard (admin) | Update a template (subject/body/is_active) |
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

### Dashboard stats

`GET api/stats/overview` aggregates in the database (Prisma `groupBy` + one parameterized `$queryRaw` for the daily series). Clients always see only their own emails; admins see all or filter by `id_client`. The range is a set of inclusive UTC days (default: last 30 days, max 366). `totals` has one counter per `EmailState` (new states appear automatically), `delivery_rate = (SENT+WARNING) / (SENT+WARNING+FAILED+BOUNCED)`, `bounce_rate = BOUNCED / (SENT+WARNING+BOUNCED)` (0..1), `replies` = RECEIVED, `daily` is zero-filled per day, and `budget` is the global `daily_send_limit` minus the SENT/WARNING emails sent today (the same rule the send path enforces).

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
- `pnpm test:e2e` boots the full Nest module against a mocked Prisma provider and asserts the real HTTP surface.
