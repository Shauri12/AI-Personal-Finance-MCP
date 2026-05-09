"""LLM Integration - OpenAI and Gemini API integration with smart fallback.

Provides a unified interface for LLM calls with:
- OpenAI GPT-4o/GPT-4o-mini support
- Google Gemini support
- Streaming response support
- Intelligent rule-based fallback when no API keys are configured
"""

import json
import asyncio
from typing import AsyncGenerator, Optional, List, Dict
from app.core.config import settings
from app.ai.intent_detector import detect_intent


# ── LLM Client Initialization ────────────────────────────────────

_openai_client = None
_gemini_model = None
_llm_provider = None  # "openai", "gemini", or "fallback"


def _init_llm():
    """Initialize the LLM client based on available API keys."""
    global _openai_client, _gemini_model, _llm_provider

    if _llm_provider is not None:
        return

    # Try OpenAI first
    if settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            _openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            _llm_provider = "openai"
            print(f"✅ LLM: OpenAI ({settings.LLM_MODEL})")
            return
        except Exception as e:
            print(f"⚠️ OpenAI init failed: {e}")

    # Try Gemini
    if settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            _gemini_model = genai.GenerativeModel("gemini-1.5-flash")
            _llm_provider = "gemini"
            print("✅ LLM: Google Gemini (gemini-1.5-flash)")
            return
        except Exception as e:
            print(f"⚠️ Gemini init failed: {e}")

    # Fallback
    _llm_provider = "fallback"
    print("ℹ️ LLM: Using intelligent rule-based fallback (no API keys configured)")


def get_provider() -> str:
    """Get the current LLM provider name."""
    _init_llm()
    return _llm_provider


# ── Main LLM Call ─────────────────────────────────────────────────

async def generate_response(
    system_prompt: str,
    user_message: str,
    chat_history: Optional[List[Dict]] = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """
    Generate a response from the LLM.

    Args:
        system_prompt: System context / instructions.
        user_message: The user's query.
        chat_history: Optional list of {"role": str, "content": str} dicts.
        temperature: Sampling temperature (0-1).
        max_tokens: Maximum response tokens.

    Returns:
        The LLM's response text.
    """
    _init_llm()

    if _llm_provider == "openai":
        return await _openai_generate(system_prompt, user_message, chat_history, temperature, max_tokens)
    elif _llm_provider == "gemini":
        return await _gemini_generate(system_prompt, user_message, chat_history, temperature, max_tokens)
    else:
        return _fallback_generate(system_prompt, user_message, chat_history)


async def generate_response_stream(
    system_prompt: str,
    user_message: str,
    chat_history: Optional[List[Dict]] = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> AsyncGenerator[str, None]:
    """
    Generate a streaming response from the LLM.

    Yields chunks of the response as they arrive.
    """
    _init_llm()

    if _llm_provider == "openai":
        async for chunk in _openai_stream(system_prompt, user_message, chat_history, temperature, max_tokens):
            yield chunk
    elif _llm_provider == "gemini":
        async for chunk in _gemini_stream(system_prompt, user_message, chat_history, temperature, max_tokens):
            yield chunk
    else:
        # Simulate streaming for fallback
        response = _fallback_generate(system_prompt, user_message, chat_history)
        words = response.split(" ")
        for i in range(0, len(words), 3):
            chunk = " ".join(words[i:i + 3])
            if i > 0:
                chunk = " " + chunk
            yield chunk
            await asyncio.sleep(0.05)


# ── OpenAI Implementation ────────────────────────────────────────

async def _openai_generate(
    system_prompt: str,
    user_message: str,
    chat_history: Optional[List[Dict]],
    temperature: float,
    max_tokens: int,
) -> str:
    """Generate response using OpenAI API."""
    messages = [{"role": "system", "content": system_prompt}]

    if chat_history:
        for msg in chat_history[-10:]:  # Last 10 messages for context
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": user_message})

    response = await _openai_client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    return response.choices[0].message.content


async def _openai_stream(
    system_prompt: str,
    user_message: str,
    chat_history: Optional[List[Dict]],
    temperature: float,
    max_tokens: int,
) -> AsyncGenerator[str, None]:
    """Stream response using OpenAI API."""
    messages = [{"role": "system", "content": system_prompt}]

    if chat_history:
        for msg in chat_history[-10:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": user_message})

    stream = await _openai_client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
    )

    async for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


# ── Gemini Implementation ────────────────────────────────────────

async def _gemini_generate(
    system_prompt: str,
    user_message: str,
    chat_history: Optional[List[Dict]],
    temperature: float,
    max_tokens: int,
) -> str:
    """Generate response using Google Gemini API."""
    prompt = f"{system_prompt}\n\n"

    if chat_history:
        for msg in chat_history[-10:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            prompt += f"{role}: {msg['content']}\n\n"

    prompt += f"User: {user_message}\n\nAssistant:"

    response = await asyncio.to_thread(
        _gemini_model.generate_content,
        prompt,
        generation_config={
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
    )

    return response.text


async def _gemini_stream(
    system_prompt: str,
    user_message: str,
    chat_history: Optional[List[Dict]],
    temperature: float,
    max_tokens: int,
) -> AsyncGenerator[str, None]:
    """Stream response using Google Gemini API."""
    prompt = f"{system_prompt}\n\n"

    if chat_history:
        for msg in chat_history[-10:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            prompt += f"{role}: {msg['content']}\n\n"

    prompt += f"User: {user_message}\n\nAssistant:"

    response = await asyncio.to_thread(
        _gemini_model.generate_content,
        prompt,
        generation_config={
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        },
        stream=True,
    )

    for chunk in response:
        if chunk.text:
            yield chunk.text
            await asyncio.sleep(0)  # Yield control


# ── Intelligent Fallback ─────────────────────────────────────────

def _fallback_generate(
    system_prompt: str,
    user_message: str,
    chat_history: Optional[List[Dict]],
) -> str:
    """Generate an intelligent response without an LLM API.

    Parses the financial context from system_prompt and generates
    data-driven responses based on the detected intent.
    """
    intent, _ = detect_intent(user_message)
    context = system_prompt

    # Extract key financial data from the context
    data = _parse_context_data(context)

    if intent == "greeting":
        return _greeting_response(data)
    elif intent == "spending":
        return _spending_response(data, user_message)
    elif intent == "saving":
        return _savings_response(data)
    elif intent == "investment":
        return _investment_response(data)
    elif intent == "goal":
        return _goals_response(data)
    elif intent == "subscription":
        return _subscription_response(data)
    elif intent == "health":
        return _health_response(data)
    elif intent == "afford":
        return _affordability_response(data, user_message)
    else:
        return _general_response(data)


def _parse_context_data(context: str) -> Dict:
    """Extract structured data from the context string."""
    data = {
        "income": 0, "expenses": 0, "savings": 0, "savings_rate": 0,
        "spending_section": "", "investment_section": "",
        "goals_section": "", "subscription_section": "",
        "trends_section": "", "transactions_section": "",
    }

    import re

    # Extract income/expenses
    m = re.search(r"Monthly Income: ₹([\d,]+)", context)
    if m:
        data["income"] = float(m.group(1).replace(",", ""))
    m = re.search(r"Expenses: ₹([\d,]+)", context)
    if m:
        data["expenses"] = float(m.group(1).replace(",", ""))
    data["savings"] = data["income"] - data["expenses"]
    data["savings_rate"] = (data["savings"] / data["income"] * 100) if data["income"] > 0 else 0

    # Extract sections
    sections = {
        "spending_section": "SPENDING BREAKDOWN",
        "investment_section": "INVESTMENT PORTFOLIO",
        "goals_section": "FINANCIAL GOALS",
        "subscription_section": "RECURRING SUBSCRIPTIONS",
        "trends_section": "MONTHLY TRENDS",
        "transactions_section": "RECENT TRANSACTIONS",
    }

    for key, marker in sections.items():
        if marker in context:
            start = context.index(marker)
            # Find next section marker or end
            next_markers = [m for m in ["📊", "📋", "💼", "🎯", "🔄", "📈", "═══"] if context.find(m, start + len(marker)) > 0]
            if next_markers:
                end_positions = [context.find(m, start + len(marker)) for m in next_markers if context.find(m, start + len(marker)) > 0]
                end = min(end_positions) if end_positions else len(context)
            else:
                end = len(context)
            data[key] = context[start:end].strip()

    return data


def _greeting_response(data: Dict) -> str:
    """Generate a greeting response."""
    sr = data["savings_rate"]
    emoji = "🎉" if sr > 25 else "👍" if sr > 10 else "⚠️"

    return f"""👋 Hello! Welcome to **FinanceOS AI** — your personal financial assistant.

Here's a quick snapshot of your finances:

💰 **Monthly Income:** ₹{data['income']:,.0f}
💸 **Monthly Expenses:** ₹{data['expenses']:,.0f}
📊 **Net Savings:** ₹{data['savings']:,.0f} ({data['savings_rate']:.1f}%) {emoji}

I can help you with:
• 📊 **Spending analysis** — "Where am I spending the most?"
• 💰 **Savings advice** — "How can I save more?"
• 💼 **Investment tracking** — "How's my portfolio doing?"
• 🎯 **Goal planning** — "Am I on track for my goals?"
• 🔄 **Subscription management** — "What are my active subscriptions?"

What would you like to explore? 🚀"""


def _spending_response(data: Dict, query: str) -> str:
    """Generate a spending analysis response."""
    section = data["spending_section"]
    sr = data["savings_rate"]

    response = f"""📊 **Spending Analysis**

Here's your spending breakdown for this month:

{section if section else 'No spending data available yet.'}

**Summary:**
• Total Expenses: ₹{data['expenses']:,.0f}
• Savings Rate: {sr:.1f}%
• {"✅ Great savings rate! Keep it up." if sr > 25 else "⚠️ Consider reducing discretionary spending." if sr > 10 else "🚨 Spending exceeds healthy limits. Review non-essentials."}

**💡 Recommendations:**
• Review your top spending category for potential savings
• Set budget limits for discretionary categories
• Consider the 50/30/20 rule: 50% needs, 30% wants, 20% savings"""

    if sr < 20:
        response += f"\n• Aim to save at least ₹{data['income'] * 0.2:,.0f}/month (20% of income)"

    return response


def _savings_response(data: Dict) -> str:
    """Generate a savings analysis response."""
    sr = data["savings_rate"]
    monthly_savings = data["savings"]

    return f"""💰 **Savings Overview**

**Current Month:**
• Income: ₹{data['income']:,.0f}
• Expenses: ₹{data['expenses']:,.0f}
• Net Savings: ₹{monthly_savings:,.0f}
• Savings Rate: {sr:.1f}%

**Assessment:**
{"🎉 Excellent! You're saving over 25% — well above the recommended 20%." if sr > 25 else "👍 Good savings rate. Try to push above 25% for faster wealth building." if sr > 20 else "⚠️ Your savings rate is below the ideal 20%. Here's how to improve:" if sr > 0 else "🚨 You're currently spending more than you earn. Immediate action needed."}

**💡 Savings Strategies:**
1. **Automate savings** — Set up auto-transfer of ₹{max(data['income'] * 0.2, monthly_savings):,.0f} on salary day
2. **Emergency fund** — Maintain 6 months of expenses (₹{data['expenses'] * 6:,.0f})
3. **Cut subscriptions** — Review recurring charges for unused services
4. **Track daily** — Monitor small expenses that add up
5. **50/30/20 rule** — Needs (₹{data['income'] * 0.5:,.0f}), Wants (₹{data['income'] * 0.3:,.0f}), Savings (₹{data['income'] * 0.2:,.0f})"""


def _investment_response(data: Dict) -> str:
    """Generate an investment analysis response."""
    section = data["investment_section"]

    return f"""💼 **Investment Portfolio Analysis**

{section if section else 'No investment data available. Start investing today!'}

**💡 Investment Tips:**
• Diversify across asset classes (equity, debt, gold)
• Maintain SIP discipline — don't stop during market dips
• Review portfolio quarterly for rebalancing
• Keep 60-70% in equity if you're under 35
• Tax-save with ELSS, PPF, and NPS (Section 80C)"""


def _goals_response(data: Dict) -> str:
    """Generate a goals analysis response."""
    section = data["goals_section"]

    return f"""🎯 **Financial Goals Tracker**

{section if section else 'No goals set yet. Setting goals is the first step to financial success!'}

**💡 Goal Achievement Tips:**
• Break large goals into monthly milestones
• Automate monthly contributions toward each goal
• Prioritize high-priority and time-sensitive goals
• Consider goal-specific mutual funds (e.g., liquid funds for short-term)
• Review and adjust goals quarterly"""


def _subscription_response(data: Dict) -> str:
    """Generate a subscription analysis response."""
    section = data["subscription_section"]

    return f"""🔄 **Subscription Management**

{section if section else 'No recurring subscriptions detected yet.'}

**💡 Subscription Optimization Tips:**
• Audit all subscriptions monthly — cancel what you don't use
• Share family plans where possible (Netflix, Spotify, YouTube)
• Look for annual plans that offer discounts over monthly billing
• Set calendar reminders before free trials end
• Consider bundled services to save money"""


def _health_response(data: Dict) -> str:
    """Generate a financial health assessment."""
    sr = data["savings_rate"]

    # Calculate a simple health score
    score = 0
    if sr > 20:
        score += 25
    elif sr > 10:
        score += 15
    else:
        score += 5

    score += 25  # Base score for having data
    if data["investment_section"]:
        score += 25
    if data["goals_section"]:
        score += 15
    score = min(score, 100)

    level = "🟢 Excellent" if score >= 80 else "🟡 Good" if score >= 60 else "🟠 Needs Improvement" if score >= 40 else "🔴 Critical"

    return f"""🏥 **Financial Health Assessment**

**Overall Score: {score}/100** {level}

**Breakdown:**
• 💰 Savings Rate: {sr:.1f}% {"✅" if sr > 20 else "⚠️"}
• 💸 Monthly Expenses: ₹{data['expenses']:,.0f}
• 📊 Income-Expense Ratio: {(data['income'] / max(data['expenses'], 1)):.1f}x
• 💼 Investments: {"Active ✅" if data['investment_section'] else "Not tracked ⚠️"}
• 🎯 Goals: {"Set ✅" if data['goals_section'] else "Not set ⚠️"}

**Key Recommendations:**
1. {"Maintain your excellent savings rate" if sr > 25 else "Increase savings rate to 20%+"}
2. Build emergency fund (6 months of expenses)
3. {"Continue SIP investments" if data['investment_section'] else "Start investing — even ₹500/month SIP helps"}
4. {"Review goal progress monthly" if data['goals_section'] else "Set 3-5 financial goals"}
5. Review and optimize recurring expenses"""


def _affordability_response(data: Dict, query: str) -> str:
    """Generate an affordability assessment."""
    return f"""💳 **Affordability Check**

**Your Current Financial Position:**
• Monthly Savings: ₹{data['savings']:,.0f}
• Savings Rate: {data['savings_rate']:.1f}%

**Guidelines:**
• ✅ Any purchase under ₹{data['savings'] * 0.3:,.0f} is comfortable (30% of monthly savings)
• ⚠️ Purchases ₹{data['savings'] * 0.3:,.0f} - ₹{data['savings']:,.0f} need planning
• 🚫 Anything over ₹{data['savings']:,.0f} requires saving up

**💡 Smart Purchase Tips:**
• Always maintain 3-6 months emergency fund first
• Use the 48-hour rule: wait 2 days before non-essential purchases
• For large purchases, save for 3-6 months to avoid debt
• Check if EMI options are 0% interest before taking loans"""


def _general_response(data: Dict) -> str:
    """Generate a general overview response."""
    sr = data["savings_rate"]

    return f"""📊 **Financial Overview**

**Monthly Summary:**
• 💰 Income: ₹{data['income']:,.0f}
• 💸 Expenses: ₹{data['expenses']:,.0f}
• 📈 Savings: ₹{data['savings']:,.0f} ({sr:.1f}%)

I'm your AI-powered financial assistant. I can help you with:

• 📊 **"How much am I spending?"** — Detailed spending breakdown
• 💰 **"How can I save more?"** — Personalized savings strategies
• 💼 **"How's my portfolio?"** — Investment analysis
• 🎯 **"Am I on track?"** — Goal progress tracking
• 🔄 **"Show my subscriptions"** — Recurring expense audit
• 🏥 **"Financial health check"** — Complete assessment
• 💳 **"Can I afford...?"** — Purchase feasibility analysis

What would you like to know? 🚀"""
