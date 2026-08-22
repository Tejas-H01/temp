from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.trip import Trip
from app.schemas.trip import TripResponse

router = APIRouter(prefix="/public/trips", tags=["Public Sharing"])

@router.get("/{share_id}", response_model=TripResponse)
def get_public_trip(share_id: str, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.share_id == share_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip
