from datetime import date
import yfinance as yf
import pandas as pd
import numpy as np
from ta.momentum import RSIIndicator
from datetime import datetime

# Expanded ticker list
tickers = ["PLTR", "TSLA", "AMZN", "MSFT", "GOOGL", "AAPL", "META", "NVDA", "BHEL.NS", "RELIANCE.NS"]
start_date = "2022-01-01"
end_date = date.today()
results = []

for ticker in tickers:
    print(f"🔍 Processing {ticker}...")

    data = yf.download(ticker, start=start_date, end=end_date, interval="1d", progress=False)

    if data.empty or "Close" not in data.columns or data["Close"].dropna().empty:
        results.append({
            "Ticker": ticker,
            "Status": "⚠️ No valid data",
            "Comment": "Data empty or Close prices missing"
        })
        continue

    # Use your RSI fix!
    data["MA20"] = data["Close"].rolling(window=20).mean()
    data["MA50"] = data["Close"].rolling(window=50).mean()
    data["MA100"] = data["Close"].rolling(window=100).mean()

    # ✅ Proven fix for RSI
    data["RSI"] = RSIIndicator(pd.Series(data["Close"].squeeze())).rsi()
    data["Vol_Avg_20"] = data["Volume"].rolling(window=20).mean()

    # Safely extract values from last row
    last_row = data.iloc[-1]
    close = float(last_row["Close"])
    ma20 = float(last_row["MA20"])
    ma50 = float(last_row["MA50"])
    ma100 = float(last_row["MA100"])
    rsi = float(last_row["RSI"].item()) if pd.notna(last_row["RSI"].item()) else np.nan
    volume = float(last_row["Volume"])
    vol_avg = float(last_row["Vol_Avg_20"])
    date_str = data.index[-1].strftime('%Y-%m-%d')

    # Relaxed breakout logic
    breakout = "Neutral"
    if close > ma20 or close > ma50:
        breakout = "Uptrend"
    elif close < ma20 or close < ma50:
        breakout = "Downtrend"

    rsi_condition = (breakout == "Uptrend" and rsi > 50) or (breakout == "Downtrend" and rsi < 40)
    volume_condition = volume > 0.95 * vol_avg
    match = breakout != "Neutral" and rsi_condition and volume_condition

    results.append({
        "Ticker": ticker,
        "Date": date_str,
        "Close": round(close, 2),
        "MA20": round(ma20, 2),
        "MA50": round(ma50, 2),
        "Breakout": breakout,
        "RSI": round(rsi, 2) if not np.isnan(rsi) else "NaN",
        "Volume": int(volume),
        "Volume Avg (20d)": int(vol_avg),
        "Status": "✅ Match" if match else "❌ No Match",
        "Comment": "" if match else "Criteria not met"
    })

# Show the final DataFrame
pd.DataFrame(results)
