-- AlterTable
ALTER TABLE "ActivityTemplate" ADD COLUMN     "destination" TEXT;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "companionCountFemale" INTEGER,
ADD COLUMN     "companionCountMale" INTEGER,
ADD COLUMN     "curso" TEXT,
ADD COLUMN     "studentCountFemale" INTEGER,
ADD COLUMN     "studentCountMale" INTEGER;
