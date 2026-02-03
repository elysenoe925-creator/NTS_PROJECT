-- CreateTable
CREATE TABLE "Arrival" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "referenceNumber" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "arrivalDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "store" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Arrival_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArrivalItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "arrivalId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "qtyReceived" INTEGER NOT NULL,
    "costPrice" REAL NOT NULL,
    "notes" TEXT,
    CONSTRAINT "ArrivalItem_arrivalId_fkey" FOREIGN KEY ("arrivalId") REFERENCES "Arrival" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ArrivalItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
INSERT INTO "new_Product" ("category", "compatibleModels", "cost", "id", "location", "margin", "model", "name", "price", "sku", "supplier") SELECT "category", "compatibleModels", "cost", "id", "location", "margin", "model", "name", "price", "sku", "supplier" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "Arrival_referenceNumber_key" ON "Arrival"("referenceNumber");
