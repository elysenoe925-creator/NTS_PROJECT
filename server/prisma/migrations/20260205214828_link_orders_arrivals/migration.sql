-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Arrival" (
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
    "orderId" INTEGER,
    CONSTRAINT "Arrival_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Arrival_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Arrival" ("arrivalDate", "createdAt", "id", "notes", "receivedBy", "referenceNumber", "status", "store", "supplier", "updatedAt") SELECT "arrivalDate", "createdAt", "id", "notes", "receivedBy", "referenceNumber", "status", "store", "supplier", "updatedAt" FROM "Arrival";
DROP TABLE "Arrival";
ALTER TABLE "new_Arrival" RENAME TO "Arrival";
CREATE UNIQUE INDEX "Arrival_referenceNumber_key" ON "Arrival"("referenceNumber");
CREATE UNIQUE INDEX "Arrival_orderId_key" ON "Arrival"("orderId");
CREATE TABLE "new_Stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "store" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL,
    "margin" REAL,
    "reorderRequested" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Stock" ("cost", "id", "margin", "productId", "qty", "store") SELECT "cost", "id", "margin", "productId", "qty", "store" FROM "Stock";
DROP TABLE "Stock";
ALTER TABLE "new_Stock" RENAME TO "Stock";
CREATE UNIQUE INDEX "Stock_productId_store_key" ON "Stock"("productId", "store");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
