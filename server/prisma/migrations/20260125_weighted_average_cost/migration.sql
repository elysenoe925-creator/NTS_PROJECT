-- Weighted Average Cost Calculation for Arrivals
-- When an arrival is confirmed:
-- 1. Stock quantity is updated
-- 2. Weighted average cost is calculated: (old_cost * old_qty + new_cost * new_qty) / (old_qty + new_qty)
-- 3. Stock cost is updated with the weighted average
-- 4. Product price is automatically recalculated based on margin: price = cost * (1 + margin/100)

-- The Stock table already has cost and margin fields to support this functionality
-- ArrivalItem.costPrice contains the unit cost of arriving items
-- When arrival is confirmed, the system updates:
-- - Stock.qty (add qtyReceived)
-- - Stock.cost (weighted average)
-- - Product.cost (updated cost)
-- - Product.price (recalculated with margin)

-- No schema changes needed - this is a functional update to the arrival confirmation logic
