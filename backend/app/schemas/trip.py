from pydantic import BaseModel
from typing import Optional, List
from datetime import date, time, datetime
from app.schemas.master import CityResponse, ActivityResponse

class TripCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    budget_limit: Optional[float] = None
    cover_image: Optional[str] = None
    interests: Optional[str] = None       # comma-separated e.g. "Heritage,Nature"
    budget_tier: Optional[str] = None     # "budget" / "mid-range" / "luxury"

class TripUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_limit: Optional[float] = None
    cover_image: Optional[str] = None
    interests: Optional[str] = None
    budget_tier: Optional[str] = None

class TripResponse(TripCreate):
    id: int
    user_id: int
    share_id: str
    created_at: datetime
    updated_at: datetime
    is_published: bool = False
    stops: List["TripStopResponse"] = []

    class Config:
        from_attributes = True

class TripStopCreate(BaseModel):
    city_id: int
    start_date: date
    end_date: date
    display_order: Optional[int] = 0

class TripStopUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    display_order: Optional[int] = None

class TripStopResponse(TripStopCreate):
    id: int
    trip_id: int
    city: Optional[CityResponse] = None
    activities: List["TripActivityResponse"] = []
    
    class Config:
        from_attributes = True

class TripActivityCreate(BaseModel):
    activity_id: Optional[int] = None
    custom_place_name: Optional[str] = None
    activity_date: date
    start_time: Optional[time] = None
    display_order: Optional[int] = 0
    custom_cost: Optional[float] = None
    notes: Optional[str] = None

class TripActivityUpdate(BaseModel):
    activity_id: Optional[int] = None
    custom_place_name: Optional[str] = None
    activity_date: Optional[date] = None
    start_time: Optional[time] = None
    display_order: Optional[int] = None
    custom_cost: Optional[float] = None
    notes: Optional[str] = None

class TripActivityResponse(TripActivityCreate):
    id: int
    trip_stop_id: int
    activity: Optional[ActivityResponse] = None
    
    class Config:
        from_attributes = True

class ExpenseCreate(BaseModel):
    category: str
    amount: float
    description: Optional[str] = None
    expense_date: date

class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    expense_date: Optional[date] = None

class ExpenseResponse(ExpenseCreate):
    id: int
    trip_id: int
    
    class Config:
        from_attributes = True

class SavedDestinationResponse(BaseModel):
    id: int
    city_id: int
    city: Optional[CityResponse] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
