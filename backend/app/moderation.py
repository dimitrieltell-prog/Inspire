import re

from better_profanity import profanity

profanity.load_censor_words()

# Hostility directed at another person -- catches phrases that are abusive or
# demeaning even when they contain no profanity, which better-profanity misses
# (e.g. "I hate you"). Not exhaustive, but covers the common direct-attack patterns.
HOSTILE_PHRASES = [
    "i hate you",
    "hate you so much",
    "you're worthless",
    "you are worthless",
    "you're pathetic",
    "you are pathetic",
    "you're stupid",
    "you are stupid",
    "you're an idiot",
    "you are an idiot",
    "you're disgusting",
    "you are disgusting",
    "you're trash",
    "you are trash",
    "you're garbage",
    "you are garbage",
    "you're a loser",
    "you are a loser",
    "nobody likes you",
    "no one likes you",
    "everyone hates you",
    "kill yourself",
    "kys",
    "go die",
    "you should die",
    "i hope you die",
    "shut up",
]


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def contains_profanity(*texts: str) -> bool:
    for text in texts:
        if not text:
            continue
        if profanity.contains_profanity(text):
            return True
        normalized = _normalize(text)
        if any(phrase in normalized for phrase in HOSTILE_PHRASES):
            return True
    return False
