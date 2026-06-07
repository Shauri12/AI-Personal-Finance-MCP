"""
Investment opportunities service using real public APIs for accurate live data.

Sources:
  1. yfinance (Python library) - Live US stock quotes from Yahoo Finance
  2. yfinance (Python library) - Live Indian NSE/BSE stock quotes
  3. CoinGecko (free public API) - Live crypto prices
  4. AMFI India (free public API) - Live mutual fund NAVs
  5. metals.live (free public API) - Live Gold & Silver prices
  6. Fixed Deposits (indicative rates, updated manually)
  7. PPF / Government schemes (indicative rates)
"""

import httpx
import asyncio
from typing import List, Dict, Any
from datetime import datetime, timedelta

# In-memory cache with 15-minute TTL (shorter = more accurate)
_CACHE: Dict = {"data": [], "expires_at": datetime.min}

# ─── US Stocks — Yahoo Finance via yfinance ──────────────────────────────────

US_SYMBOLS = ["NVDA", "AAPL", "TSLA", "MSFT", "AMZN"]

US_NAME_MAP = {
    "NVDA": "NVIDIA Corp",
    "AAPL": "Apple Inc",
    "TSLA": "Tesla",
    "MSFT": "Microsoft",
    "AMZN": "Amazon",
}


def _fetch_yfinance_batch_sync(symbols: List[str], name_map: Dict[str, str], asset_type: str, currency_symbol: str) -> List[Dict[str, Any]]:
    """Synchronous yfinance fetch — run in thread pool to avoid blocking the async loop."""
    import yfinance as yf
    results = []
    try:
        data = yf.download(
            tickers=" ".join(symbols),
            period="2d",
            interval="1d",
            group_by="ticker",
            auto_adjust=True,
            progress=False,
        )

        for symbol in symbols:
            try:
                if len(symbols) == 1:
                    closes = data["Close"]
                else:
                    closes = data[symbol]["Close"]

                closes = closes.dropna()
                if len(closes) < 1:
                    continue

                price   = float(closes.iloc[-1])
                prev    = float(closes.iloc[-2]) if len(closes) >= 2 else price
                chg_pct = round(((price - prev) / prev) * 100, 2) if prev else 0.0

                # Strip exchange suffix for display (e.g. "RELIANCE.NS" → "RELIANCE")
                display_symbol = symbol.split(".")[0]
                link_symbol    = symbol  # keep full symbol for Yahoo Finance URL

                results.append({
                    "name":           f"{name_map.get(symbol, display_symbol)} ({display_symbol})",
                    "type":           asset_type,
                    "price":          f"{currency_symbol}{price:,.2f}",
                    "change_pct":     chg_pct,
                    "link":           f"https://finance.yahoo.com/quote/{link_symbol}",
                    "source_website": "Yahoo Finance",
                })
            except Exception as sym_err:
                print(f"[yfinance] Error for {symbol}: {sym_err}")

    except Exception as e:
        print(f"[yfinance] Batch download error: {e}")

    return results


async def fetch_yahoo_stocks() -> List[Dict[str, Any]]:
    """Fetch live US stock prices via yfinance."""
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None, _fetch_yfinance_batch_sync, US_SYMBOLS, US_NAME_MAP, "stocks", "$"
        )
        if results:
            return results
    except Exception as e:
        print(f"[Yahoo Finance US] yfinance error: {e}")

    print("[Yahoo Finance US] All methods failed.")
    return [
        {"name": "NVIDIA Corp (NVDA)", "type": "stocks", "price": "Unavailable", "change_pct": 0.0, "link": "https://finance.yahoo.com/quote/NVDA", "source_website": "Yahoo Finance"},
        {"name": "Apple Inc (AAPL)",   "type": "stocks", "price": "Unavailable", "change_pct": 0.0, "link": "https://finance.yahoo.com/quote/AAPL", "source_website": "Yahoo Finance"},
        {"name": "Tesla (TSLA)",        "type": "stocks", "price": "Unavailable", "change_pct": 0.0, "link": "https://finance.yahoo.com/quote/TSLA", "source_website": "Yahoo Finance"},
        {"name": "Microsoft (MSFT)",   "type": "stocks", "price": "Unavailable", "change_pct": 0.0, "link": "https://finance.yahoo.com/quote/MSFT", "source_website": "Yahoo Finance"},
        {"name": "Amazon (AMZN)",       "type": "stocks", "price": "Unavailable", "change_pct": 0.0, "link": "https://finance.yahoo.com/quote/AMZN", "source_website": "Yahoo Finance"},
    ]


# ─── Indian NSE Stocks — yfinance with .NS suffix ────────────────────────────

NSE_SYMBOLS = [
    "RELIANCE.NS", "TCS.NS", "INFY.NS",
    "HDFCBANK.NS", "ICICIBANK.NS", "WIPRO.NS",
]

NSE_NAME_MAP = {
    "RELIANCE.NS":  "Reliance Industries",
    "TCS.NS":       "Tata Consultancy Services",
    "INFY.NS":      "Infosys",
    "HDFCBANK.NS":  "HDFC Bank",
    "ICICIBANK.NS": "ICICI Bank",
    "WIPRO.NS":     "Wipro",
}


async def fetch_indian_stocks() -> List[Dict[str, Any]]:
    """Fetch live Indian NSE stock prices via yfinance (.NS symbols)."""
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None, _fetch_yfinance_batch_sync, NSE_SYMBOLS, NSE_NAME_MAP, "stocks", "₹"
        )
        # Tag as NSE for clarity
        for r in results:
            r["source_website"] = "NSE India"
        if results:
            return results
    except Exception as e:
        print(f"[NSE Stocks] yfinance error: {e}")

    print("[NSE Stocks] All methods failed.")
    return [
        {"name": "Reliance Industries (RELIANCE)", "type": "stocks", "price": "Unavailable", "change_pct": 0.0, "link": "https://finance.yahoo.com/quote/RELIANCE.NS", "source_website": "NSE India"},
        {"name": "TCS (TCS)",                      "type": "stocks", "price": "Unavailable", "change_pct": 0.0, "link": "https://finance.yahoo.com/quote/TCS.NS",      "source_website": "NSE India"},
        {"name": "Infosys (INFY)",                  "type": "stocks", "price": "Unavailable", "change_pct": 0.0, "link": "https://finance.yahoo.com/quote/INFY.NS",     "source_website": "NSE India"},
    ]


# ─── CoinGecko Free API ──────────────────────────────────────────────────────

CRYPTO_IDS = ["bitcoin", "ethereum", "solana", "binancecoin", "ripple"]

async def fetch_coingecko_crypto() -> List[Dict[str, Any]]:
    """Fetch live crypto prices from CoinGecko's public API."""
    results = []
    try:
        ids_str = ",".join(CRYPTO_IDS)
        url = (
            f"https://api.coingecko.com/api/v3/coins/markets"
            f"?vs_currency=usd&ids={ids_str}"
            f"&order=market_cap_desc&per_page=5&page=1"
            f"&price_change_percentage=24h"
        )
        headers = {"accept": "application/json"}
        async with httpx.AsyncClient(headers=headers, timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                coins = resp.json()
                for c in coins:
                    name    = c.get("name", "")
                    symbol  = c.get("symbol", "").upper()
                    price   = c.get("current_price", 0)
                    chg     = c.get("price_change_percentage_24h", 0) or 0
                    coin_id = c.get("id", "")
                    results.append({
                        "name":           f"{name} ({symbol})",
                        "type":           "crypto",
                        "price":          f"${price:,.2f}",
                        "change_pct":     round(chg, 2),
                        "link":           f"https://www.coingecko.com/en/coins/{coin_id}",
                        "source_website": "CoinGecko",
                    })
    except Exception as e:
        print(f"[CoinGecko API] Error: {e}")

    if not results:
        print("[CoinGecko API] Using indicative fallback data")
        results = [
            {"name": "Bitcoin (BTC)",  "type": "crypto", "price": "See CoinGecko", "change_pct": 0.0, "link": "https://www.coingecko.com/en/coins/bitcoin",  "source_website": "CoinGecko"},
            {"name": "Ethereum (ETH)", "type": "crypto", "price": "See CoinGecko", "change_pct": 0.0, "link": "https://www.coingecko.com/en/coins/ethereum", "source_website": "CoinGecko"},
        ]
    return results


# ─── AMFI India (Free Public API) ───────────────────────────────────────────

AMFI_FUND_NAMES = {
    "Quant Small Cap Fund - Direct Plan - Growth": {
        "scheme_code": "120828",
        "link": "https://groww.in/mutual-funds/quant-small-cap-fund-direct-plan-growth",
    },
    "Parag Parikh Flexi Cap Fund - Direct Plan - Growth": {
        "scheme_code": "122639",
        "link": "https://groww.in/mutual-funds/parag-parikh-long-term-value-fund-direct-growth",
    },
    "Mirae Asset Large Cap Fund - Direct Plan": {
        "scheme_code": "118989",
        "link": "https://groww.in/mutual-funds/mirae-asset-large-cap-fund-direct-plan-growth",
    },
    "Axis Bluechip Fund - Direct Plan - Growth": {
        "scheme_code": "120465",
        "link": "https://groww.in/mutual-funds/axis-bluechip-fund-direct-plan-growth",
    },
}

async def fetch_amfi_mutual_funds() -> List[Dict[str, Any]]:
    """Fetch live NAVs from AMFI India's public data endpoint."""
    results = []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for fund_name, meta in AMFI_FUND_NAMES.items():
                code = meta["scheme_code"]
                url  = f"https://api.mfapi.in/mf/{code}/latest"
                resp = await client.get(url)
                if resp.status_code == 200:
                    data     = resp.json()
                    nav_data = data.get("data", [{}])
                    nav      = float(nav_data[0].get("nav", 0)) if nav_data else 0

                    all_nav = data.get("data", [])
                    change_pct = 0.0
                    if len(all_nav) >= 2:
                        prev = float(all_nav[1].get("nav", nav))
                        if prev > 0:
                            change_pct = round(((nav - prev) / prev) * 100, 2)

                    short_name = fund_name.replace(" - Direct Plan - Growth", "").replace(" - Direct Plan", "")
                    results.append({
                        "name":           short_name,
                        "type":           "mutual_fund",
                        "price":          f"₹{nav:.2f}",
                        "change_pct":     change_pct,
                        "link":           meta["link"],
                        "source_website": "AMFI India",
                    })
    except Exception as e:
        print(f"[AMFI API] Error: {e}")

    if not results:
        results = [
            {"name": "Quant Small Cap Fund",       "type": "mutual_fund", "price": "See Groww", "change_pct": 0.0, "link": "https://groww.in/mutual-funds", "source_website": "AMFI India"},
            {"name": "Parag Parikh Flexi Cap Fund", "type": "mutual_fund", "price": "See Groww", "change_pct": 0.0, "link": "https://groww.in/mutual-funds", "source_website": "AMFI India"},
        ]
    return results


# ─── Gold & Silver — metals.live free API ────────────────────────────────────

async def fetch_gold_silver() -> List[Dict[str, Any]]:
    """Fetch live Gold and Silver prices from metals.live free public API."""
    results = []
    try:
        url = "https://metals.live/api/v1/spot"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                # metals.live returns a list: [{"metal": "gold", "price": 3300.0, ...}]
                for item in data:
                    metal = item.get("metal", "").lower()
                    price = item.get("price", 0)
                    if metal == "gold":
                        # Convert USD/troy oz to INR/10g approx (1 troy oz = 31.1g; multiply by USD/INR ~84)
                        inr_10g = round(price * 84 / 31.1035 * 10, 2)
                        results.append({
                            "name":           "Gold (24K)",
                            "type":           "gold",
                            "price":          f"${price:,.2f}/oz | ₹{inr_10g:,.0f}/10g",
                            "change_pct":     round(item.get("change_pct", item.get("changePercent", 0)), 2),
                            "link":           "https://www.mcxindia.com/market-data/spot-market-price",
                            "source_website": "metals.live",
                        })
                    elif metal == "silver":
                        inr_1kg = round(price * 84 / 31.1035 * 1000, 0)
                        results.append({
                            "name":           "Silver",
                            "type":           "gold",
                            "price":          f"${price:,.2f}/oz | ₹{inr_1kg:,.0f}/kg",
                            "change_pct":     round(item.get("change_pct", item.get("changePercent", 0)), 2),
                            "link":           "https://www.mcxindia.com/market-data/spot-market-price",
                            "source_website": "metals.live",
                        })
    except Exception as e:
        print(f"[metals.live] Error: {e}")

    if not results:
        print("[metals.live] Using indicative fallback for gold/silver")
        results = [
            {
                "name": "Gold (24K)",
                "type": "gold",
                "price": "See MCX",
                "change_pct": 0.0,
                "link": "https://www.mcxindia.com/market-data/spot-market-price",
                "source_website": "metals.live",
            },
            {
                "name": "Silver",
                "type": "gold",
                "price": "See MCX",
                "change_pct": 0.0,
                "link": "https://www.mcxindia.com/market-data/spot-market-price",
                "source_website": "metals.live",
            },
        ]
    return results


# ─── Fixed Deposits (Indicative Rates) ──────────────────────────────────────

async def fetch_fixed_deposits() -> List[Dict[str, Any]]:
    """Return indicative FD rates from major Indian banks."""
    return [
        {
            "name":           "SBI Fixed Deposit (1-2 Year)",
            "type":           "fixed_deposit",
            "price":          "Min: ₹1,000",
            "change_pct":     6.80,
            "link":           "https://sbi.co.in/web/interest-rates/deposit-rates/retail-domestic-term-deposits",
            "source_website": "SBI",
        },
        {
            "name":           "HDFC Bank FD (1 Year)",
            "type":           "fixed_deposit",
            "price":          "Min: ₹5,000",
            "change_pct":     7.10,
            "link":           "https://www.hdfcbank.com/personal/save/deposits/fixed-deposit",
            "source_website": "HDFC Bank",
        },
        {
            "name":           "ICICI Bank FD (15 months)",
            "type":           "fixed_deposit",
            "price":          "Min: ₹10,000",
            "change_pct":     7.25,
            "link":           "https://www.icicibank.com/personal-banking/deposits/fixed-deposit",
            "source_website": "ICICI Bank",
        },
        {
            "name":           "Axis Bank FD (1 Year)",
            "type":           "fixed_deposit",
            "price":          "Min: ₹5,000",
            "change_pct":     7.00,
            "link":           "https://www.axisbank.com/retail/deposits/fixed-deposit",
            "source_website": "Axis Bank",
        },
    ]


# ─── PPF & Government Schemes ────────────────────────────────────────────────

async def fetch_government_schemes() -> List[Dict[str, Any]]:
    """Return indicative rates for popular Indian government-backed investment schemes."""
    return [
        {
            "name":           "Public Provident Fund (PPF)",
            "type":           "ppf",
            "price":          "Min: ₹500 / Max: ₹1.5L p.a.",
            "change_pct":     7.10,
            "link":           "https://www.indiapost.gov.in/Financial/Pages/Content/PPF.aspx",
            "source_website": "India Post",
        },
        {
            "name":           "National Savings Certificate (NSC)",
            "type":           "bonds",
            "price":          "Min: ₹1,000 | 5 Year Lock-in",
            "change_pct":     7.70,
            "link":           "https://www.indiapost.gov.in/Financial/Pages/Content/NSC.aspx",
            "source_website": "India Post",
        },
        {
            "name":           "Sukanya Samriddhi Yojana (SSY)",
            "type":           "ppf",
            "price":          "Min: ₹250 / Max: ₹1.5L p.a.",
            "change_pct":     8.20,
            "link":           "https://www.indiapost.gov.in/Financial/Pages/Content/Sukanya-Samridhi-Accounts.aspx",
            "source_website": "India Post",
        },
        {
            "name":           "National Pension System (NPS) — Tier I",
            "type":           "nps",
            "price":          "Min: ₹500",
            "change_pct":     9.00,   # indicative historical CAGR
            "link":           "https://www.npstrust.org.in/",
            "source_website": "NPS Trust",
        },
        {
            "name":           "Sovereign Gold Bond (SGB) 2.5% + Gold Returns",
            "type":           "gold",
            "price":          "Issued at Gold price",
            "change_pct":     2.50,   # guaranteed annual interest rate
            "link":           "https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx",
            "source_website": "RBI",
        },
    ]


# ─── Aggregator ─────────────────────────────────────────────────────────────

async def get_all_opportunities() -> List[Dict[str, Any]]:
    """Aggregate live investment opportunities from all sources concurrently."""
    global _CACHE

    # Return cached data if still fresh (15-min TTL)
    if datetime.now() < _CACHE["expires_at"] and _CACHE["data"]:
        return _CACHE["data"]

    # Fetch all sources concurrently
    all_results = await asyncio.gather(
        fetch_yahoo_stocks(),
        fetch_indian_stocks(),
        fetch_coingecko_crypto(),
        fetch_amfi_mutual_funds(),
        fetch_gold_silver(),
        fetch_fixed_deposits(),
        fetch_government_schemes(),
        return_exceptions=True,
    )

    opportunities = []
    for result in all_results:
        if isinstance(result, list):
            opportunities.extend(result)

    # Update cache
    _CACHE["data"] = opportunities
    _CACHE["expires_at"] = datetime.now() + timedelta(minutes=15)

    print(f"[Scraper] Fetched {len(opportunities)} live opportunities from {len(all_results)} sources")
    return opportunities
