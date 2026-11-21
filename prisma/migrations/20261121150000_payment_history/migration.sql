CREATE TYPE "PaymentTransactionStatus" AS ENUM (
    'PENDING',
    'PAID',
    'OVERDUE',
    'CANCELLED',
    'REFUNDED'
);

CREATE TYPE "PaymentMethod" AS ENUM (
    'PIX',
    'BOLETO',
    'CREDIT_CARD',
    'BANK_TRANSFER',
    'OTHER'
);

CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "payer_id" UUID NOT NULL,
    "payee_id" UUID NOT NULL,
    "description" VARCHAR(160) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL,
    "payment_method" "PaymentMethod",
    "transaction_date" DATE NOT NULL,
    "paid_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_transactions_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "payment_transactions_parties_check" CHECK ("payer_id" <> "payee_id"),
    CONSTRAINT "payment_transactions_payer_id_fkey"
        FOREIGN KEY ("payer_id") REFERENCES "users"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payment_transactions_payee_id_fkey"
        FOREIGN KEY ("payee_id") REFERENCES "users"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "payment_transactions_payer_id_transaction_date_idx"
    ON "payment_transactions"("payer_id", "transaction_date");
CREATE INDEX "payment_transactions_payee_id_transaction_date_idx"
    ON "payment_transactions"("payee_id", "transaction_date");
CREATE INDEX "payment_transactions_status_transaction_date_idx"
    ON "payment_transactions"("status", "transaction_date");
