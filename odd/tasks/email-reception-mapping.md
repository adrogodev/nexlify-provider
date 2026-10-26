# email-reception-mapping

Objective: reception and mapping of replies over the shipped emails: capture `message_id` on send, ingest inbound replies through a provider-agostic signed webhook, thread replies to the mapped email (`parent_email_id`), and per-client event subscriptions that choose WHICH events and WHICH fields (body, dates, sender, recipients, attachments metadata) fan out through the existing webhook pipeline.

Branch: `feat/email-reception` (from `feat/webhooks-diffusion`). Delivery: single feature branch, work-unit commits, Conventional Commits (Spanish). Push/PR: user decision.
Test runner: `pnpm test` + `pnpm test:e2e`. DB still down: `prisma validate`/`generate` offline, migration pending (same status as previous features).

## Specs

- **S1** Schema (uuid handled DB-side only; no uuid generated in code):
  - `emails` adds: `message_id String? @db.VarChar(255)`, `direction EmailDirection @default(SENT)` (enum: SENT, RECEIVED), `parent_email_id BigInt?` (plain column, project style: no `@relation`).
  - New `email_attachments`: `id_attachment BigInt @id @default(autoincrement())`, `id_email BigInt`, `filename String @db.VarChar(255)`, `content_type String? @db.VarChar(100)`, `size_bytes Int?`, `content String? @db.Text` (base64; ingestion rejects single files > 5MB), timestamps. Index `(id_email)`.
  - New `email_event_subscriptions`: `id_subscription BigInt @id @default(autoincrement())`, `subscription_uuid String @unique @db.Uuid @default(dbgenerated("gen_random_uuid()"))`, `id_client BigInt`, `id_webhook_endpoint BigInt`, `events String @db.VarChar(300)` (comma list of `EmailEventEnum` values), `include_body Boolean @default(false)`, `include_dates Boolean @default(true)`, `include_sender Boolean @default(true)`, `include_recipients Boolean @default(true)`, `include_attachments Boolean @default(false)`, `is_active Boolean @default(true)`, timestamps (posting attachments metadata = filenames/sizes ONLY; binary never travels in webhooks).
- **S2** `message_id` capture: `MailerService` returns `messageId` in `MailerResult` from nodemailer's send response; `EmailAttemptService` persists it into `emails.message_id` after a successful attempt (clears nothing on failure). Contract `IMailerService`/`MailerResult` updated accordingly.
- **S3** Inbound ingestion (inbound webhook, provider-agnostic):
  - `POST api/email/inbound` — PUBLIC endpoint signed by shared secret: env `INBOUND_WEBHOOK_SECRET` (required in `app-env.config.ts`; HMAC-SHA256 hex of the RAW body in header `X-Nexlify-Inbound-Signature`; add `rawBody: true` to `NestFactory.create` in `server.ts` so the signature verifies over exact bytes, JSON stringify fallback when rawBody is missing). Invalid/missing secret → deny (401-equivalent domain exception), never process.
  - Canonical provider payload: `{ sender, message_id?, in_reply_to_message_id?, references?, subject?, body_text?, body_html?, received_at?, attachments?: [{ filename, contentType, size?, content(base64) }] }`.
  - Threading: resolve `parent_email_id` by `in_reply_to_message_id` → `emails.message_id` (fallback: first token of `references`); `id_client` = parent's `id_client`. No parent match → create a standalone RECEIVED email (`direction=RECEIVED`, parent null, `id_client` null; admin-visible). Persist `message_id` of the reply; store state `RECEIVED`, attempts 0, and attachments rows (metadata + base64 content, ≤ 5MB each, failure of one attachment must not abort ingestion).
- **S4** Event subscriptions management (auth dual EmailAuthGuard; non-admin bound to own client, admin may pass `id_client`):
  - `POST api/email-events/subscriptions` — `{ webhook_endpoint_uuid, events[], include_body?, include_dates?, include_sender?, include_recipients?, include_attachments? }`; validates uuid of an OWN active webhook endpoint (or admin any), validates every event against `EmailEventEnum` (`RECEIVED_REPLY` initial; enum open for bounce/auto-reply later).
  - `GET api/email-events/subscriptions/my` — own list (admin sees all with optional filter).
  - `PUT api/email-events/subscriptions/:subscriptionUuid` — update events/fields/is_active; own-or-admin.
- **S5** Fan-out on reply ingestion: when a RECEIVED email links to a `parent_email_id` whose `id_client` matches that client, one `webhook_deliveries` row per matching ACTIVE subscription of that client whose `events` contains `RECEIVED_REPLY`; webhook payload built from the subscription's enabled fields ONLY:
  always `{ event, email_uuid (reply), parent: { email_uuid, short_code }, received_at }`; conditionally `sender`, `recipients`, `dates` (`{ sent_at, received_at }`), `body` (text+html), `attachments` (filenames/sizes/content-types ONLY). Delivery itself rides the existing scheduler; ingestion failure of fan-out must not reject the ingestion.
- **S6** Read side: `GET api/email/:emailId` detail includes `direction`, `parent_email_id`/parent uuid, and attachments metadata list; `GET api/email/:emailId/attachments/:index` (auth dual) returns the base64 content with content-type (NotFound when out of range).
- **S7** README (reception flow, inbound contract, env var `INBOUND_WEBHOOK_SECRET`, subscriptions table) + feature doc closure; all colocated specs + e2e green (new models in e2e Prisma mock if needed); `prisma validate`+`generate` offline OK.

## Tasks

| ID | Spec | Route | Commit |
|----|------|-------|--------|
| T1 | S1 | delegated (worker) | pending |
| T2 | S2 | delegated (worker) | pending |
| T3 | S3 | delegated (worker) | pending |
| T4 | S4 | delegated (worker) | pending |
| T5 | S5 | delegated (worker) | pending |
| T6 | S6 | delegated (worker) | pending |
| T7 | S7 | inline (parent) | pending |

## Log

- L1 (2026-10-26) — Original request verbatim: "Bien, ahora quiero que basado en todo el análisis que haz hecho del sistema que sea capaz de analizar y mapear tanto los emails que se envían como lo que son respondidos al correo mapeado y que hayan algunos eventos para habilitar lo que se quiere recibir, como por ejemplo: solo el cuerpo de correo, fechas de envió o respuesta del correo, quien lo recibe, quien lo envía, archivos adjuntos en el correo, entre otros detalles que consideres." — after the architecture question the user chose **Inbound webhook** (provider-agnostic POST ingestion) as the reception mechanism.
- L2 (2026-10-26) — Standing rule from the user (uuid): uuid v4 ONLY from the database (`gen_random_uuid()`); short codes and secret/jti plain strings are the only legitimate code-side ids.
