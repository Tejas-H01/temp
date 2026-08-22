from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.trip import TripResponse

class CommunityExperienceResponse(BaseModel):
    id: int
    trip_id: int
    published_by: int
    published_at: datetime
    is_published: bool
    like_count: int
    copy_count: int
    
    # Nested trip data
    trip: Optional[TripResponse] = None
    publisher_name: str = "Anonymous"
    publisher_username: str = "anonymous"
    
    # Additional flags/metadata for the frontend
    is_liked_by_me: bool = False

    class Config:
        from_attributes = True

class LikeResponse(BaseModel):
    status: str
    like_count: int
    
class PublishResponse(BaseModel):
    status: str
    is_published: bool
    experience: Optional[CommunityExperienceResponse] = None

class CopyResponse(BaseModel):
    status: str
    new_trip_id: int
