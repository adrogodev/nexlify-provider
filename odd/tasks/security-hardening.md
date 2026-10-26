# security-hardening

Objective: fix the four gaps flagged in the project analysis: hardcoded JWT fallback key, unsalted SHA-256 passwords, insecure/unguarded endpoints (email, master, smtp wiring) and missing docs/tests.

Branch: `feat/security-hardening` (from `main`). Delivery: single feature branch, work-unit commits, Conventional Commits (Spanish). Push/PR: user decision.
Test runner: `pnpm test` (Jest, rootDir `src`, colocated `*.spec.ts`) + `pnpm test:e2e`.

## Specs

- **S1** Remove hardcoded JWT fallback key `"k3yjw7k73y"` from `JwtGeneratorHelper` (createTokenWithExpiration, createTokenWithoutExpiration, getDataToken). Behavior after change: an empty key is a configuration error and must throw (never silently sign/verify with the fallback). The real key always comes from `AppEnvs.JWT_SECRET_KEY` (required env).
- **S2** `MailerService` TLS must not be insecure by default: `rejectUnauthorized` configurable via env `MAILER_TLS_REJECT_UNAUTHORIZED` (default `true`), documented in `.env.example`. Remove the `SSLv3` cipher restriction (modern default).
- **S3** Replace unsalted SHA-256 password hashing with bcrypt. New infrastructure password hasher (bcryptjs), used by admin auth, client sign-in and assign-credentials. Backwards compatibility (High-risk item 1, persisted format): existing SHA-256 hashes in `admin_user.password` / `client_credentials.password` must still verify, and on successful legacy login the stored hash is upgraded to bcrypt in the same request. Seed (`prisma/seed.ts`) writes bcrypt hashes.
- **S4** Endpoint protection (High-risk item 3, contract change):
  - `POST api/email/send` and `GET api/master/id-types` get `AuthGuard` (Bearer JWT admin/client).
  - `ConfigurationExistsGuard` applied where the platform configuration is a prerequisite: `POST api/smtp-server/add` and `POST api/email/send` (throws `AlreadyExistsException` "No se ha realizado la configuración para el uso de la plataforma" when no configuration exists).
  - Fix `SmtpServerExistsGuard`: when no configuration exists at all it currently passes through silently — it must deny.
- **S5** `SendEmailUseCase` must not use hardcoded dummy SMTP transport (`smtp.office365.com` / `test@mail.com`): it resolves SMTP credentials from the global `nexlify_configuration`; when configuration or its SMTP server is missing, it throws the configuration guard's error and does not attempt to send.
- **S6** Real project README: purpose, architecture layers, data model, full endpoint table with guards, env vars, seed and run instructions. Replace failing boilerplate e2e (`test/app.e2e-spec.ts`) with a spec consistent with the actual API surface.

## Tasks

| ID | Spec | Route | Commit |
|----|------|-------|--------|
| T1 | S1 | inline | ed8196e fix(security): elimina la key JWT de fallback hardcodeada y lanza error con key vacia |
| T2 | S2 | inline | 63d4264 fix(security): TLS del mailer configurable por env (edicion de .env.example denegada por permisos; documentado en README) |
| T3 | S3 | inline | 8c5776a feat(security): reemplaza SHA-256 por bcrypt en credenciales con soporte legacy y mejora automatica al iniciar sesion |
| T4 | S4 | inline | 7692801 fix(security): protege endpoints de email y master con AuthGuard, aplica ConfigurationExistsGuard y corrige bypass en SmtpServerExistsGuard |
| T5 | S5 | inline | pending |
| T6 | S6 | inline | pending |

## Log

- L1 (2026-10-26) — Original request verbatim: "Mira pudes hacer los cambios y actualizar todo lo que me recomiendas basado en las Cosas que debería mirar" — refers to the four recommendation areas from the earlier analysis: (1) JWT fallback key + SHA-256 unsalted + `rejectUnauthorized:false` TLS, (2) unguarded `api/email/send` + `api/master/id-types` + unused `ConfigurationExistsGuard`, (3) no tests, (4) boilerplate README. Scope decision by orchestrator: `send-email` stub also wired to real configuration (S5) since it was flagged as unfinished; assumptions documented as assumptions.
