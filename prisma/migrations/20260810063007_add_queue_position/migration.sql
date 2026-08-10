-- AddColumn queuePosition to Job
-- Denormalizes Redis queue position to avoid O(n) polling on every status check
ALTER TABLE "Job" ADD COLUMN "queuePosition" INTEGER;
