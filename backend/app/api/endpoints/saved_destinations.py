from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.auth.security.dependencies import get_current_user
from app.models.user import User
from app.models.trip import SavedDestination
from app.models.master import City
from app.schemas.trip import SavedDestinationResponse
from app.auth.schemas.responses import APIResponse

router = APIRouter(prefix="/saved-destinations", tags=["Saved Destinations"])

@router.get("", response_model=List[SavedDestinationResponse])
def get_saved_destinations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    destinations = db.query(SavedDestination).filter(SavedDestination.user_id == current_user.id).all()
    # City relationship is eager-loaded or lazy-loaded via SQLAlchemy
    # We must ensure we have the city nested. Pydantic from_attributes handles it if we return the models.
    return destinations

@router.post("/{city_id}", response_model=SavedDestinationResponse, status_code=status.HTTP_201_CREATED)
def save_destination(city_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
        
    existing = db.query(SavedDestination).filter(
        SavedDestination.user_id == current_user.id, 
        SavedDestination.city_id == city_id
    ).first()
    
    if existing:
        return existing # Return existing without error as requested by some UX patterns or raise 409
        
    saved = SavedDestination(user_id=current_user.id, city_id=city_id)
    db.add(saved)
    db.commit()
    db.refresh(saved)
    
    return saved

@router.delete("/{city_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_destination(city_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    saved = db.query(SavedDestination).filter(
        SavedDestination.user_id == current_user.id, 
        SavedDestination.city_id == city_id
    ).first()
    
    if not saved:
        raise HTTPException(status_code=404, detail="Saved destination not found")
        
    db.delete(saved)
    db.commit()
    return None
