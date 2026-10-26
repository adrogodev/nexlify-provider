# platform-expansion

Objective: keep growing the platform after the email pipeline — (A) client API keys with management endpoints and API-key authentication for the email API, (B) users CRUD, client lifecycle (update/state) and password recovery flow, (C) templates CRUD. UUID v4 values are generated **by the database** (`gen_random_uuid()`), never in code, unless technically necessary (e.g. short codes remain code-generated).

Branch: `feat/platform-expansion` (from `feat/email-pipeline`). Delivery: single feature branch, work-unit commits, Conventional Commits (Spanish). Push/PR: user decision.
Test runner: `pnpm test` (colocated specs) + `pnpm test:e2e`. DB still down at `localhost:5505` — migration remains pending like S8 of email-delivery-pipeline.

## Specs

- **S1** DB-side UUID v4: `emails.email_uuid` and `templates.id_template` get `@default(dbgenerated("gen_random_uuid()"))` in `prisma/schema.prisma`; `SendEmailUseCase` stops passing `email_uuid` on create (DB generates it; the created row is returned with it). `gen_random_uuid()` is built-in for PostgreSQL ≥ 13; for older versions the migration must include `CREATE EXTENSION IF NOT EXISTS pgcrypto`. Documented in README.
- **S2** API key management (existing `nexlify_keys` table, SHA-256 hashed `api_key` + `state`):
  - `POST api/nexlify-keys/generate` (AuthGuard): client session generates a key for itself; admin (`is_admin`) may pass `id_client` in body. Revokes previous active keys of that client (`state=false`), creates the new one active, returns the **raw key exactly once**.
  - `GET api/nexlify-keys/my` (AuthGuard): keys of the calling client (masked, never raw).
  - `PUT api/nexlify-keys/:id/revoke` (AuthGuard): sets `state=false`; only own keys unless admin; NotFound otherwise.
- **S3** `ApiKeyAuthGuard`: `X-API-Key` header → SHA-256 → lookup active `nexlify_keys` → sets `request.auth_data` (`is_admin: false`, `id_user` = owner client, key-bound IP) → pass; otherwise denies. Email endpoints (`api/email/**`: send, list, detail, retry) accept **either** bearer JWT (current AuthGuard) or `X-API-Key` through an OR-composing guard; everything else keeps pure JWT auth.
- **S4** Users CRUD (existing `users` table): `POST api/users` (create user under a client; admin may set id_client, client bound to own), `GET api/users` (paginated; admin sees all/filtered, client only own), `PUT api/users/:id` (update profile fields + `state` toggle;admin any, client own only). All AuthGuard.
- **S5** Client lifecycle + recovery:
  - `PUT api/client/update` (AuthGuard): client updates own contact data; admin updates any client by `id_client` body param.
  - `PUT api/client/state` (AuthGuard, admin only): suspend/reactivate by setting `clients.id_client_state`.
  - `POST api/client/forgot-password` (public): given username, generates a recovery JWT, stores it ENCRYPTED in `client_credentials.recovery_token` and emails the reset link (`PLATFORM_URL` + encrypted token). Never discloses whether the username exists (same generic response either way), but still creates the row only for existing usernames.
  - `POST api/client/reset-password` (public): input `recovery_token` (the ENCRYPTED token) + new password; decrypts, verifies the embedded JWT and that it matches the stored `recovery_token`, updates password with bcrypt and clears `recovery_token` (single use).
- **S6** Templates CRUD (existing `templates` table, DB uuid PK): `POST api/templates` (create, admin), `GET api/templates` (list active/all for admin), `PUT api/templates/:id` (update subject/template/is_active). AuthGuard everywhere.
- **S7** README endpoint table + data model notes updated; all unit specs + e2e stay green; `pnpm prisma validate`/`generate` OK offline (migration still pending until the user's DB is up).

## Tasks

| ID | Spec | Route | Commit |
|----|------|-------|--------|
| T1 | S1 | inline | 10b3e75 feat(platform): uuid v4 generado por base de datos con gen_random_uuid |
| T2 | S2 | inline | pending |
| T3 | S3 | inline | pending |
| T4 | S4 | delegated | d031ed4 feat(platform): CRUD de usuarios por cliente con listado paginado y control de permisos |
| T5 | S5 | delegated | 848b8d8 feat(platform): ciclo de vida del cliente y flujo de recuperacion de contrasena |
| T6 | S6 | delegated | pending |
| T7 | S7 | inline | pending |

## Log

- L1 (2026-10-26) — Original request verbatim: "sigue con las siguiente piezas de la propuesta y la generacion del uuid v4 hazla automaticamente por base de datos y solo si es necesario en el codigo, trata de no generarlo directamente desde el codigo" — instruction applies to every uuid-typed field (emails.email_uuid done via DB default; templates.id_template likewise; no code-side uuid v4 anywhere).
- L2 (2026-10-26) — T4 delegated done: users CRUD (`create-user`, `get-users`, `update-user`) on the existing `users` table with `USERS_REPOSITORY` (`getAllWithFilters`/`countWithFilters` following `emails.repository`), `User` entity, `UserInfoDTO`, `UserMapper` and controller `api/users` (`POST`, paginated `GET`, `PUT :id`), all `AuthGuard` + `ContextInterceptor`; id_client edit from body is admin-only on create and never part of the update patch; new entity file `src/core/domain/entities/user.entity.ts` was outside the planned edit surface and approved by the user before writing.
- L3 (2026-10-26) — T5 delegated done: `PUT api/client/update`, `PUT api/client/state` (admin only, `ClientStateEnum`) and public `POST api/client/forgot-password` (recovery JWT HS512 30m with code-level `jti` uuid — plain string column, no DB default — encrypted and stored in `client_credentials.recovery_token`, reset-link email built from `nexlify_configuration` SMTP creds, always generic response, unknown username resolves without side effects) plus `POST api/client/reset-password` (decrypt → `getDataToken` verify → exact match against stored `recovery_token` single use → bcrypt hash → token cleared); credentials identity reused `findByClientId`, so no new method on the credentials contract was needed.
