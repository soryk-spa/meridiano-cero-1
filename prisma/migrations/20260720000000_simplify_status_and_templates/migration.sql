-- AlterEnum
BEGIN;
CREATE TYPE "TripStatus_new" AS ENUM ('IN_TRANSIT', 'IN_ACTIVITY', 'RESTING', 'FINISHED');
ALTER TABLE "public"."Trip" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Trip" ALTER COLUMN "status" TYPE "TripStatus_new" USING ("status"::text::"TripStatus_new");
ALTER TYPE "TripStatus" RENAME TO "TripStatus_old";
ALTER TYPE "TripStatus_new" RENAME TO "TripStatus";
DROP TYPE "public"."TripStatus_old";
ALTER TABLE "Trip" ALTER COLUMN "status" SET DEFAULT 'IN_TRANSIT';
COMMIT;

-- AlterTable
ALTER TABLE "ItineraryItem" ADD COLUMN     "dayNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "requirementsMessage" TEXT;

-- CreateTable
CREATE TABLE "AnnouncementTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'INFO',
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "defaultLocation" TEXT,
    "description" TEXT NOT NULL,
    "requirementsMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityTemplate_pkey" PRIMARY KEY ("id")
);

