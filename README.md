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

> `JWT_SECRET_KEY` and `ENCRYPT_KEY` are required: requests with an empty value fail fast instead of falling back to default secrets.

## Data model (13 tables)

`admin_user` (platform admins) · `clients` (companies/persons) · `client_credentials` (login, encrypted `auth_token`/`recovery_token`) · `nexlify_keys` (SHA-256 hashed client API keys) · `nexlify_keys_logs` (API key audit) · `smtp_servers` (SMTP provider catalog) · `diffusion_information` (per-client mail credentials) · `templates` · `users` (end-users of a client) · `nexlify_configuration` (singleton: sender identity, SMTP credentials, send limits, email header/footer) · `id_types` (identification document catalog) · `emails` (persistent delivery records) · `email_send_logs` (per-attempt audit).

Password hashing: bcrypt (cost 12). Legacy unsalted SHA-256 hashes are still accepted for backwards compatibility and are upgraded to bcrypt automatically on the next successful login.

### Email delivery pipeline

Every send is a persistent record with three identifiers:

- `id_email` (BigInt) — internal PK, never exposed.
- `email_uuid` (UUID v4) — public API identifier.
- `short_code` (`NX-XXXXXXX`, base62) — human reference for UI/log search.

States: `QUEUED → SENDING → SENT | WARNING | RETRYING → FAILED`. Every attempt writes an `email_send_logs` row with level `SUCCESS` (first-attempt success), `WARNING` (success after retries) or `ERROR` (failure), the SMTP host used and the message. `nexlify_configuration.daily_send_limit` caps sends per day; `max_retries` and `retry_interval_seconds` drive the retry machine. A scheduler (`EmailRetryScheduler`, every 30s) re-sends due `RETRYING` emails; a failed batch never stops the rest.

To create the new tables run `pnpm prisma migrate dev --name email_pipeline` (or `pnpm prisma db push`) with the database up.

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
| POST | `api/email/send` | AuthGuard, ConfigurationExistsGuard | Persist + send an email; returns `email_uuid` and `short_code` |
| GET | `api/email` | AuthGuard | List delivery records (filters: state, client, dates, short_code; paginated) |
| GET | `api/email/:emailId` | AuthGuard | Email detail with full attempt log history (`emailId` = uuid or short code) |
| POST | `api/email/:emailId/retry` | AuthGuard, ConfigurationExistsGuard | Retry one specific delivery in one click |
| POST | `api/smtp-server/add` | AuthGuard, ConfigurationExistsGuard | Add an SMTP server to the catalog |
| POST | `api/configuration/add` | AuthGuard | Create the global Nexlify configuration |
| GET | `api/configuration/get` | AuthGuard | Read global configuration |
| PUT | `api/configuration/update` | AuthGuard | Update global configuration |
| GET | `api/master/id-types` | AuthGuard | Identification types (master data) |
| GET | `api/verify` | — | Health check |

## Authentication model

`AuthGuard` + `AuthenticatedUserSecurity` implement **dual authentication**: the Bearer token is resolved against either `clients` (state `ACTIVO`) or `admin_user` (`is_active`), and the IP embedded in the token must match the request IP. Session context is exposed through `AsyncLocalStorage` (`ContextInterceptor`) and consumed by the `*/data` use cases.

## Tests

- Unit specs are colocated next to the code (`*.spec.ts`) and cover helpers, guards and use cases with mocked repositories — no database required.
- `pnpm test:e2e` boots the full Nest module against a mocked Prisma provider and asserts the real HTTP surface.
