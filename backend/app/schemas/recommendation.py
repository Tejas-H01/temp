from pydantic import BaseModel
from typing import Optional, List


# ---------------------------------------------------------------------------
# Tourist Spot recommendation
# ---------------------------------------------------------------------------

class RecommendedSpot(BaseModel):
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
    score: int
    reason: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Restaurant recommendation
# ---------------------------------------------------------------------------

class RecommendedRestaurant(BaseModel):
    id: str
    city_id: int
    name: str
    category: str
    cuisine: str
    must_try_dish: str
    notes: Optional[str] = None
    score: int
    reason: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Budget reference
# ---------------------------------------------------------------------------

class BudgetReferenceResponse(BaseModel):
    city_id: int
    tier: str
    days: int
    accommodation_per_day: float
    food_per_day: float
    local_transport_per_day: float
    activities_per_day: float
    total_per_day: float
    reference_total: float
    notes: Optional[str] = None


class BudgetStopInput(BaseModel):
    city_id: int
    tier: Optional[str] = None   # defaults to mid-range in service
    days: int = 1


class MultiBudgetStopResult(BaseModel):
    city_id: int
    city_name: str
    tier: str
    days: int
    total_per_day: Optional[float] = None
    reference_total: Optional[float] = None
    note: Optional[str] = None


class MultiBudgetResponse(BaseModel):
    breakdown: List[MultiBudgetStopResult]
    grand_total: float
    nudge: Optional[dict] = None


# ---------------------------------------------------------------------------
# Budget status
# ---------------------------------------------------------------------------

class BudgetStatusResponse(BaseModel):
    budget_limit: Optional[float]
    current_spend: float
    remaining: Optional[float]
    utilization_pct: Optional[float]
    status: str   # comfortable | moderate | near_limit | over_budget | no_limit
    is_over_budget: bool


# ---------------------------------------------------------------------------
# City bundle (consolidated recommendation response)
# ---------------------------------------------------------------------------

class CityBundleCity(BaseModel):
    id: int
    state: str
    city: str

    class Config:
        from_attributes = True


class CityRecommendationBundle(BaseModel):
    city: CityBundleCity
    places: List[RecommendedSpot]
    restaurants: List[RecommendedRestaurant]
    budget_estimates: Optional[BudgetReferenceResponse] = None


# ---------------------------------------------------------------------------
# Trip-aware recommendation response
# ---------------------------------------------------------------------------

class TripRecommendationResponse(BaseModel):
    trip_id: int
    recommended_places: List[RecommendedSpot]
    recommended_restaurants: List[RecommendedRestaurant]
    budget_reference: Optional[BudgetReferenceResponse] = None
    budget_status: Optional[BudgetStatusResponse] = None
