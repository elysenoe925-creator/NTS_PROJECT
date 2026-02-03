-- Migration: Margin as Percentage of Cost Price
-- Date: 2026-01-25
-- Description: Update margin to be stored as a percentage of the cost price
-- Formula: price = cost * (1 + margin/100)

-- Previous schema: margin was an absolute value added to cost
-- New schema: margin is a percentage value relative to cost

-- Example conversions:
-- Old: cost=0.02, margin=0.03, price=0.05
-- New: cost=0.02, margin=150 (150%), price=0.05 (calculated as 0.02 * 1.5)

-- No ALTER TABLE needed as margin column remains REAL
-- The business logic is updated in the application code
