from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field

Category = Literal[
    "Mental Health", "Relationships", "Family", "School",
    "Growth", "Life Challenges", "Achievements", "Advice",
]

REACTIONS = [
    "I'm here for you",
    "You helped me",
    "I understand",
    "Stay strong",
    "Thank you for sharing",
]


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=40)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthIn(BaseModel):
    credential: str = Field(min_length=1)


class UserOut(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    username: Optional[str] = None
    is_premium: bool
    is_founder: bool = False


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileUpdate(BaseModel):
    # All optional -- only the provided fields are changed.
    display_name: Optional[str] = Field(default=None, min_length=1, max_length=40)
    username: Optional[str] = Field(default=None, min_length=3, max_length=30)
    bio: Optional[str] = Field(default=None, max_length=300)
    pronouns: Optional[str] = Field(default=None, max_length=40)
    links: Optional[list[str]] = None
    schools: Optional[list[str]] = None


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
    follower_count: int
    following_count: int
    story_count: int
    is_following: bool = False  # whether the current viewer follows this user
    is_self: bool = False
    created_at: Optional[float] = None


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
    created_at: float


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


class AriaMessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class AriaMessageOut(BaseModel):
    reply: str
    messages_used_today: int
    daily_limit: Optional[int]  # null when unlimited (premium)
    limit_reached: bool
