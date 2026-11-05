-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('SENT', 'RECEIVED');
-- CreateEnum
CREATE TYPE "EmailState" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'WARNING', 'FAILED', 'RETRYING', 'RECEIVED', 'BOUNCED', 'SUPPRESSED');
-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('HARD_BOUNCE', 'SOFT_BOUNCE', 'COMPLAINT', 'UNSUBSCRIBE', 'MANUAL');
-- CreateEnum
CREATE TYPE "EmailLogLevel" AS ENUM ('SUCCESS', 'WARNING', 'ERROR');
-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "category" VARCHAR(50),
ADD COLUMN     "locale" VARCHAR(10) DEFAULT 'es',
ADD COLUMN     "variables" TEXT,
ALTER COLUMN "id_template" SET DEFAULT gen_random_uuid();
-- CreateTable
CREATE TABLE "emails" (
    "id_email" BIGSERIAL NOT NULL,
    "email_uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "short_code" VARCHAR(20) NOT NULL,
    "id_client" BIGINT,
    "from_email" VARCHAR(255) NOT NULL,
    "to_email" VARCHAR(1000) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "body_html" TEXT,
    "body_text" TEXT,
    "state" "EmailState" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "message_id" VARCHAR(255),
    "direction" "EmailDirection" NOT NULL DEFAULT 'SENT',
    "parent_email_id" BIGINT,
    "id_template" UUID,
    "template_variables" TEXT,
    "content_hash" VARCHAR(64),
    "bounced_at" TIMESTAMP(3),
    "ai_intent" VARCHAR(30),
    "ai_sentiment" VARCHAR(20),
    "ai_summary" TEXT,
    "ai_data" TEXT,
    "ai_analyzed_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "emails_pkey" PRIMARY KEY ("id_email")
);
-- CreateTable
CREATE TABLE "email_send_logs" (
    "id_log" BIGSERIAL NOT NULL,
    "id_email" BIGINT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "level" "EmailLogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "smtp_host" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_send_logs_pkey" PRIMARY KEY ("id_log")
);
-- CreateTable
CREATE TABLE "email_attachments" (
    "id_attachment" BIGSERIAL NOT NULL,
    "id_email" BIGINT NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(100),
    "size_bytes" INTEGER,
    "content" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_attachments_pkey" PRIMARY KEY ("id_attachment")
);
-- CreateTable
CREATE TABLE "email_event_subscriptions" (
    "id_subscription" BIGSERIAL NOT NULL,
    "subscription_uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_client" BIGINT NOT NULL,
    "id_webhook_endpoint" BIGINT NOT NULL,
    "events" VARCHAR(300) NOT NULL,
    "include_body" BOOLEAN NOT NULL DEFAULT false,
    "include_dates" BOOLEAN NOT NULL DEFAULT true,
    "include_sender" BOOLEAN NOT NULL DEFAULT true,
    "include_recipients" BOOLEAN NOT NULL DEFAULT true,
    "include_attachments" BOOLEAN NOT NULL DEFAULT false,
    "include_ai_analysis" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_event_subscriptions_pkey" PRIMARY KEY ("id_subscription")
);
-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id_endpoint" BIGSERIAL NOT NULL,
    "endpoint_uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_client" BIGINT,
    "url" VARCHAR(500) NOT NULL,
    "secret" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id_endpoint")
);
-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id_delivery" BIGSERIAL NOT NULL,
    "id_endpoint" BIGINT NOT NULL,
    "id_email" BIGINT NOT NULL,
    "event" VARCHAR(20) NOT NULL,
    "payload" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "ok" BOOLEAN,
    "status_code" INTEGER,
    "error" VARCHAR(500),
    "next_retry_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id_delivery")
);
-- CreateTable
CREATE TABLE "sending_domains" (
    "id_domain" BIGSERIAL NOT NULL,
    "domain_uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_client" BIGINT,
    "domain" VARCHAR(255) NOT NULL,
    "dkim_selector" VARCHAR(63) NOT NULL DEFAULT 'nexlify',
    "dkim_public_key" TEXT NOT NULL,
    "dkim_private_key" TEXT NOT NULL,
    "spf_verified" BOOLEAN NOT NULL DEFAULT false,
    "dkim_verified" BOOLEAN NOT NULL DEFAULT false,
    "dmarc_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_checked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sending_domains_pkey" PRIMARY KEY ("id_domain")
);
-- CreateTable
CREATE TABLE "suppressions" (
    "id_suppression" BIGSERIAL NOT NULL,
    "suppression_uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_client" BIGINT,
    "email" VARCHAR(255) NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "source_email_id" BIGINT,
    "details" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suppressions_pkey" PRIMARY KEY ("id_suppression")
);
-- CreateTable
CREATE TABLE "email_certificates" (
    "id_certificate" BIGSERIAL NOT NULL,
    "certificate_uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "certificate_code" VARCHAR(30) NOT NULL,
    "id_email" BIGINT NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "evidence_hash" VARCHAR(64) NOT NULL,
    "evidence" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_certificates_pkey" PRIMARY KEY ("id_certificate")
);
-- CreateIndex
CREATE UNIQUE INDEX "emails_email_uuid_key" ON "emails"("email_uuid");
-- CreateIndex
CREATE UNIQUE INDEX "emails_short_code_key" ON "emails"("short_code");
-- CreateIndex
CREATE INDEX "emails_state_next_retry_at_idx" ON "emails"("state", "next_retry_at");
-- CreateIndex
CREATE INDEX "email_send_logs_id_email_idx" ON "email_send_logs"("id_email");
-- CreateIndex
CREATE INDEX "email_attachments_id_email_idx" ON "email_attachments"("id_email");
-- CreateIndex
CREATE UNIQUE INDEX "email_event_subscriptions_subscription_uuid_key" ON "email_event_subscriptions"("subscription_uuid");
-- CreateIndex
CREATE UNIQUE INDEX "webhook_endpoints_endpoint_uuid_key" ON "webhook_endpoints"("endpoint_uuid");
-- CreateIndex
CREATE INDEX "webhook_deliveries_next_retry_at_idx" ON "webhook_deliveries"("next_retry_at");
-- CreateIndex
CREATE UNIQUE INDEX "sending_domains_domain_uuid_key" ON "sending_domains"("domain_uuid");
-- CreateIndex
CREATE UNIQUE INDEX "sending_domains_domain_key" ON "sending_domains"("domain");
-- CreateIndex
CREATE UNIQUE INDEX "suppressions_suppression_uuid_key" ON "suppressions"("suppression_uuid");
-- CreateIndex
CREATE INDEX "suppressions_email_idx" ON "suppressions"("email");
-- CreateIndex
CREATE UNIQUE INDEX "email_certificates_certificate_uuid_key" ON "email_certificates"("certificate_uuid");
-- CreateIndex
CREATE UNIQUE INDEX "email_certificates_certificate_code_key" ON "email_certificates"("certificate_code");
-- CreateIndex
CREATE UNIQUE INDEX "email_certificates_id_email_key" ON "email_certificates"("id_email");
