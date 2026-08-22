from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import date, datetime
from app.db.database import get_db
from app.auth.security.dependencies import get_current_user
from app.models.user import User
from app.models.trip import Trip, TripStop, TripActivity, Expense, SavedDestination, CommunityExperience
from app.models.master import City, Activity
from app.schemas.trip import (
    TripCreate, TripUpdate, TripResponse,
    TripStopCreate, TripStopUpdate, TripStopResponse,
    TripActivityCreate, TripActivityUpdate, TripActivityResponse,
    ExpenseCreate, ExpenseResponse
)
from app.auth.schemas.responses import APIResponse

router = APIRouter(prefix="/trips", tags=["Trips"])

# -----------------
# Trip CRUD
# -----------------

@router.get("", response_model=List[TripResponse])
def get_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trips = db.query(Trip).filter(Trip.user_id == current_user.id).all()
    return trips

@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(trip_in: TripCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if trip_in.end_date < trip_in.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    trip = Trip(**trip_in.model_dump(), user_id=current_user.id)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip

@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip

@router.put("/{trip_id}", response_model=TripResponse)
def update_trip(trip_id: int, trip_in: TripUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    update_data = trip_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(trip, key, value)
        
    if trip.end_date < trip.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
        
    db.commit()
    db.refresh(trip)
    return trip

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    db.delete(trip)
    db.commit()
    return None

# -----------------
# Publish to Community
# -----------------

from app.schemas.community import PublishResponse

@router.post("/{trip_id}/publish", response_model=PublishResponse)
def publish_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    exp = db.query(CommunityExperience).filter(CommunityExperience.trip_id == trip_id).first()
    if exp:
        exp.is_published = True
        db.commit()
        db.refresh(exp)
    else:
        exp = CommunityExperience(trip_id=trip_id, published_by=current_user.id, is_published=True)
        db.add(exp)
        db.commit()
        db.refresh(exp)
        
    return {"status": "success", "is_published": True, "experience": exp}

@router.post("/{trip_id}/unpublish", response_model=PublishResponse)
def unpublish_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    exp = db.query(CommunityExperience).filter(CommunityExperience.trip_id == trip_id).first()
    if exp:
        exp.is_published = False
        db.commit()
        db.refresh(exp)
        
    return {"status": "success", "is_published": False, "experience": exp}

# -----------------
# Stops
# -----------------

@router.post("/{trip_id}/stops", response_model=TripStopResponse, status_code=status.HTTP_201_CREATED)
def create_trip_stop(trip_id: int, stop_in: TripStopCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    city = db.query(City).filter(City.id == stop_in.city_id).first()
    if not city:
        raise HTTPException(status_code=400, detail="City not found")
        
    def to_date(d):
        if isinstance(d, datetime): return d.date()
        if isinstance(d, date): return d
        if isinstance(d, str): return date.fromisoformat(d.split('T')[0])
        return d

    t_start = to_date(trip.start_date)
    t_end = to_date(trip.end_date)
    s_start = to_date(stop_in.start_date)
    s_end = to_date(stop_in.end_date)

    if s_end < s_start:
        raise HTTPException(status_code=400, detail="Stop end date cannot be before stop start date.")
    if s_start < t_start:
        raise HTTPException(status_code=400, detail="Stop start date cannot be before trip start date.")
    if s_end > t_end:
        raise HTTPException(status_code=400, detail="Stop end date cannot be after trip end date.")

    stop = TripStop(**stop_in.model_dump(), trip_id=trip_id)
    db.add(stop)
    db.commit()
    db.refresh(stop)
    return stop

@router.delete("/{trip_id}/stops/{stop_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip_stop(trip_id: int, stop_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    stop = db.query(TripStop).filter(TripStop.id == stop_id, TripStop.trip_id == trip_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
        
    db.delete(stop)
    db.commit()
    return None

@router.put("/{trip_id}/stops/{stop_id}", response_model=TripStopResponse)
def update_trip_stop(trip_id: int, stop_id: int, stop_in: TripStopUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    stop = db.query(TripStop).filter(TripStop.id == stop_id, TripStop.trip_id == trip_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
        
    update_data = stop_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(stop, key, value)
        
    def to_date(d):
        if isinstance(d, datetime): return d.date()
        if isinstance(d, date): return d
        if isinstance(d, str): return date.fromisoformat(d.split('T')[0])
        return d

    t_start = to_date(trip.start_date)
    t_end = to_date(trip.end_date)
    s_start = to_date(stop.start_date)
    s_end = to_date(stop.end_date)

    if s_end < s_start:
        raise HTTPException(status_code=400, detail="Stop end date cannot be before stop start date.")
    if s_start < t_start:
        raise HTTPException(status_code=400, detail="Stop start date cannot be before trip start date.")
    if s_end > t_end:
        raise HTTPException(status_code=400, detail="Stop end date cannot be after trip end date.")
        
    db.commit()
    db.refresh(stop)
    return stop

# -----------------
# Budget & Itinerary Summary
# -----------------
@router.get("/{trip_id}/budget")
def get_trip_budget(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    activity_total = 0.0
    for stop in trip.stops:
        for ta in stop.activities:
            if ta.custom_cost is not None:
                activity_total += ta.custom_cost
            else:
                activity = db.query(Activity).filter(Activity.id == ta.activity_id).first()
                if activity:
                    activity_total += activity.cost
                    
    transport_total = sum(e.amount for e in trip.expenses if e.category == "TRANSPORT")
    accommodation_total = sum(e.amount for e in trip.expenses if e.category == "ACCOMMODATION")
    meal_total = sum(e.amount for e in trip.expenses if e.category == "MEAL")
    other_total = sum(e.amount for e in trip.expenses if e.category == "OTHER")
    
    grand_total = activity_total + transport_total + accommodation_total + meal_total + other_total
    
    trip_duration_days = (trip.end_date - trip.start_date).days + 1
    average_per_day = grand_total / trip_duration_days if trip_duration_days > 0 else 0
    
    is_over_budget = False
    if trip.budget_limit is not None and grand_total > trip.budget_limit:
        is_over_budget = True
        
    serialized_expenses = [ExpenseResponse.model_validate(e).model_dump() for e in trip.expenses]
        
    return {
        "activity_total": activity_total,
        "transport_total": transport_total,
        "accommodation_total": accommodation_total,
        "meal_total": meal_total,
        "other_total": other_total,
        "grand_total": grand_total,
        "average_per_day": average_per_day,
        "budget_limit": trip.budget_limit,
        "is_over_budget": is_over_budget,
        "expenses": serialized_expenses
    }
