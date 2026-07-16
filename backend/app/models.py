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
    is_premium: bool
    is_founder: bool = False


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class StoryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=5000)
    category: Category
    is_anonymous: bool = False
    media_url: Optional[str] = None
    media_type: Optional[Literal["photo", "video"]] = None
    tags: list[str] = []


class StoryOut(BaseModel):
    id: str
    title: str
    body: str
    category: str
    author_name: str
    is_anonymous: bool
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    tags: list[str]
    support_count: int
    comment_count: int
    created_at: float


class ReactionCreate(BaseModel):
    story_id: str
    reaction: str = Field(description=f"One of: {', '.join(REACTIONS)}")


class AriaMessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class AriaMessageOut(BaseModel):
    reply: str
    messages_used_today: int
    daily_limit: Optional[int]  # null when unlimited (premium)
    limit_reached: bool
