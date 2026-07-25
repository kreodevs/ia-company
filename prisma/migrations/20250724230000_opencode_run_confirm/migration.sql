ALTER TYPE "OpencodeGateDecision" ADD VALUE 'proceed_opencode';

ALTER TABLE "OpencodeRunGate"
  ADD COLUMN "pendingBrief" TEXT,
  ADD COLUMN "overrideAgent" TEXT,
  ADD COLUMN "overrideModel" TEXT,
  ADD COLUMN "overrideProjectPath" TEXT;
