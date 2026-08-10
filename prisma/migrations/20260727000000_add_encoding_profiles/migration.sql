-- CreateTable
CREATE TABLE "EncodingProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "codec" TEXT NOT NULL,
    "container" TEXT NOT NULL DEFAULT 'mp4',
    "crf" INTEGER NOT NULL,
    "videoBitrateMax" INTEGER,
    "speedPreset" TEXT NOT NULL,
    "pixelFormat" TEXT NOT NULL DEFAULT 'yuv420p',
    "audioCodec" TEXT NOT NULL DEFAULT 'aac',
    "audioBitrate" INTEGER NOT NULL DEFAULT 96,
    "minFaceScore" DOUBLE PRECISION,
    "minTextScore" DOUBLE PRECISION,
    "minMotionScore" DOUBLE PRECISION,
    "maxMotionScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncodingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EncodingProfile_name_key" ON "EncodingProfile"("name");

-- CreateIndex
CREATE INDEX "EncodingProfile_codec_idx" ON "EncodingProfile"("codec");

-- AlterTable (Job adaptive engine fields)
ALTER TABLE "Job" ADD COLUMN "analysisResult" JSONB;
ALTER TABLE "Job" ADD COLUMN "profileId" TEXT;
ALTER TABLE "Job" ADD COLUMN "vmafScore" DOUBLE PRECISION;
ALTER TABLE "Job" ADD COLUMN "reencodeCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Job_profileId_idx" ON "Job"("profileId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "EncodingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
