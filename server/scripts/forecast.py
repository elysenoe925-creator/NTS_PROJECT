import sys
import json
import numpy as np
from sklearn.linear_model import LinearRegression

def read_input():
    try:
        # Read all stdin
        input_data = sys.stdin.read()
        if not input_data:
            return None
        return json.loads(input_data)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

def train_and_predict(sales_history, horizon):
    # sales_history: list of { date, qty } or just list of numbers
    # We expect a list of numbers for simplicity in this MVP, 
    # but let's handle the object format if needed.
    
    # If it's a list of objects, extract qty. 
    # Ensuring chronologically sorted by caller is best, but let's just assume list of values for now
    # or handle the dict.
    
    # Let's assume input is a simple list of daily sales counts (chronological) for a single SKU 
    # OR a dictionary of SKU -> list of sales.
    # To keep it efficient, let's process one SKU at a time or a batch.
    
    # Simple logic: Linear Regression on the trend + Seasonality adjustment if possible.
    # For MVP: Weighted Moving Average + Linear Trend.
    
    if len(sales_history) < 5:
        # Not enough data, return mean
        return max(0, np.mean(sales_history) * horizon if sales_history else 0)

    # Prepare X (days) and y (sales)
    y = np.array(sales_history)
    X = np.arange(len(y)).reshape(-1, 1)
    
    # Linear Regression for Trend
    model = LinearRegression()
    model.fit(X, y)
    
    # Forecast
    next_days = np.arange(len(y), len(y) + horizon).reshape(-1, 1)
    predictions = model.predict(next_days)
    
    # Sum of predictions
    total_predicted = np.sum(predictions)
    
    # Safety: non-negative
    return max(0, total_predicted)

def main():
    data = read_input()
    if not data:
        return

    # Expected input format:
    # {
    #   "details": [
    #      { "sku": "ABC", "history": [0, 2, 1, 5, ...] },
    #      ...
    #   ],
    #   "horizon": 30
    # }
    
    results = {}
    horizon = data.get("horizon", 30)
    items = data.get("details", [])
    
    for item in items:
        sku = item.get("sku")
        history = item.get("history", [])
        
        # Clean history: ensure it's numbers
        clean_history = [float(x) if x is not None else 0 for x in history]
        
        prediction = train_and_predict(clean_history, horizon)
        
        # Calculate a simple confidence score based on variance/R2 (simulated here)
        # If variance is high, confidence is lower.
        variance = np.var(clean_history) if len(clean_history) > 0 else 0
        mean = np.mean(clean_history) if len(clean_history) > 0 else 1
        variance = np.var(clean_history) if len(clean_history) > 0 else 0
        mean = np.mean(clean_history) if len(clean_history) > 0 else 1
        
        # Avoid division by zero and handle potential NaN
        if mean == 0 or np.isnan(mean):
            cv = 0 if variance == 0 else 1 # If mean is 0 but variance > 0, high volatility
        else:
            cv = variance / mean
            
        # Ensure CV is not NaN
        if np.isnan(cv):
            cv = 1.0
            
        confidence = max(0.1, min(0.95, 1.0 - (cv * 0.5)))
        
        # Final safety check for NaN
        if np.isnan(confidence):
            confidence = 0.5
        
        results[sku] = {
            "prediction": round(prediction, 2),
            "confidence": round(confidence, 2)
        }
        
    print(json.dumps(results))

if __name__ == "__main__":
    main()
