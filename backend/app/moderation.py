import re

from better_profanity import profanity

profanity.load_censor_words()

# Words/phrases someone might use to be cruel to another person. Checked on
# comments and display names only -- story posts are left unfiltered so people
# can write about their own experience however they need to.
HOSTILE_TERMS = [
    # General insults
    "idiot", "stupid", "dumb", "moron", "loser", "pathetic", "worthless",
    "useless", "garbage", "trash", "scumbag", "jerk", "creep", "weirdo",
    "psycho", "lunatic", "freak", "clown", "coward", "liar", "fake",
    "failure", "piece of trash", "piece of garbage", "piece of shit",
    "piece of crap", "human garbage", "human trash", "waste of space",
    "waste of oxygen", "embarrassment", "disgusting person",

    # Harassment
    "i hate you", "hate you so much",
    "nobody likes you", "everyone hates you", "go away", "go disappear",
    "go die", "kill yourself", "kys", "end yourself", "you should die",
    "drop dead", "the world would be better without you",
    "nobody cares about you", "nobody asked", "you're nothing",
    "you're worthless", "you're a mistake", "your life is meaningless",
    "you're pathetic", "you don't belong here", "nobody wants you here",

    # Appearance
    "ugly", "hideous", "fatass", "fat pig", "disgusting looking",
    "monster", "gross", "look at your face", "you look disgusting",

    # Intelligence
    "brain dead", "brain-dead", "retard", "retarded", "imbecile",
    "airhead", "halfwit", "dipshit", "dumbass", "knucklehead",
    "smooth brain", "smoothbrain",

    # Profanity phrases (single-word profanity is caught by better-profanity)
    "fuck you", "fuck off", "motherfucker", "asshole", "bitch",
    "son of a bitch", "bastard", "cunt", "dickhead", "jackass",
    "shithead", "prick", "slut", "whore", "hoe", "twat", "pussy",
    "cock sucker", "douche", "douchebag",

    # Bullying
    "you're a joke", "you're embarrassing", "you should be ashamed",
    "you're embarrassing yourself", "nobody will ever love you",
    "you'll never amount to anything", "you're a loser",
    "you're a failure", "you're hopeless", "you're broken",
    "you're insane", "you're crazy",

    # Threats
    "i'll kill you", "i will kill you", "i hope you die", "hope you die",
    "i hope something bad happens to you", "i'll find you",
    "watch your back", "you're dead", "i'm coming for you", "i'll hurt you",

    # Hate speech / slurs
    "nigger", "nigga", "faggot", "fag", "dyke", "tranny", "kike", "spic",
    "wetback", "chink", "gook", "raghead", "camel jockey", "coon",
    "porch monkey", "zipperhead", "towelhead",

    # Religious hate
    "dirty jew", "dirty muslim", "christ killer", "infidel",

    # Sexist insults
    "stupid woman", "stupid girl", "make me a sandwich",
    "women belong in the kitchen", "men are trash", "all men are pigs",
    "all women are whores",

    # Homophobic / transphobic
    "you're not a real man", "you're not a real woman", "that's so gay",
    "gay freak", "trans freak", "gender freak",

    # Racist phrases
    "go back to your country", "go back where you came from",
    "illegal alien", "dirty immigrant",

    # Dehumanizing
    "animal", "vermin", "subhuman", "parasite", "filth", "scum", "mutt",

    # Body shaming
    "fat whale", "skeleton", "anorexic freak", "obese pig",

    # Mental health insults
    "schizo", "mental case", "nutcase", "crazy bitch", "crazy asshole",

    # Suicide encouragement
    "end it", "go jump off a bridge", "drink bleach",
    "nobody would miss you", "just disappear",
]


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def contains_hostility(*texts: str) -> bool:
    """Checked on comments and display names -- content aimed at other people."""
    for text in texts:
        if not text:
            continue
        if profanity.contains_profanity(text):
            return True
        normalized = _normalize(text)
        if any(term in normalized for term in HOSTILE_TERMS):
            return True
    return False
