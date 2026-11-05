# platform-completion

Objective: take Nexlify (nexlify-provider backend + nexlify front) to a deployable 100%: migrations, the missing email-platform basics, the recommended differentiators (certified email + AI reply intelligence + LatAm templates + webhook DX), Scalar docs, front integration, Docker deployment, and live browser verification.
Branch: `feature/platform-completion` in both repos. Delivery: ask-on-risk. Runners: backend `pnpm test` + `pnpm test:e2e` + `pnpm build`; front `pnpm test` (Vitest) + `npx tsc --noEmit` + `pnpm lint`.

## Specs

- **S1 Migrations.** Versioned Prisma migrations in `prisma/migrations`: a `0_init` baseline equal to the current live DB (marked applied, no SQL run on existing data) and an additive migration for every missing table/column/enum value. Applied to the local DB without touching existing rows.
- **S2 Template variables.** `POST api/email/send` accepts `id_template` + `variables` (object). Subject and body render `{{variable}}` placeholders (HTML-escaped in HTML body). Missing variables → 400 listing them. Templates declare `variables` (string[]), `category`, `locale`. The rendered email stores `id_template` and `template_variables`.
- **S3 LatAm templates.** Seed (idempotent, by name) of Spanish templates: electronic invoice, payment reminder / collections, legal notification, welcome, password recovery.
- **S4 Sending domains.** Register a domain → server generates an RSA-2048 DKIM keypair (private key encrypted at rest with `ENCRYPT_KEY`) and returns the DNS records to publish (SPF TXT, DKIM TXT `<selector>._domainkey`, DMARC TXT). `POST verify` resolves DNS and stores `spf/dkim/dmarc_verified`. Emails whose `from` domain is a DKIM-verified domain are DKIM-signed by nodemailer. List/delete endpoints.
- **S5 Suppression list.** Table of suppressed addresses per client (reasons HARD_BOUNCE, SOFT_BOUNCE, COMPLAINT, UNSUBSCRIBE, MANUAL). Sends/diffusions to a suppressed address are not sent: the email is persisted with state `SUPPRESSED` and a log. Signed bounce/complaint ingestion webhook (`POST api/email/events/bounce`, same HMAC scheme as inbound) marks the email `BOUNCED` and suppresses hard bounces/complaints. Every sent email carries `List-Unsubscribe` + `List-Unsubscribe-Post` headers to a public signed unsubscribe link (`GET/POST api/unsubscribe/:token`). CRUD (list/add/remove) for admin and own client.
- **S6 Dashboard stats.** `GET api/stats/overview?from&to` (dual auth, client-scoped for clients): totals per state, delivery rate, bounce rate, replies, daily series (sent/failed/received) and remaining daily budget. Front home shows KPIs + daily chart.
- **S7 Certified email (differentiator).** `POST api/email/:emailId/certificate` issues an immutable certificate for a SENT/WARNING email: evidence snapshot (content SHA-256, from/to/subject, message_id, every attempt log with timestamps and SMTP host, reply chain) + evidence SHA-256 + public `certificate_code`. `GET api/email/:emailId/certificate/pdf` returns the PDF. Public `GET api/certificates/:code/verify` returns validity + evidence hash (no body content).
- **S8 AI reply intelligence (differentiator).** Every ingested RECEIVED reply is analyzed (async, never blocks ingestion) with the Claude API when `ANTHROPIC_API_KEY` is set: intent (ACCEPT, REJECT, QUESTION, PAYMENT_PROMISE, COMPLAINT, OUT_OF_OFFICE, UNSUBSCRIBE_REQUEST, OTHER), sentiment, summary (es), extracted entities (dates, amounts, references). Stored on the email; exposed in detail; subscriptions gain `include_ai_analysis`; UNSUBSCRIBE_REQUEST adds a suppression. Without a key the feature is reported as disabled, nothing fails. `POST api/email/:emailId/analyze` re-runs it.
- **S9 Webhook DX.** `GET api/webhooks/:endpointUuid/deliveries` (paginated history), `POST api/webhooks/deliveries/:id/redeliver`, `POST api/webhooks/:endpointUuid/test` (signed `ping` event, synchronous result).
- **S10 Scalar docs.** `docs/openapi.json` documents every endpoint (old and new) with schemas, auth and examples; served at `/api/docs`.
- **S11 Front integration.** Every S2–S9 surface integrated in the dashboard (admin) and portal (client) following the existing FSD/actions pattern, with Vitest tests per feature and a real README.
- **S12 Docker.** Production Dockerfiles for both apps (multi-stage, non-root), `.dockerignore`, root `docker-compose.yml` (postgres, provider running migrations on start, front, mailpit for local SMTP), `.env.example` files and deploy docs.
- **S13 Browser verification.** Exercise the features live in Brave through the Claude browser extension and record the results.

## Tasks

| ID | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1 (+ schema for S2–S9) | inline | in progress | |
| T2 | S2, S3, S4, S5 (send pipeline) | delegated writer A (parallel, worktree) | pending | |
| T3 | S6, S7, S8, S9 (evidence + intelligence) | delegated writer B (parallel, worktree) | pending | |
| T4 | S10 merge of docs fragments | inline | pending | |
| T5 | S11 | delegated writer C (front repo, parallel) | pending | |
| T6 | S12 | inline | pending | |
| T7 | S13 | inline | pending | |

Route evidence: T2/T3/T5 are independent units of several hundred lines each with disjoint surfaces (send path vs inbound/webhooks/certificates vs another repo) launched together → Writer trigger (a). Shared files (`schema.prisma`, module registrations, `docs/openapi.json`) are owned by the parent (schema done in T1) or merged by the parent.

## Log

- L1 (2026-11-05) — user request verbatim: "Puedes por favor completar el proyeto hasta un 100% tanto el backend (incluida la documetacion en scalar) y el fronted (integración) incluida la configuracion docker para su posterior despliegue  y todo lo que mencionaste anteriormente incluyendo el valor diferencial que me recomiedas, una vez termines conectate con la extension de claude instalada en el navegador brave para probar en lo mas posible todas las funcionalidades". "Todo lo que mencionaste" = migrations, dashboard home metrics, template variables, front README, SPF/DKIM/DMARC, bounces/complaints, unsubscribe list, plus differentiators: AI reply intelligence, LatAm focus, certified email, webhook DX.
- L2 (2026-11-05) — Environment: no docker on Windows PATH; Docker runs in WSL (`wsl -u root docker ...`). Live Postgres `postgres` container on `localhost:5505` (root/root), DB `nexlify` has 11 of 17 tables, 23 clients, no `_prisma_migrations` → baseline required (Risk item 1). Local `.env` created (gitignored); test admin `qa_admin` to be seeded additively (existing `admin` untouched). Assumption: AI provider = Anthropic Claude (`claude-haiku-5-5`), optional via `ANTHROPIC_API_KEY`.
