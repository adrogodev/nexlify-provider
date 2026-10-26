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
| T1 | S1 | delegated (worker) + parent fixes | 48221b0 |
| T2 | S2 | delegated (worker) | 48221b0 |
| T3 | S3 | delegated (worker) + parent controller/wiring | 48221b0 |
| T4 | S4 | delegated (worker) | dc1d9ef |
| T5 | S5 | delegated (worker) | dc1d9ef |
| T6 | S6 | delegated (worker) | dc1d9ef |
| T7 | S7 | inline (parent) | cierre (README + verificacion) |

## Log

- L1 (2026-10-26) — Original request verbatim: "Bien, ahora quiero que basado en todo el análisis que haz hecho del sistema que sea capaz de analizar y mapear tanto los emails que se envían como lo que son respondidos al correo mapeado y que hayan algunos eventos para habilitar lo que se quiere recibir, como por ejemplo: solo el cuerpo de correo, fechas de envió o respuesta del correo, quien lo recibe, quien lo envía, archivos adjuntos en el correo, entre otros detalles que consideres." — after the architecture question the user chose **Inbound webhook** (provider-agnostic POST ingestion) as the reception mechanism.
- L2 (2026-10-26) — Standing rule from the user (uuid): uuid v4 ONLY from the database (`gen_random_uuid()`); short codes and secret/jti plain strings are the only legitimate code-side ids.
- L3 (2026-10-26) — T1–T3 closing notes (parent): the first batch worker stopped with interaction_required (RECEIVED state vs. S1 literal list, derived files, missing env secret); the user approved all three. The resumed worker died mid-T3 leaving no text; the parent finished the remainder inline (inbound controller + DI registration + EnvVar e2e fix). During that inline fix the parent corrupted the local `.env` formatting (the worker had appended `INBOUND_WEBHOOK_SECRET` without a newline); rebuilt cleanly — NOTE: the `ENCRYPT_KEY` value was restored from console history and ONE byte may differ from the original (it printed as mojibake); impact is limited to encrypted session tokens persisted in the dev DB — re-login resolves, regenerate if decryption errors appear. Both `.env` and `.env.example` now carry the documented keys. Verification after fixes: 154 unit + 8 e2e + build clean at commit 48221b0.
- L4 (2026-10-26) — T4–T6 (S4/S5/S6) implemented: `EmailEventEnum` subscriptions management (create/get-my/update + controller), inbound fan-out enqueueing one `webhook_deliveries` row per matched ACTIVE subscription, and the S6 read side (detail direction/parent/attachments metadata + `GET api/email/:emailId/attachments/:index`). The field-gated payload needed a `payload String? @db.Text` column in `webhook_deliveries` and a scheduler branch (stored payload POSTed verbatim; rows without one keep the exact generic delivery-status shape) — surfaces explicitly extended by user approval option 1 (worker could not edit schema/scheduler otherwise); `pnpm prisma generate` ran offline. Verification: `pnpm test -- --runInBand` 27 suites / 185 tests passed, `pnpm test:e2e` 1 suite / 8 tests passed, `pnpm build` exit 0. DB migration still pending; nothing committed (parent owns git).
- L5 (2026-10-26) — Parent commit slicing: `48221b0` (T1–T3) + `dc1d9ef` (T4–T6 incl. approved payload column + scheduler branch); final battery confirmed: 185 unit + 8 e2e + build exit 0.
- L6 (2026-10-26) — Operational landing (parent): branches stacked fast-forward onto `main`; full battery on main green (185 unit + 8 e2e + build). DB restored (localhost:5505 reachable after the user brought it up); schema reconciled with `prisma db push` (additive; legacy data preserved: 1 admin, 1 client, config Gmail, 13 id_types; explicit `migrate dev` reset was REJECTED to avoid dropping data). Live smoke on the running server (:3600): admin auth (legacy SHA-256 upgraded to bcrypt on login), guarded endpoints, smtp catalog + config update, `POST api/email/send` → persisted with DB-side uuid v4 (`2dbae291-…`, `NX-87jAk6w`) and entered RETRYING with audited ENOTFOUND error — retry machine re-attempting every 30s WITHOUT real SMTP (dummy host). Two live bugs found and fixed (`2469e15`): (1) `findByUuidOrShortCode` cast short codes against the native uuid column (P2007) — now short-code-only unless uuid-shaped; (2) webhook `findDue` used `ok != true` which EXCLUDES yet-undelivered NULL rows in PostgreSQL — OR-branch added. Full inbound round-trip achieved: fake SENT parent with `message_id`, signed inbound POST (node helper; note PS Invoke-RestMethod signature mismatch was client-side encoding), threaded:true, subscription fan-out enqueued per-subscription field-gated payload, `WebhookDeliveryScheduler` delivered to a local receiver: attempt 1, `ok=true`, HTTP 200, signature verified, schedule cleared. Config left untouched except `id_smtp_server` restored to the legacy Gmail row; the smoke email will reach FAILED after legacy `max_retries` (5) with audited error rows.
- Risk lines:
  - S1: Risk: item 1 (schema additions; migración pendiente con su DB).
  - S2: Risk: item 3 (MailerResult contrato extendido con messageId).
  - S3: Risk: item 2 (endpoint público firmado por HMAC; fail-closed sobre secret).
  - S4: Risk: item 3 (nuevos endpoints + validación de eventos/campos).
  - S5: Risk: item 3 (columna payload + branch del scheduler: retro-compatible, shape genérico PRESERVE-testeado).
  - S6: Risk: item 2/3 (descarga de adjuntos por auth; metadata sin contenido en webhooks).
