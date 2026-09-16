-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('WOMEN', 'MEN', 'UNISEX');

-- CreateEnum
CREATE TYPE "NotePosition" AS ENUM ('TOP', 'MIDDLE', 'BASE');

-- CreateEnum
CREATE TYPE "Concentration" AS ENUM ('EAU_FRAICHE', 'EAU_DE_COLOGNE', 'EAU_DE_TOILETTE', 'EAU_DE_PARFUM', 'PARFUM', 'EXTRAIT');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SUMMER', 'FALL', 'WINTER', 'SPRING');

-- CreateEnum
CREATE TYPE "Occasion" AS ENUM ('DAY', 'NIGHT', 'CASUAL', 'FORMAL');

-- CreateEnum
CREATE TYPE "VariantKind" AS ENUM ('FULL_BOTTLE', 'TESTER', 'DECANT');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN');

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perfumer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Perfumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameEs" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accord" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Accord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FragranceRef" (
    "id" TEXT NOT NULL,
    "pid" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "gender" "Gender",
    "ratingValue" DECIMAL(3,2),
    "ratingCount" INTEGER,
    "descriptionEn" TEXT,
    "hasPyramid" BOOLEAN NOT NULL DEFAULT false,
    "originCountry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FragranceRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FragranceRefNote" (
    "id" TEXT NOT NULL,
    "fragranceRefId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "position" "NotePosition" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FragranceRefNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FragranceRefAccord" (
    "id" TEXT NOT NULL,
    "fragranceRefId" TEXT NOT NULL,
    "accordId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "FragranceRefAccord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FragranceRefPerfumer" (
    "id" TEXT NOT NULL,
    "fragranceRefId" TEXT NOT NULL,
    "perfumerId" TEXT NOT NULL,

    CONSTRAINT "FragranceRefPerfumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "fragranceRefId" TEXT,
    "sourceUrl" TEXT,
    "description" TEXT,
    "gender" "Gender",
    "concentration" "Concentration",
    "year" INTEGER,
    "seasons" "Season"[],
    "occasions" "Occasion"[],
    "longevity" INTEGER,
    "sillage" INTEGER,
    "intensity" INTEGER,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductNote" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "position" "NotePosition" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAccord" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "accordId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductAccord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPerfumer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "perfumerId" TEXT NOT NULL,

    CONSTRAINT "ProductPerfumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "VariantKind" NOT NULL,
    "sizeMl" INTEGER,
    "priceArs" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalArs" DECIMAL(10,2) NOT NULL,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "variantLabel" TEXT NOT NULL,
    "unitPriceArs" DECIMAL(10,2) NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "whatsappNumber" TEXT NOT NULL,
    "whatsappMessageTemplate" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "brandTagline" TEXT NOT NULL,
    "logoUrl" TEXT,
    "heroImageUrl" TEXT,
    "instagramHandle" TEXT,
    "shippingInfo" TEXT,
    "announcementBar" TEXT,
    "seoDefaultTitle" TEXT,
    "seoDefaultDescription" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_name_idx" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Perfumer_slug_key" ON "Perfumer"("slug");

-- CreateIndex
CREATE INDEX "Perfumer_name_idx" ON "Perfumer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Note_slug_key" ON "Note"("slug");

-- CreateIndex
CREATE INDEX "Note_nameEn_idx" ON "Note"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "Accord_slug_key" ON "Accord"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FragranceRef_pid_key" ON "FragranceRef"("pid");

-- CreateIndex
CREATE INDEX "FragranceRef_name_idx" ON "FragranceRef"("name");

-- CreateIndex
CREATE INDEX "FragranceRef_brandId_idx" ON "FragranceRef"("brandId");

-- CreateIndex
CREATE INDEX "FragranceRefNote_fragranceRefId_idx" ON "FragranceRefNote"("fragranceRefId");

-- CreateIndex
CREATE INDEX "FragranceRefNote_noteId_idx" ON "FragranceRefNote"("noteId");

-- CreateIndex
CREATE INDEX "FragranceRefAccord_fragranceRefId_idx" ON "FragranceRefAccord"("fragranceRefId");

-- CreateIndex
CREATE INDEX "FragranceRefAccord_accordId_idx" ON "FragranceRefAccord"("accordId");

-- CreateIndex
CREATE INDEX "FragranceRefPerfumer_fragranceRefId_idx" ON "FragranceRefPerfumer"("fragranceRefId");

-- CreateIndex
CREATE INDEX "FragranceRefPerfumer_perfumerId_idx" ON "FragranceRefPerfumer"("perfumerId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_fragranceRefId_idx" ON "Product"("fragranceRefId");

-- CreateIndex
CREATE INDEX "ProductNote_productId_idx" ON "ProductNote"("productId");

-- CreateIndex
CREATE INDEX "ProductNote_noteId_idx" ON "ProductNote"("noteId");

-- CreateIndex
CREATE INDEX "ProductAccord_productId_idx" ON "ProductAccord"("productId");

-- CreateIndex
CREATE INDEX "ProductAccord_accordId_idx" ON "ProductAccord"("accordId");

-- CreateIndex
CREATE INDEX "ProductPerfumer_productId_idx" ON "ProductPerfumer"("productId");

-- CreateIndex
CREATE INDEX "ProductPerfumer_perfumerId_idx" ON "ProductPerfumer"("perfumerId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "FragranceRef" ADD CONSTRAINT "FragranceRef_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceRefNote" ADD CONSTRAINT "FragranceRefNote_fragranceRefId_fkey" FOREIGN KEY ("fragranceRefId") REFERENCES "FragranceRef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceRefNote" ADD CONSTRAINT "FragranceRefNote_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceRefAccord" ADD CONSTRAINT "FragranceRefAccord_fragranceRefId_fkey" FOREIGN KEY ("fragranceRefId") REFERENCES "FragranceRef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceRefAccord" ADD CONSTRAINT "FragranceRefAccord_accordId_fkey" FOREIGN KEY ("accordId") REFERENCES "Accord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceRefPerfumer" ADD CONSTRAINT "FragranceRefPerfumer_fragranceRefId_fkey" FOREIGN KEY ("fragranceRefId") REFERENCES "FragranceRef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceRefPerfumer" ADD CONSTRAINT "FragranceRefPerfumer_perfumerId_fkey" FOREIGN KEY ("perfumerId") REFERENCES "Perfumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_fragranceRefId_fkey" FOREIGN KEY ("fragranceRefId") REFERENCES "FragranceRef"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductNote" ADD CONSTRAINT "ProductNote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductNote" ADD CONSTRAINT "ProductNote_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAccord" ADD CONSTRAINT "ProductAccord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAccord" ADD CONSTRAINT "ProductAccord_accordId_fkey" FOREIGN KEY ("accordId") REFERENCES "Accord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPerfumer" ADD CONSTRAINT "ProductPerfumer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPerfumer" ADD CONSTRAINT "ProductPerfumer_perfumerId_fkey" FOREIGN KEY ("perfumerId") REFERENCES "Perfumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
