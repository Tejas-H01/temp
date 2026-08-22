from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.master import City, TouristSpot, Restaurant, BudgetEstimate, Activity
from app.schemas.master import (
    CityResponse,
    TouristSpotResponse,
    RestaurantResponse,
    BudgetEstimateResponse,
    ActivityResponse,
)

router = APIRouter(tags=["Master Data"])


# ---------------------------------------------------------------------------
# Cities
# ---------------------------------------------------------------------------

@router.get("/cities", response_model=List[CityResponse])
def get_cities(
    q: Optional[str] = Query(None, description="Search by city or state name"),
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(City)
    if q:
        query = query.filter(
            City.city.ilike(f"%{q}%") | City.state.ilike(f"%{q}%")
        )
    if state:
        query = query.filter(City.state.ilike(f"%{state}%"))
    return query.order_by(City.state, City.city).all()


@router.get("/cities/{city_id}", response_model=CityResponse)
def get_city(city_id: int, db: Session = Depends(get_db)):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    return city


from app.auth.schemas.schemas import SeasonalConditionsResponse
from app.services.seasonal_service import get_seasonal_conditions

@router.get("/cities/{city_id}/seasonal-check", response_model=SeasonalConditionsResponse)
def get_city_seasonal_check(
    city_id: int,
    month: int = Query(..., description="Month integer (1-12)"),
    db: Session = Depends(get_db)
):
    # 1. Validate that the city actually exists in the database
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
        
    # 2. Validate month parameter
    if month < 1 or month > 12:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Month must be between 1 and 12")
        
    # 3. Retrieve seasonal conditions (with graceful fallback inside service)
    try:
        conditions = get_seasonal_conditions(city_id, month)
        return conditions
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ---------------------------------------------------------------------------
# Tourist Spots
# ---------------------------------------------------------------------------

@router.get("/tourist-spots", response_model=List[TouristSpotResponse])
def get_tourist_spots(
    city_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    sub_category: Optional[str] = Query(None),
    must_visit: Optional[bool] = Query(None),
    ideal_for: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Search by place name or description"),
    db: Session = Depends(get_db),
):
    query = db.query(TouristSpot)
    if city_id is not None:
        query = query.filter(TouristSpot.city_id == city_id)
    if category:
        query = query.filter(TouristSpot.category.ilike(f"%{category}%"))
    if sub_category:
        query = query.filter(TouristSpot.sub_category.ilike(f"%{sub_category}%"))
    if must_visit is not None:
        query = query.filter(TouristSpot.must_visit == must_visit)
    if ideal_for:
        query = query.filter(TouristSpot.ideal_for.ilike(f"%{ideal_for}%"))
    if q:
        query = query.filter(
            TouristSpot.place_name.ilike(f"%{q}%")
            | TouristSpot.description.ilike(f"%{q}%")
        )
    return query.order_by(TouristSpot.city_id, TouristSpot.place_name).all()


@router.get("/tourist-spots/{spot_id}", response_model=TouristSpotResponse)
def get_tourist_spot(spot_id: int, db: Session = Depends(get_db)):
    spot = db.query(TouristSpot).filter(TouristSpot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Tourist spot not found")
    return spot


# ---------------------------------------------------------------------------
# Restaurants
# ---------------------------------------------------------------------------

@router.get("/restaurants", response_model=List[RestaurantResponse])
def get_restaurants(
    city_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    cuisine: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Search by name or must_try_dish"),
    db: Session = Depends(get_db),
):
    query = db.query(Restaurant)
    if city_id is not None:
        query = query.filter(Restaurant.city_id == city_id)
    if category:
        query = query.filter(Restaurant.category.ilike(f"%{category}%"))
    if cuisine:
        query = query.filter(Restaurant.cuisine.ilike(f"%{cuisine}%"))
    if q:
        query = query.filter(
            Restaurant.name.ilike(f"%{q}%")
            | Restaurant.must_try_dish.ilike(f"%{q}%")
        )
    return query.order_by(Restaurant.city_id, Restaurant.name).all()


@router.get("/restaurants/{restaurant_id}", response_model=RestaurantResponse)
def get_restaurant(restaurant_id: str, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant


# ---------------------------------------------------------------------------
# Budget Estimates
# ---------------------------------------------------------------------------

@router.get("/budget-estimates", response_model=List[BudgetEstimateResponse])
def get_budget_estimates(
    city_id: Optional[int] = Query(None),
    tier: Optional[str] = Query(None, description="budget | mid-range | luxury"),
    db: Session = Depends(get_db),
):
    query = db.query(BudgetEstimate)
    if city_id is not None:
        query = query.filter(BudgetEstimate.city_id == city_id)
    if tier:
        query = query.filter(BudgetEstimate.tier.ilike(f"%{tier}%"))
    return query.order_by(BudgetEstimate.city_id, BudgetEstimate.tier).all()


@router.get("/budget-estimates/{estimate_id}", response_model=BudgetEstimateResponse)
def get_budget_estimate(estimate_id: int, db: Session = Depends(get_db)):
    estimate = db.query(BudgetEstimate).filter(BudgetEstimate.id == estimate_id).first()
    if not estimate:
        raise HTTPException(status_code=404, detail="Budget estimate not found")
    return estimate


# ---------------------------------------------------------------------------
# Legacy Activities endpoint (kept for TripActivity compatibility)
# ---------------------------------------------------------------------------

@router.get("/activities", response_model=List[ActivityResponse])
def get_activities(
    city_id: Optional[int] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Activity)
    if city_id:
        query = query.filter(Activity.city_id == city_id)
    if type:
        query = query.filter(Activity.type == type)
    return query.all()
