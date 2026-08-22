from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.user import User
from app.models.trip import Trip, CommunityExperience
from app.auth.schemas.schemas import PublicProfileResponse, PublicProfileExperience

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/{username}", response_model=PublicProfileResponse)
def get_public_profile(username: str, db: Session = Depends(get_db)):
    """
    Retrieves public profile information and published travel experiences for a user.
    This endpoint is public and does not require authentication.
    """
    user = db.query(User).filter(User.username.ilike(username)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # Query only experiences that are published by this user and are active (is_published=True)
    published_experiences = db.query(CommunityExperience).join(Trip).filter(
        CommunityExperience.published_by == user.id,
        CommunityExperience.is_published == True
    ).order_by(CommunityExperience.published_at.desc()).all()
    
    experiences = []
    for exp in published_experiences:
        trip = exp.trip
        if trip:
            duration_days = (trip.end_date - trip.start_date).days + 1
            experiences.append(PublicProfileExperience(
                id=exp.id,
                title=trip.name,
                description=trip.description,
                cover_image=trip.cover_image,
                duration_days=duration_days,
                budget_tier=trip.budget_tier,
                interests=trip.interests,
                like_count=exp.like_count,
                copy_count=exp.copy_count
            ))
            
    return PublicProfileResponse(
        username=user.username,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        experience_count=len(experiences),
        experiences=experiences
    )
