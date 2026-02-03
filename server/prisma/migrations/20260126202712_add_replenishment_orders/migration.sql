/*
  Warnings:

  - You are about to drop the column `pamp` on the `Product` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ReplenishmentOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "store" TEXT NOT NULL,
    "requestedQty" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReplenishmentOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReplenishmentOrder_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "compatibleModels" TEXT,
    "cost" REAL,
    "margin" REAL,
    "price" REAL,
    "location" TEXT,
    "category" TEXT,
    "supplier" TEXT,
    "alertThreshold" INTEGER NOT NULL DEFAULT 5
);
INSERT INTO "new_Product" ("alertThreshold", "category", "compatibleModels", "cost", "id", "location", "margin", "model", "name", "price", "sku", "supplier") SELECT "alertThreshold", "category", "compatibleModels", "cost", "id", "location", "margin", "model", "name", "price", "sku", "supplier" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
