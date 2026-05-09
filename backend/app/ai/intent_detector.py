"""Intent Detection Engine - Classifies user message intent for targeted RAG retrieval.

Uses keyword matching + pattern analysis to determine what the user is asking about,
so we can build targeted context instead of dumping everything into the LLM window.
"""

import re
from typing import Tuple, List


# Intent definitions with weighted keywords and patterns
INTENT_PATTERNS = {
    "spending": {
        "keywords": [
            "spend", "spending", "expense", "expenses", "spent", "cost",
            "bill", "bills", "payment", "buying", "bought", "purchase",
            "where", "money going", "budget", "budgeting", "overspend",
            "cut back", "reduce", "too much"
        ],
        "patterns": [
            r"how much (did i|have i|am i) spend",
            r"where (is|does) my money go",
            r"(top|biggest|highest|major) (spending|expense|category)",
            r"(can i|should i) (cut|reduce|lower)",
        ],
        "weight": 1.0,
    },
    "saving": {
        "keywords": [
            "save", "saving", "savings", "saved", "emergency fund",
            "put aside", "saving rate", "how much saved", "money left",
            "leftover", "surplus", "deficit"
        ],
        "patterns": [
            r"how much (can i|should i|did i) save",
            r"(improve|increase|boost) (my )?(saving|savings)",
            r"saving (rate|percentage|ratio)",
        ],
        "weight": 1.0,
    },
    "investment": {
        "keywords": [
            "invest", "investment", "investments", "portfolio", "mutual fund",
            "sip", "stock", "stocks", "share", "shares", "nifty", "sensex",
            "fd", "fixed deposit", "ppf", "nps", "gold", "crypto",
            "return", "returns", "nav", "risk", "diversi",
            "zerodha", "groww", "bonds"
        ],
        "patterns": [
            r"(how|what) (is|are) my (investment|portfolio|return)",
            r"should i invest",
            r"(best|good) (investment|fund|stock)",
            r"portfolio (risk|allocation|balance)",
        ],
        "weight": 1.0,
    },
    "goal": {
        "keywords": [
            "goal", "goals", "target", "plan", "planning",
            "achieve", "milestone", "progress", "deadline",
            "vacation", "car", "house", "education", "retire",
            "on track", "behind"
        ],
        "patterns": [
            r"(am i|are we) on track",
            r"(when|how) (can i|will i) (reach|achieve|afford)",
            r"(set|create|add) (a |new )?goal",
        ],
        "weight": 1.0,
    },
    "subscription": {
        "keywords": [
            "subscription", "subscriptions", "recurring", "monthly",
            "netflix", "spotify", "prime", "hotstar", "youtube premium",
            "chatgpt", "auto debit", "standing order",
            "cancel", "unsubscribe"
        ],
        "patterns": [
            r"(active|my) subscription",
            r"(cancel|stop|remove) (my )?subscription",
            r"(how much|what) (am i|do i) (paying|spend) on subscription",
        ],
        "weight": 1.2,
    },
    "health": {
        "keywords": [
            "health", "score", "financial health", "how am i doing",
            "overall", "summary", "overview", "status", "assessment",
            "analyze", "analysis", "evaluate", "report", "check"
        ],
        "patterns": [
            r"(how|what)('s| is) my (financial )?(health|score|status)",
            r"(give|show) me (a |an )?(summary|overview|report|analysis)",
            r"how am i doing",
        ],
        "weight": 1.0,
    },
    "afford": {
        "keywords": [
            "afford", "can i buy", "enough money", "purchase",
            "able to", "feasible", "worth it", "should i buy"
        ],
        "patterns": [
            r"can i (afford|buy|get|purchase)",
            r"(do i|should i) (have enough|spend on)",
            r"is it (worth|affordable|feasible)",
        ],
        "weight": 1.1,
    },
    "greeting": {
        "keywords": [
            "hello", "hi", "hey", "greetings", "good morning",
            "good afternoon", "good evening", "what's up", "sup",
            "howdy", "namaste"
        ],
        "patterns": [
            r"^(hi|hey|hello|greetings|namaste)",
        ],
        "weight": 0.5,
    },
}


def detect_intent(message: str) -> Tuple[str, float]:
    """
    Detect the primary intent of a user message.
    
    Returns:
        Tuple of (intent_name, confidence_score)
    """
    msg = message.lower().strip()
    scores = {}

    for intent, config in INTENT_PATTERNS.items():
        score = 0.0

        # Keyword matching
        for keyword in config["keywords"]:
            if keyword in msg:
                score += 1.0 * config["weight"]

        # Pattern matching (higher weight)
        for pattern in config["patterns"]:
            if re.search(pattern, msg, re.IGNORECASE):
                score += 2.5 * config["weight"]

        if score > 0:
            scores[intent] = score

    if not scores:
        return ("general", 0.3)

    best_intent = max(scores, key=scores.get)
    max_score = scores[best_intent]

    # Normalize confidence (0-1 range)
    confidence = min(max_score / 5.0, 1.0)

    return (best_intent, confidence)


def detect_all_intents(message: str) -> List[Tuple[str, float]]:
    """
    Detect all matching intents sorted by confidence.
    
    Returns:
        List of (intent_name, confidence_score) tuples, sorted by confidence descending.
    """
    msg = message.lower().strip()
    results = []

    for intent, config in INTENT_PATTERNS.items():
        score = 0.0
        for keyword in config["keywords"]:
            if keyword in msg:
                score += 1.0 * config["weight"]
        for pattern in config["patterns"]:
            if re.search(pattern, msg, re.IGNORECASE):
                score += 2.5 * config["weight"]

        if score > 0:
            confidence = min(score / 5.0, 1.0)
            results.append((intent, confidence))

    results.sort(key=lambda x: x[1], reverse=True)
    return results if results else [("general", 0.3)]


def extract_entities(message: str) -> dict:
    """Extract financial entities from a message (amounts, categories, merchants)."""
    entities = {}

    # Extract amounts (₹ or Rs or numbers with commas)
    amount_patterns = [
        r'₹\s*([0-9,]+(?:\.\d{2})?)',
        r'[Rr]s\.?\s*([0-9,]+(?:\.\d{2})?)',
        r'([0-9,]+(?:\.\d{2})?)\s*(?:rupees|rs)',
        r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|lakh|crore|cr)',
    ]
    amounts = []
    for pattern in amount_patterns:
        matches = re.findall(pattern, message)
        for m in matches:
            try:
                val = float(m.replace(",", ""))
                amounts.append(val)
            except ValueError:
                pass
    if amounts:
        entities["amounts"] = amounts

    # Extract time references
    time_patterns = {
        "this month": r"this month",
        "last month": r"last month",
        "this year": r"this year",
        "last week": r"last week",
        "today": r"today",
        "yesterday": r"yesterday",
    }
    for label, pattern in time_patterns.items():
        if re.search(pattern, message, re.IGNORECASE):
            entities["time_reference"] = label
            break

    # Extract categories mentioned
    categories = [
        "food", "transport", "shopping", "entertainment", "utilities",
        "rent", "healthcare", "education", "groceries", "subscriptions",
        "emi", "insurance", "salary", "freelance", "investment"
    ]
    mentioned = [c for c in categories if c in message.lower()]
    if mentioned:
        entities["categories"] = mentioned

    return entities
