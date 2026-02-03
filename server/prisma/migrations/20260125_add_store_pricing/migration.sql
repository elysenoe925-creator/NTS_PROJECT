-- AlterTable - Add store-specific pricing
-- Migration: Add cost and margin to Stock table for store-specific pricing
-- Date: 2026-01-25

ALTER TABLE "Stock" ADD COLUMN "cost" REAL;
ALTER TABLE "Stock" ADD COLUMN "margin" REAL;
