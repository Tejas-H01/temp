from pydantic import BaseModel
from typing import Optional


# ---------------------------------------------------------------------------
# City
# ---------------------------------------------------------------------------

class CityResponse(BaseModel):
    id: int
    state: str
    city: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Tourist Spot
# ---------------------------------------------------------------------------

class TouristSpotResponse(BaseModel):
    id: int
    city_id: int
    place_name: str
    category: str
    sub_category: str
    must_visit: bool
    description: str
    duration_needed: str
    best_time_to_visit: str
    ideal_for: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Restaurant
# ---------------------------------------------------------------------------

class RestaurantResponse(BaseModel):
    id: str
    city_id: int
    name: str
    category: str
    cuisine: str
    must_try_dish: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Budget Estimate
# ---------------------------------------------------------------------------

class BudgetEstimateResponse(BaseModel):
    id: int
    city_id: int
    tier: str
    accommodation_per_day: float
    food_per_day: float
    local_transport_per_day: float
    activities_per_day: float
    total_per_day: float
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Legacy Activity schema (kept for backward compatibility)
# ---------------------------------------------------------------------------

class ActivityBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    cost: float
    duration_minutes: int
    image_url: Optional[str] = None


class ActivityResponse(ActivityBase):
    id: int
    city_id: int

    class Config:
        from_attributes = True
