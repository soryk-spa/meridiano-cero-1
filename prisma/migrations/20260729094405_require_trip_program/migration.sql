-- DropForeignKey
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_programId_fkey";

-- AlterTable
ALTER TABLE "Trip" ALTER COLUMN "programId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
