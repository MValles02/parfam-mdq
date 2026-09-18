/*
  Warnings:

  - You are about to drop the column `sortOrder` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `announcementBar` on the `SiteSetting` table. All the data in the column will be lost.
  - You are about to drop the column `heroImageUrl` on the `SiteSetting` table. All the data in the column will be lost.
  - You are about to drop the column `logoUrl` on the `SiteSetting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "sortOrder";

-- AlterTable
ALTER TABLE "SiteSetting" DROP COLUMN "announcementBar",
DROP COLUMN "heroImageUrl",
DROP COLUMN "logoUrl";
