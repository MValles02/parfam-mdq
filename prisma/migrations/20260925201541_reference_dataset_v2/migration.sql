/*
  Warnings:

  - You are about to drop the column `hasPyramid` on the `FragranceRef` table. All the data in the column will be lost.
  - You are about to drop the column `originCountry` on the `FragranceRef` table. All the data in the column will be lost.
  - You are about to drop the column `ratingCount` on the `FragranceRef` table. All the data in the column will be lost.
  - You are about to drop the column `ratingValue` on the `FragranceRef` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `FragranceRef` table. All the data in the column will be lost.
  - You are about to drop the column `rank` on the `FragranceRefAccord` table. All the data in the column will be lost.
  - You are about to drop the column `occasions` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `seasons` on the `Product` table. All the data in the column will be lost.
  - You are about to alter the column `longevity` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(3,2)`.
  - You are about to alter the column `sillage` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(3,2)`.
  - Added the required column `slug` to the `FragranceRef` table without a default value. This is not possible if the table is not empty.
  - Added the required column `strength` to the `FragranceRefAccord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `family` to the `Note` table without a default value. This is not possible if the table is not empty.
  - Made the column `nameEs` on table `Note` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FragranceRef" DROP COLUMN "hasPyramid",
DROP COLUMN "originCountry",
DROP COLUMN "ratingCount",
DROP COLUMN "ratingValue",
DROP COLUMN "url",
ADD COLUMN     "collection" TEXT,
ADD COLUMN     "communityVotes" INTEGER,
ADD COLUMN     "daypartDayVotes" INTEGER,
ADD COLUMN     "daypartNightVotes" INTEGER,
ADD COLUMN     "longevity" DECIMAL(3,2),
ADD COLUMN     "popularity" INTEGER,
ADD COLUMN     "scrapedAt" TIMESTAMP(3),
ADD COLUMN     "seasonFallVotes" INTEGER,
ADD COLUMN     "seasonSpringVotes" INTEGER,
ADD COLUMN     "seasonSummerVotes" INTEGER,
ADD COLUMN     "seasonWinterVotes" INTEGER,
ADD COLUMN     "sillage" DECIMAL(3,2),
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FragranceRefAccord" DROP COLUMN "rank",
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "strength" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "FragranceRefNote" ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "position" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "family" TEXT NOT NULL,
ALTER COLUMN "nameEs" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "occasions",
DROP COLUMN "seasons",
ADD COLUMN     "collection" TEXT,
ADD COLUMN     "communityVotes" INTEGER,
ADD COLUMN     "daypartDay" INTEGER,
ADD COLUMN     "daypartNight" INTEGER,
ADD COLUMN     "seasonFall" INTEGER,
ADD COLUMN     "seasonSpring" INTEGER,
ADD COLUMN     "seasonSummer" INTEGER,
ADD COLUMN     "seasonWinter" INTEGER,
ALTER COLUMN "longevity" SET DATA TYPE DECIMAL(3,2),
ALTER COLUMN "sillage" SET DATA TYPE DECIMAL(3,2);

-- AlterTable
ALTER TABLE "ProductAccord" ADD COLUMN     "strength" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductNote" ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "position" DROP NOT NULL;

-- DropEnum
DROP TYPE "Occasion";

-- DropEnum
DROP TYPE "Season";

-- CreateIndex
CREATE INDEX "Note_family_idx" ON "Note"("family");

-- Note.nameEs is now required, so the partial index that ranked untranslated
-- notes for /admin/notas has nothing left to match.
DROP INDEX IF EXISTS "Note_untranslated_idx";
