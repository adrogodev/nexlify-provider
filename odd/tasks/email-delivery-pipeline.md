# email-delivery-pipeline

Objective: turn the email sender into a real delivery pipeline: persistent email records (uuid + short id + long PK), per-attempt audit logs (SUCCESS/WARNING/ERROR), manual retry-by-id endpoint and an automatic retry scheduler driven by `nexlify_configuration` limits.

Branch: `feat/email-pipeline` (from `feat/security-hardening`). Delivery: single feature branch, work-unit commits, Conventional Commits (Spanish). Push/PR: user decision.
Test runner: `pnpm test` (Jest, colocated specs) + `pnpm test:e2e` (module boot without live DB). DB is currently down (`localhost:5505` unreachable): schema changes are applied via `prisma migrate dev` / `db push` when the user's Postgres is up; generation and all code paths work offline.

## Specs

- **S1** New Prisma models:
  - `emails`: `id_email BigInt @id @default(autoincrement())` (LONG internal PK), `email_uuid String @unique @db.Uuid` (public API identifier, `@default(uuid())` v4), `short_code String @unique @db.VarChar(20)` (human reference, base62 like `NX-7K3F9A1`), `id_client BigInt?`, snapshot fields `from_email, to_email (comma-joined), subject, body_html, body_text`, state (see enum), `attempts Int @default(0)`, `next_retry_at DateTime?`, `sent_at DateTime?`, `created_at/updated_at`.
  - `email_send_logs`: `id_log BigInt @id @default(autoincrement())`, `id_email BigInt`, `attempt Int`, `level` (see enum), `message String`, `smtp_host String?`, `created_at`.
  - Prisma enums `EmailState` (QUEUED, SENDING, SENT, WARNING, FAILED, RETRYING) y `EmailLogLevel` (SUCCESS, WARNING, ERROR).
- **S2** Domain entities (`Email`, `EmailSendLog`), persistence contracts (`IEmailsRepository`, `IEmailSendLogsRepository`) with the extra queries (`findByUuidOrShortCode`, `findRetryable`, `countSentOn(date)`), Prisma repositories, mapper and DI wiring (RepositoriesModule).
- **S3** `SendEmailUseCase` v2: persists the email as QUEUED before sending; performs attempt 1; writes one `email_send_logs` row per attempt with level (SUCCESS when sent, ERROR with the failure message otherwise and `smtp_host` used); updates state: SENT (`sent_at`), or RETRYING + `next_retry_at = now + retry_interval_seconds` when attempts < `max_retries`, else FAILED. Attempt 1 success after a previous retry inherits WARNING-level log. Enforces `daily_send_limit` (sent emails today) before attempting and throws when the limit is reached. Returns `{ email_uuid, short_code, state, attempts }`.
- **S4** `POST api/email/:emailId/retry`: `emailId` accepts email_uuid (v4) or short_code; AuthGuard + ConfigurationExistsGuard; re-sends the stored snapshot, logs the attempt, updates state/attempts/next_retry_at exactly like S3; NotFound when no email matches. Delivers "retry in one click with one endpoint passing the id".
- **S5** `GET api/email/:emailId` (uuid or short_code) returns email + full attempt log history; `GET api/email` lists with filters (state, id_client, date from/to, short_code search) and pagination. Both behind AuthGuard.
- **S6** Automatic retry scheduler: on a fixed interval (30s) it picks emails with state RETRYING and `next_retry_at <= now`, re-sends them through the same path as S3/S4, respects `max_retries` and `retry_interval_seconds`, and does nothing when there is no configuration or no retryable emails.
- **S7** New/changed endpoints update README (endpoint table + data model + env/scheduler notes). Existing unit tests and e2e keep passing; module boot e2e still works with the mocked Prisma provider (new models exposed through the mock).
- **S8** `pnpm prisma generate` succeeds; migration for the new models is prepared (user runs `pnpm prisma migrate dev --name email_pipeline` or `db push` when their DB is up).

## Tasks

| ID | Spec | Route | Commit |
|----|------|-------|--------|
| T1 | S1, S8 | inline | 6747561 feat(email): agrega modelos emails y email_send_logs con enums de estado y nivel de log |
| T2 | S2 | inline | cde8f56 + 71e3dce feat(email): entidades, contratos, repositorios, DTOs y mapper |
| T3 | S3 (ids) | inline | 157de71 feat(email): generador de ids con uuid v4 y short code base62 |
| T4 | S3 | inline | 467e1f2 feat(email): pipeline de envio con persistencia, auditoria por intento, limite diario y maquina de estados |
| T5 | S5 | inline | f181b07 feat(email): endpoints de listado, detalle y reintento (incluye S4 y S6 del mismo commit) |
| T6 | S4 | inline | f181b07 feat(email): endpoints de listado, detalle y reintento por uuid/short code mas scheduler automatico |
| T7 | S6 | inline | f181b07 (EmailRetryScheduler + RetryDueEmailsUseCase; specs en email-retry.scheduler.spec.ts) |
| T8 | S7 | inline | pending-final (README + e2e en el commit de cierre) |

## Log

- L1 (2026-10-26) — Original request verbatim: "considero que aun faltan algunos endpoints para que el sistema se mas amplio, pordrias decirme basado en el analisis que otra funcionalidades faltan para que el sistema sea mas completo y tenga un valor diferencial o un plus que otros no tengan, ademas quiero logs o auditoria de si fue enviado con  exito, hubo algun warning, un fail y tambien logica de reintento del mismo correo que se envio solo a un click o ejecutando un solo enpoint pasando un id del correo, sabes maneja id tipo long, short, uuid v4 segun sea el caso" — user then chose "Pipeline completo" (persistence + logs + retry endpoint + automatic scheduler) as the first implementation.
- L2 (2026-10-26) — DB `localhost:5505` unreachable at start: migration deferred (S8), code + client generation proceed offline.
- L3 (2026-10-26) — Verification evidence: `pnpm test` → 44 passed (0 failed); `pnpm test:e2e` → 5 passed (0 failed); `pnpm build` clean. IMailerService contract enriched to `MailerResult { ok, message }` so attempt logs carry the real failure message (register-client use case unchanged, ignores result). Scheduler interval fixed at 30s. Daily limit counts SENT+WARNING of the day; it is enforced on first send only (manual retry one-click bypasses it by design decision).
- Risk lines:
  - S1: Risk: item 1 (schema change; additive new tables, no existing data touched; migration pending until user's DB is up).
  - S2: Risk: none (additive contracts/repositories).
  - S3: Risk: item 3 (IMailerService contract changed from boolean to MailerResult; internal consumers adapted).
  - S4: Risk: item 3 (new public endpoint path and id semantics).
  - S5: Risk: item 3 (new public endpoints).
  - S6: Risk: item 4 (background process touching data; bounded by idempotent, fail-closed tick).
  - S7: Risk: none (docs/tests).
  - S8: Risk: none (generation verified offline: `prisma validate` + `prisma generate` OK).

