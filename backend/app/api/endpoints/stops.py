from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.auth.security.dependencies import get_current_user
from app.models.user import User
from app.models.trip import Trip, TripStop, TripActivity, Expense
from app.models.master import Activity
from app.schemas.trip import TripActivityCreate, TripActivityUpdate, TripActivityResponse

router = APIRouter(prefix="/stops", tags=["Stops"])

@router.post("/{stop_id}/activities", response_model=TripActivityResponse, status_code=status.HTTP_201_CREATED)
def add_activity(stop_id: int, act_in: TripActivityCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stop = db.query(TripStop).filter(TripStop.id == stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
        
    # verify ownership
    trip = db.query(Trip).filter(Trip.id == stop.trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if act_in.activity_id:
        activity = db.query(Activity).filter(Activity.id == act_in.activity_id).first()
        if not activity:
            raise HTTPException(status_code=400, detail="Activity not found")
    elif not act_in.custom_place_name:
        raise HTTPException(status_code=400, detail="Either activity_id or custom_place_name must be provided")
        
    if act_in.activity_date < stop.start_date or act_in.activity_date > stop.end_date:
        raise HTTPException(status_code=400, detail="Activity date must be within stop dates")
        
    trip_act = TripActivity(**act_in.model_dump(), trip_stop_id=stop_id)
    db.add(trip_act)
    db.commit()
    db.refresh(trip_act)
    return trip_act

@router.delete("/{stop_id}/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(stop_id: int, activity_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stop = db.query(TripStop).filter(TripStop.id == stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
        
    trip = db.query(Trip).filter(Trip.id == stop.trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    trip_act = db.query(TripActivity).filter(TripActivity.id == activity_id, TripActivity.trip_stop_id == stop_id).first()
    if not trip_act:
        raise HTTPException(status_code=404, detail="Trip activity not found")
        
    db.delete(trip_act)
    db.commit()
    return None

@router.put("/{stop_id}/activities/{activity_id}", response_model=TripActivityResponse)
def update_activity(stop_id: int, activity_id: int, act_in: TripActivityUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stop = db.query(TripStop).filter(TripStop.id == stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
        
    trip = db.query(Trip).filter(Trip.id == stop.trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    trip_act = db.query(TripActivity).filter(TripActivity.id == activity_id, TripActivity.trip_stop_id == stop_id).first()
    if not trip_act:
        raise HTTPException(status_code=404, detail="Trip activity not found")
        
    update_data = act_in.model_dump(exclude_unset=True)
    if "activity_id" in update_data and update_data["activity_id"] is not None:
        activity = db.query(Activity).filter(Activity.id == update_data["activity_id"]).first()
        if not activity:
            raise HTTPException(status_code=400, detail="Activity not found")

    for key, value in update_data.items():
        setattr(trip_act, key, value)
        
    if trip_act.activity_date < stop.start_date or trip_act.activity_date > stop.end_date:
        raise HTTPException(status_code=400, detail="Activity date must be within stop dates")
        
    db.commit()
    db.refresh(trip_act)
    return trip_act
