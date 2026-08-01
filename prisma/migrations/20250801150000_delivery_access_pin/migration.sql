-- Optional PIN protection for public delivery links (Phase A)
ALTER TABLE "EncargoDelivery" ADD COLUMN "accessPinHash" TEXT;
