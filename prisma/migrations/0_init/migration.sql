-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."admin_user" (
    "id_user" BIGSERIAL NOT NULL,
    "name" VARCHAR(255),
    "surname" VARCHAR(255),
    "username" VARCHAR(255),
    "password" VARCHAR(255),
    "ip_connection" VARCHAR(255),
    "auth_token" TEXT,
    "is_active" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id_user")
);

-- CreateTable
CREATE TABLE "public"."client_credentials" (
    "id_client_credential" BIGSERIAL NOT NULL,
    "id_client" BIGINT,
    "username" VARCHAR(255),
    "password" TEXT,
    "ip_connection" VARCHAR(255),
    "assign_credentials_token_jti" VARCHAR(50),
    "auth_token" TEXT,
    "recovery_token" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "checked_credential_assignment_token" BOOLEAN DEFAULT false,

    CONSTRAINT "client_credentials_pkey" PRIMARY KEY ("id_client_credential")
);

-- CreateTable
CREATE TABLE "public"."clients" (
    "id_client" BIGSERIAL NOT NULL,
    "id_client_state" SMALLINT,
    "id_type" SMALLINT,
    "id_number" VARCHAR(50),
    "name" VARCHAR(255),
    "email" VARCHAR(255),
    "cell_callsign" VARCHAR(5),
    "cell_phone" VARCHAR(255),
    "user_first_name" VARCHAR(255),
    "user_second_name" VARCHAR(255),
    "user_first_surname" VARCHAR(255),
    "user_second_surname" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id_client")
);

-- CreateTable
CREATE TABLE "public"."diffusion_information" (
    "id_diffusion_information" BIGSERIAL NOT NULL,
    "id_client" BIGINT,
    "sender_email" VARCHAR(255),
    "mail_application_password" TEXT,
    "id_smtp_server" BIGINT,
    "client_id" VARCHAR(255),
    "client_secret" VARCHAR(255),
    "tenant_id" VARCHAR(255),
    "refresh_token" TEXT,
    "is_default" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diffusion_information_pkey" PRIMARY KEY ("id_diffusion_information")
);

-- CreateTable
CREATE TABLE "public"."id_types" (
    "id_type" SMALLSERIAL NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "id_types_pkey" PRIMARY KEY ("id_type")
);

-- CreateTable
CREATE TABLE "public"."nexlify_configuration" (
    "id_configuration" BIGSERIAL NOT NULL,
    "sender_email" VARCHAR(255) NOT NULL,
    "sender_name" VARCHAR(255),
    "reply_to_email" VARCHAR(255),
    "mail_application_password" TEXT,
    "id_smtp_server" BIGINT,
    "client_id" VARCHAR(255),
    "client_secret" VARCHAR(255),
    "tenant_id" VARCHAR(255),
    "refresh_token" TEXT,
    "daily_send_limit" INTEGER DEFAULT 500,
    "max_retries" SMALLINT DEFAULT 3,
    "retry_interval_seconds" SMALLINT DEFAULT 60,
    "email_header_text" TEXT,
    "email_header_html" TEXT,
    "email_header_img_url" TEXT,
    "email_footer_text" TEXT,
    "email_footer_html" TEXT,
    "email_footer_img_url" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nexlify_configuration_pkey" PRIMARY KEY ("id_configuration")
);

-- CreateTable
CREATE TABLE "public"."nexlify_keys" (
    "id_nexlify_key" BIGSERIAL NOT NULL,
    "id_client" BIGINT,
    "api_key" TEXT,
    "state" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nexlify_keys_pkey" PRIMARY KEY ("id_nexlify_key")
);

-- CreateTable
CREATE TABLE "public"."nexlify_keys_logs" (
    "id_nexlify_key_log" BIGSERIAL NOT NULL,
    "id_client" BIGINT,
    "api_key" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nexlify_keys_logs_pkey" PRIMARY KEY ("id_nexlify_key_log")
);

-- CreateTable
CREATE TABLE "public"."smtp_servers" (
    "id_smpt_server" BIGSERIAL NOT NULL,
    "provider" VARCHAR(50),
    "host" VARCHAR(50),
    "port" SMALLINT,
    "auth_type" VARCHAR(20) NOT NULL DEFAULT 'basic',
    "state" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "smtp_servers_pkey" PRIMARY KEY ("id_smpt_server")
);

-- CreateTable
CREATE TABLE "public"."templates" (
    "id_template" UUID NOT NULL,
    "name" VARCHAR(50),
    "subject" VARCHAR(255),
    "template" TEXT,
    "is_active" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id_template")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id_user" BIGSERIAL NOT NULL,
    "id_client" BIGINT,
    "id_type" SMALLINT,
    "id_number" VARCHAR(50),
    "first_name" VARCHAR(255),
    "second_name" VARCHAR(255),
    "first_surname" VARCHAR(255),
    "second_surname" VARCHAR(255),
    "email" VARCHAR(255),
    "cell_callsign" VARCHAR(5),
    "cell_phone" VARCHAR(255),
    "birthdate" DATE,
    "state" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id_user")
);

-- CreateIndex
CREATE UNIQUE INDEX "id_types_code_key" ON "public"."id_types"("code" ASC);
