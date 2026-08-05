-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'STUDENT';

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "hotel" TEXT;

-- CreateTable
CREATE TABLE "TripLeg" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "TripLeg_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TripLeg" ADD CONSTRAINT "TripLeg_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
