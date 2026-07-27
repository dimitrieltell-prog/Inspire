from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field

Category = Literal[
    "Mental Health", "Relationships", "Family", "School",
    "Growth", "Life Challenges", "Achievements", "Advice",
]

REACTIONS = [
    "That's awesome!",
    "Love this!",
    "So proud of you",
    "I'm here for you",
    "You helped me",
    "I understand",
    "Stay strong",
    "Thank you for sharing",
]


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=35)
    username: Optional[str] = Field(default=None, min_length=3, max_length=30)
    date_of_birth: str = Field(description="YYYY-MM-DD")
    accepted_terms: bool


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthIn(BaseModel):
    credential: str = Field(min_length=1)


class GoogleSignupFinish(BaseModel):
    credential: str = Field(min_length=1)
    date_of_birth: str = Field(description="YYYY-MM-DD")
    accepted_terms: bool


BUSINESS_CATEGORIES = ["Creator", "Brand", "Local business", "Community", "Media", "Nonprofit"]
COMMENT_AUDIENCES = ["everyone", "followers", "no_one"]


class UserOut(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    username: Optional[str] = None
    is_premium: bool
    is_founder: bool = False
    is_private: bool = False
    is_business: bool = False
    business_category: Optional[str] = None
    contact_email: Optional[str] = None
    contact_website: Optional[str] = None
    comment_audience: str = "everyone"
    hide_support_counts: bool = False
    muted_words: list[str] = []


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileUpdate(BaseModel):
    # All optional -- only the provided fields are changed.
    display_name: Optional[str] = Field(default=None, min_length=1, max_length=35)
    username: Optional[str] = Field(default=None, min_length=3, max_length=30)
    bio: Optional[str] = Field(default=None, max_length=300)
    pronouns: Optional[str] = Field(default=None, max_length=40)
    links: Optional[list[str]] = None
    schools: Optional[list[str]] = None
    is_private: Optional[bool] = None
    is_business: Optional[bool] = None
    business_category: Optional[str] = Field(default=None, max_length=40)
    contact_email: Optional[str] = Field(default=None, max_length=120)
    contact_website: Optional[str] = Field(default=None, max_length=200)
    comment_audience: Optional[str] = None
    hide_support_counts: Optional[bool] = None
    muted_words: Optional[list[str]] = None


class ProfileUser(BaseModel):
    """A user summary used in follower/following lists."""
    id: str
    display_name: str
    username: Optional[str] = None
    is_premium: bool
    is_founder: bool


class PublicProfile(BaseModel):
    id: str
    display_name: str
    username: Optional[str] = None
    bio: str = ""
    pronouns: str = ""
    links: list[str] = []
    schools: list[str] = []
    is_premium: bool
    is_founder: bool
    is_private: bool = False
    is_business: bool = False
    business_category: Optional[str] = None
    contact_email: Optional[str] = None
    contact_website: Optional[str] = None
    follower_count: int
    following_count: int
    story_count: int
    is_following: bool = False  # whether the current viewer follows this user
    is_self: bool = False
    is_blocked: bool = False    # whether the current viewer has blocked this user
    is_muted: bool = False      # whether the current viewer has muted this user
    has_requested: bool = False # viewer has a pending follow request to this private account
    can_view: bool = True       # false when the account is private and viewer isn't a follower
    created_at: Optional[float] = None


class Insights(BaseModel):
    """Business-account analytics."""
    followers: int
    stories: int
    supports_received: int
    replies_received: int
    reposts_received: int
    saves_received: int


class ActivityItem(BaseModel):
    """Something the current user did -- support given or reply left."""
    type: str  # "support" | "reply"
    detail: str  # the reaction label or the comment text
    story_id: str
    story_title: str
    created_at: float


class StoryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=5000)
    category: Category
    is_anonymous: bool = False
    media_url: Optional[str] = Field(default=None, max_length=2000)
    media_type: Optional[Literal["photo", "video"]] = None
    tags: list[str] = []


class StoryOut(BaseModel):
    id: str
    title: str
    body: str
    category: str
    author_name: str
    author_id: Optional[str] = None  # only set for non-anonymous stories
    is_anonymous: bool
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    tags: list[str]
    support_count: int
    comment_count: int
    repost_count: int = 0
    is_saved: bool = False       # whether the current viewer saved it
    is_reposted: bool = False    # whether the current viewer reposted it
    counts_hidden: bool = False  # author hides support counts from others
    author_is_business: bool = False
    author_business_category: Optional[str] = None
    created_at: float


class SearchResults(BaseModel):
    """Combined results for the global search bar."""
    users: list[ProfileUser] = []
    stories: list[StoryOut] = []


class ReactionCreate(BaseModel):
    story_id: str
    reaction: str = Field(description=f"One of: {', '.join(REACTIONS)}")


class CommentCreate(BaseModel):
    story_id: str
    body: str = Field(min_length=1, max_length=1000)


class CommentOut(BaseModel):
    id: str
    story_id: str
    author_name: str
    author_id: Optional[str] = None
    body: str
    created_at: float


STORY_DURATIONS_FREE = [24]
STORY_DURATIONS_PREMIUM = [24, 48, 72, 168]  # up to 7 days


class EphemeralStoryCreate(BaseModel):
    """An Instagram-style Story: ephemeral, tied to the author's avatar,
    never saveable."""
    body: Optional[str] = Field(default=None, max_length=1000)  # free cap enforced at 500 in the router; Premium gets the full 1000
    media_url: Optional[str] = Field(default=None, max_length=2000)
    media_type: Optional[Literal["photo", "video"]] = None
    audience: Literal["everyone", "close_circle"] = "everyone"
    duration_hours: Optional[int] = None  # defaults to 24; premium can pick longer


class EphemeralStoryOut(BaseModel):
    id: str
    author_id: str
    author_name: str
    body: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    audience: str = "everyone"
    like_count: int = 0
    is_liked: bool = False
    reply_count: int = 0
    expires_at: float
    created_at: float


class StoryReplyCreate(BaseModel):
    ephemeral_story_id: str
    body: str = Field(min_length=1, max_length=1000)


class StoryReplyOut(BaseModel):
    id: str
    ephemeral_story_id: str
    author_id: str
    author_name: str
    body: str
    created_at: float


class StorySendCreate(BaseModel):
    recipient_id: str


class StoryInboxItem(BaseModel):
    story: EphemeralStoryOut
    sender_id: str
    sender_name: str
    sent_at: float


class AriaMessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class AriaMessageOut(BaseModel):
    reply: str
    messages_used_today: int
    daily_limit: Optional[int]  # null when unlimited (premium)
    limit_reached: bool


REPORT_REASONS = [
    "Spam",
    "Harassment or bullying",
    "Hate speech",
    "Self-harm or suicide content",
    "Illegal content",
    "Nudity or sexual content",
    "Something else",
]


class ReportCreate(BaseModel):
    target_type: Literal["story", "comment", "user"]
    target_id: str
    reason: str = Field(min_length=1, max_length=60)
    note: Optional[str] = Field(default=None, max_length=500)


class ReportOut(BaseModel):
    id: str
    target_type: str
    target_id: str
    reason: str
    note: Optional[str] = None
    reporter_id: str
    reporter_name: str
    context: str = ""
    status: str = "open"
    created_at: float
