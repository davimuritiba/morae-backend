CREATE TYPE "ContractDocumentType" AS ENUM (
    'SIGNED_CONTRACT',
    'IDENTITY_DOCUMENT',
    'PROOF_OF_ADDRESS',
    'OTHER'
);

CREATE TABLE "contract_documents" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "uploader_id" UUID NOT NULL,
    "storage_key" VARCHAR(36) NOT NULL,
    "original_name" VARCHAR(180) NOT NULL,
    "mime_type" VARCHAR(40) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "document_type" "ContractDocumentType" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contract_documents_size_bytes_check" CHECK ("size_bytes" > 0 AND "size_bytes" <= 10485760)
);

CREATE UNIQUE INDEX "contract_documents_storage_key_key"
ON "contract_documents"("storage_key");
CREATE INDEX "contract_documents_contract_id_created_at_idx"
ON "contract_documents"("contract_id", "created_at" DESC);

ALTER TABLE "contract_documents"
ADD CONSTRAINT "contract_documents_contract_id_fkey"
FOREIGN KEY ("contract_id") REFERENCES "rental_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contract_documents"
ADD CONSTRAINT "contract_documents_uploader_id_fkey"
FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
