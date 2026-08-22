from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.auth.security.dependencies import get_current_user
from app.models.user import User
from app.models.trip import Trip, TripStop, TripActivity
from app.models.master import City, TouristSpot, Restaurant, BudgetEstimate

from app.services.recommendation_service import (
    recommend_places,
    recommend_restaurants,
    get_budget_reference,
    get_multi_city_budget,
    get_budget_status,
    ScoredSpot,
    ScoredRestaurant,
)
from app.schemas.recommendation import (
    RecommendedSpot,
    RecommendedRestaurant,
    BudgetReferenceResponse,
    BudgetStopInput,
    MultiBudgetResponse,
    BudgetStatusResponse,
    CityRecommendationBundle,
    CityBundleCity,
    TripRecommendationResponse,
)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_recommended_spot(s: ScoredSpot) -> RecommendedSpot:
    return RecommendedSpot(
        id=s.spot.id,
        city_id=s.spot.city_id,
        place_name=s.spot.place_name,
        category=s.spot.category,
        sub_category=s.spot.sub_category,
        must_visit=s.spot.must_visit,
        description=s.spot.description,
        duration_needed=s.spot.duration_needed,
        best_time_to_visit=s.spot.best_time_to_visit,
        ideal_for=s.spot.ideal_for,
        score=s.score,
        reason=s.reason,
    )


def _to_recommended_restaurant(r: ScoredRestaurant) -> RecommendedRestaurant:
    return RecommendedRestaurant(
        id=r.restaurant.id,
        city_id=r.restaurant.city_id,
        name=r.restaurant.name,
        category=r.restaurant.category,
        cuisine=r.restaurant.cuisine,
        must_try_dish=r.restaurant.must_try_dish,
        notes=r.restaurant.notes,
        score=r.score,
        reason=r.reason,
    )


# ---------------------------------------------------------------------------
# GET /api/recommendations/cities/{city_id}
# Consolidated recommendation bundle for a city.
# ---------------------------------------------------------------------------

@router.get("/cities/{city_id}", response_model=CityRecommendationBundle)
def get_city_recommendations(
    city_id: int,
    interests: Optional[str] = Query(None, description="Comma-separated: Heritage,Nature,Food"),
    trip_duration_days: Optional[int] = Query(None, ge=1),
    budget_tier: Optional[str] = Query(None, description="budget | mid-range | luxury"),
    exclude_place_names: Optional[str] = Query(None, description="Comma-separated place names to exclude"),
    exclude_restaurant_names: Optional[str] = Query(None, description="Comma-separated restaurant names to exclude"),
    limit: int = Query(3, ge=1, le=20),
    db: Session = Depends(get_db),
):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    exclude_places = [p for p in (exclude_place_names or "").split(",") if p.strip()]
    exclude_restaurants = [r for r in (exclude_restaurant_names or "").split(",") if r.strip()]

    places = recommend_places(
        db, city_id,
        interests_str=interests,
        trip_duration_days=trip_duration_days,
        exclude_place_names=exclude_places,
        limit=limit,
    )
    restaurants = recommend_restaurants(
        db, city_id,
        interests_str=interests,
        exclude_restaurant_names=exclude_restaurants,
        limit=limit,
    )
    budget_ref = get_budget_reference(db, city_id, budget_tier, days=trip_duration_days or 1)

    return CityRecommendationBundle(
        city=CityBundleCity(id=city.id, state=city.state, city=city.city),
        places=[_to_recommended_spot(s) for s in places],
        restaurants=[_to_recommended_restaurant(r) for r in restaurants],
        budget_estimates=BudgetReferenceResponse(**budget_ref) if budget_ref else None,
    )


# ---------------------------------------------------------------------------
# GET /api/recommendations/cities/{city_id}/places
# ---------------------------------------------------------------------------

@router.get("/cities/{city_id}/places", response_model=List[RecommendedSpot])
def get_city_place_recommendations(
    city_id: int,
    interests: Optional[str] = Query(None),
    must_visit: Optional[bool] = Query(None, description="Filter to only must-visit items"),
    trip_duration_days: Optional[int] = Query(None, ge=1),
    exclude_place_names: Optional[str] = Query(None),
    limit: int = Query(3, ge=1, le=50),
    db: Session = Depends(get_db),
):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    exclude_places = [p for p in (exclude_place_names or "").split(",") if p.strip()]

    spots = recommend_places(
        db, city_id,
        interests_str=interests,
        trip_duration_days=trip_duration_days,
        exclude_place_names=exclude_places,
        limit=limit if must_visit is None else 50,  # get more if filtering after
    )

    if must_visit is not None:
        spots = [s for s in spots if s.spot.must_visit == must_visit]

    return [_to_recommended_spot(s) for s in spots[:limit]]


# ---------------------------------------------------------------------------
# GET /api/recommendations/cities/{city_id}/restaurants
# ---------------------------------------------------------------------------

@router.get("/cities/{city_id}/restaurants", response_model=List[RecommendedRestaurant])
def get_city_restaurant_recommendations(
    city_id: int,
    interests: Optional[str] = Query(None),
    cuisine: Optional[str] = Query(None, description="Cuisine preference keyword"),
    category: Optional[str] = Query(None),
    exclude_restaurant_names: Optional[str] = Query(None),
    limit: int = Query(3, ge=1, le=50),
    db: Session = Depends(get_db),
):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    exclude_restaurants = [r for r in (exclude_restaurant_names or "").split(",") if r.strip()]
    cuisine_prefs = [c for c in [cuisine, category] if c]

    restaurants = recommend_restaurants(
        db, city_id,
        interests_str=interests,
        cuisine_prefs=cuisine_prefs,
        exclude_restaurant_names=exclude_restaurants,
        limit=limit,
    )
    return [_to_recommended_restaurant(r) for r in restaurants]


# ---------------------------------------------------------------------------
# GET /api/recommendations/budget
# Single city/tier reference budget
# ---------------------------------------------------------------------------

@router.get("/budget", response_model=BudgetReferenceResponse)
def get_budget_reference_endpoint(
    city_id: int = Query(...),
    tier: Optional[str] = Query(None, description="budget | mid-range | luxury"),
    days: int = Query(1, ge=1),
    db: Session = Depends(get_db),
):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    ref = get_budget_reference(db, city_id, tier, days)
    if not ref:
        raise HTTPException(status_code=404, detail="No budget data for this city/tier")

    return BudgetReferenceResponse(**ref)


# ---------------------------------------------------------------------------
# POST /api/recommendations/budget/multi-city
# Multi-city reference budget breakdown
# ---------------------------------------------------------------------------

@router.post("/budget/multi-city", response_model=MultiBudgetResponse)
def get_multi_city_budget_endpoint(
    stops: List[BudgetStopInput],
    remaining_budget: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    if not stops:
        raise HTTPException(status_code=400, detail="At least one stop required")

    stops_data = [{"city_id": s.city_id, "tier": s.tier, "days": s.days} for s in stops]
    result = get_multi_city_budget(db, stops_data, remaining_budget)
    return MultiBudgetResponse(**result)


# ---------------------------------------------------------------------------
# GET /api/recommendations/trips/{trip_id}
# Trip-aware recommendations (authenticated, uses trip context)
# ---------------------------------------------------------------------------

@router.get("/trips/{trip_id}", response_model=TripRecommendationResponse)
def get_trip_recommendations(
    trip_id: int,
    stop_index: int = Query(0, ge=0, description="Which stop to get recommendations for (0-based)"),
    limit: int = Query(3, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return context-aware recommendations for an existing trip.
    Uses trip.interests, trip.budget_tier, stop dates, and existing itinerary
    to produce personalized results with existing items excluded.
    """
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    stops: list[TripStop] = sorted(trip.stops, key=lambda s: s.start_date)
    if not stops:
        raise HTTPException(status_code=404, detail="Trip has no stops. Add a destination first.")

    if stop_index >= len(stops):
        stop_index = 0
    active_stop = stops[stop_index]
    city_id = active_stop.city_id

    # Duration for this stop
    stop_days = max(1, (active_stop.end_date - active_stop.start_date).days + 1)

    # Collect all already-selected place/restaurant names across the whole trip
    exclude_place_names: list[str] = []
    for stop in stops:
        for act in stop.activities:
            if act.custom_place_name:
                exclude_place_names.append(act.custom_place_name)

    # Get recommendations
    places = recommend_places(
        db, city_id,
        interests_str=trip.interests,
        trip_duration_days=stop_days,
        exclude_place_names=exclude_place_names,
        limit=limit,
    )
    restaurants = recommend_restaurants(
        db, city_id,
        interests_str=trip.interests,
        exclude_restaurant_names=[],
        limit=limit,
    )

    # Budget reference for this stop
    budget_ref = get_budget_reference(db, city_id, trip.budget_tier, days=stop_days)

    # Budget status using existing trip budget data
    # Calculate approximate current spend from activities with custom costs
    activity_spend = 0.0
    for stop in stops:
        for act in stop.activities:
            if act.custom_cost is not None:
                activity_spend += float(act.custom_cost)
    expense_spend = sum(float(e.amount) for e in trip.expenses)
    total_spend = activity_spend + expense_spend

    bstatus = get_budget_status(trip.budget_limit, total_spend)

    return TripRecommendationResponse(
        trip_id=trip_id,
        recommended_places=[_to_recommended_spot(s) for s in places],
        recommended_restaurants=[_to_recommended_restaurant(r) for r in restaurants],
        budget_reference=BudgetReferenceResponse(**budget_ref) if budget_ref else None,
        budget_status=BudgetStatusResponse(**bstatus),
    )
