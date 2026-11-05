# nexlify-provider

HTTP provider service for the **Nexlify** platform. It onboards client companies, issues access credentials and hashed API keys, manages the platform-wide email configuration (SMTP), and sends emails.

- **Stack**: NestJS 11 · TypeScript · Prisma 7 (PostgreSQL) · nodemailer + react-email · JWT (HS512) · bcrypt password hashing
- **Architecture**: clean/hexagonal layering — `src/presentation` (controllers, guards, server) → `src/core/application` (use cases, contracts, DTOs, mappers) → `src/core/domain` (entities, exceptions, enums, models) → `src/infrastructure` (Prisma repositories, helpers, services, environment).

## Run

```bash
pnpm install
pnpm db:seed        # creates the platform admin_user from env vars (idempotent)
pnpm db:seed:templates  # upserts the LatAm Spanish email templates by name (idempotent)
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
| `INBOUND_WEBHOOK_SECRET` | HMAC secret of the signed inbound (`api/email/inbound`) and bounce (`api/email/events/bounce`) webhooks |
| `PUBLIC_API_URL` | Optional, defaults to `http://localhost:${PORT}`. Public base URL of this API, used to build the `List-Unsubscribe` links |

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

States: `QUEUED → SENDING → SENT | WARNING | FAILED → RETRYING`, plus `BOUNCED` (hard bounce / complaint reported) and `SUPPRESSED` (never sent: recipient on the suppression list) (a QUEUED record is consumed by the queue-driven tick; a FAILED record enters the retry machine). Every attempt writes an `email_send_logs` row with level `SUCCESS` (first-attempt success), `WARNING` (success after retries) or `ERROR` (failure), the SMTP host used and the message. `nexlify_configuration.daily_send_limit` caps sends per day; `max_retries` and `retry_interval_seconds` drive the retry machine. A scheduler (`EmailRetryScheduler`, every 30s) processes the queue FIFO (`QUEUED` first, then due `RETRYING`), capped by the remaining daily budget; a failed batch never stops the rest.

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
| POST | `api/email/events/bounce` | Firma HMAC (INBOUND_WEBHOOK_SECRET) | Bounce/complaint ingestion: `BOUNCED` + suppression (hard bounce / complaint), log only for soft bounces |
| POST | `api/domains` | AuthGuard | Register a sending domain: DKIM RSA-2048 keypair + SPF/DKIM/DMARC records to publish |
| GET | `api/domains` | AuthGuard | List sending domains (own for clients, all for admin) |
| POST | `api/domains/:domainUuid/verify` | AuthGuard | Resolve DNS and store `spf/dkim/dmarc_verified` |
| DELETE | `api/domains/:domainUuid` | AuthGuard | Delete a sending domain |
| GET | `api/suppressions` | AuthGuard | Paginated suppression list (filters: email, reason; admin: id_client) |
| POST | `api/suppressions` | AuthGuard | Add a MANUAL suppression (idempotent per client + address) |
| DELETE | `api/suppressions/:suppressionUuid` | AuthGuard | Remove a suppression |
| GET | `api/unsubscribe/:token` | — (signed token) | Public HTML confirmation page |
| POST | `api/unsubscribe/:token` | — (signed token) | RFC 8058 one-click unsubscribe (reason `UNSUBSCRIBE`) |
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

## Tests

- Unit specs are colocated next to the code (`*.spec.ts`) and cover helpers, guards and use cases with mocked repositories — no database required.
- `pnpm test:e2e` boots the full Nest module against a mocked Prisma provider and asserts the real HTTP surface.
