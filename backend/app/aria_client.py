"""
Aria's reply logic. If USE_OPENAI=true and a real key is set, this calls the
OpenAI API. Otherwise it falls back to a small set of reflective, template
responses so the whole app runs and demos correctly with zero external keys.

Swap to production: set USE_OPENAI=true and OPENAI_API_KEY in .env. No other
code needs to change -- routers only ever call `get_aria_reply()`.
"""
import random

from app.config import settings

SYSTEM_PROMPT = (
    "You are Aria, a calm, warm, reflective companion inside the Inspire app. "
    "You help people think through their thoughts and feelings. You are not a "
    "therapist and must never claim to be one. If someone describes a crisis, "
    "self-harm, or wanting to hurt themselves or others, gently and clearly "
    "encourage them to contact a crisis line or emergency services, and do not "
    "try to handle the crisis yourself. Keep responses brief, warm, and grounded."
)

FALLBACK_RESPONSES = [
    "That sounds like it's been sitting with you for a while. What part of it feels heaviest right now?",
    "Thank you for putting that into words. What do you think you needed to hear in that moment?",
    "It makes sense that would affect you. Has anything helped, even a little, when you've felt this before?",
    "I hear you. Sometimes just naming it out loud changes how it feels. What would it look like to be a little kinder to yourself about this?",
    "That's a lot to carry. What's one small thing that would make today a bit more manageable?",
]


async def get_aria_reply(message: str) -> str:
    if settings.use_openai and settings.openai_api_key:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            max_tokens=250,
        )
        return completion.choices[0].message.content

    # Demo-mode fallback -- no external API call, no key required.
    return random.choice(FALLBACK_RESPONSES)
