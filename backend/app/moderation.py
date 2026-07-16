from better_profanity import profanity

profanity.load_censor_words()


def contains_profanity(*texts: str) -> bool:
    return any(profanity.contains_profanity(t) for t in texts if t)
