from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any
import datetime
from app.db.database import get_db
from app.auth.security.dependencies import get_current_user
from app.models.user import User
from app.models.trip import Trip
from app.models.master import City

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

def get_utc_now() -> datetime.date:
    return datetime.datetime.now(datetime.timezone.utc).date()

@router.get("")
def get_dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = get_utc_now()
    trips = db.query(Trip).filter(Trip.user_id == current_user.id).all()

    upcoming = [t for t in trips if t.start_date > today]
    ongoing = [t for t in trips if t.start_date <= today <= t.end_date]
    completed = [t for t in trips if t.end_date < today]

    # Recommended cities: random sample from DB (no popularity field in new schema)
    recommended = db.query(City).order_by(func.random()).limit(6).all()

    return {
        "summary": {
            "upcoming_count": len(upcoming),
            "ongoing_count": len(ongoing),
            "completed_count": len(completed)
        },
        "ongoing_trips": ongoing,
        "upcoming_trips": upcoming[:3],
        "recommended_destinations": recommended
    }
