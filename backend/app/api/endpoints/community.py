from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func
from typing import List, Optional
import datetime

from app.db.database import get_db
from app.models.trip import Trip, TripStop, TripActivity, CommunityExperience, CommunityExperienceLike
from app.models.user import User
from app.auth.security.dependencies import get_current_user, get_optional_current_user
from app.schemas.community import CommunityExperienceResponse, LikeResponse, CopyResponse

router = APIRouter(prefix="/community", tags=["Community"])

@router.get("/experiences", response_model=List[CommunityExperienceResponse])
def get_community_experiences(
    city: Optional[str] = None,
    duration: Optional[str] = None,
    budget_tier: Optional[str] = None,
    interest: Optional[str] = None,
    sort_by: Optional[str] = "recommended",
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    query = db.query(CommunityExperience).join(Trip).filter(CommunityExperience.is_published == True)
    
    # Optional filtering
    if budget_tier:
        query = query.filter(Trip.budget_tier == budget_tier)
    if interest:
        query = query.filter(Trip.interests.ilike(f"%{interest}%"))
        
    experiences = query.all()
    
    # Python side filtering for duration and city to handle relationships easily
    filtered_exps = []
    for exp in experiences:
        trip = exp.trip
        
        # Duration filter
        if duration:
            trip_duration = (trip.end_date - trip.start_date).days + 1
            if duration == "1-3 days" and (trip_duration < 1 or trip_duration > 3):
                continue
            elif duration == "4-7 days" and (trip_duration < 4 or trip_duration > 7):
                continue
            elif duration == "8+ days" and trip_duration < 8:
                continue
                
        # City filter
        if city:
            has_city = any(city.lower() in stop.city.city.lower() for stop in trip.stops if stop.city)
            if not has_city:
                continue
                
        filtered_exps.append(exp)
        
    # Sorting
    if sort_by == "recent":
        filtered_exps.sort(key=lambda x: x.published_at, reverse=True)
    elif sort_by == "used":
        filtered_exps.sort(key=lambda x: x.copy_count, reverse=True)
    else: # recommended / fallback
        filtered_exps.sort(key=lambda x: x.copy_count + (x.like_count * 2), reverse=True)
        
    # Add metadata for response
    user_id = current_user.id if current_user else None
    for exp in filtered_exps:
        exp.publisher_name = exp.publisher.full_name or exp.publisher.username if exp.publisher else "Anonymous"
        exp.publisher_username = exp.publisher.username if exp.publisher else "anonymous"
        if user_id:
            has_liked = db.query(CommunityExperienceLike).filter(
                CommunityExperienceLike.experience_id == exp.id,
                CommunityExperienceLike.user_id == user_id
            ).first() is not None
            exp.is_liked_by_me = has_liked
            
    return filtered_exps

@router.get("/experiences/{experience_id}", response_model=CommunityExperienceResponse)
def get_experience_detail(
    experience_id: int, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    exp = db.query(CommunityExperience).filter(CommunityExperience.id == experience_id, CommunityExperience.is_published == True).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
        
    exp.publisher_name = exp.publisher.full_name or exp.publisher.username if exp.publisher else "Anonymous"
    exp.publisher_username = exp.publisher.username if exp.publisher else "anonymous"
    
    if current_user:
        has_liked = db.query(CommunityExperienceLike).filter(
            CommunityExperienceLike.experience_id == exp.id,
            CommunityExperienceLike.user_id == current_user.id
        ).first() is not None
        exp.is_liked_by_me = has_liked
        
    return exp

@router.post("/experiences/{experience_id}/like", response_model=LikeResponse)
def like_experience(experience_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exp = db.query(CommunityExperience).filter(CommunityExperience.id == experience_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
        
    existing_like = db.query(CommunityExperienceLike).filter(
        CommunityExperienceLike.experience_id == experience_id,
        CommunityExperienceLike.user_id == current_user.id
    ).first()
    
    if not existing_like:
        new_like = CommunityExperienceLike(experience_id=experience_id, user_id=current_user.id)
        db.add(new_like)
        exp.like_count += 1
        db.commit()
        
    return {"status": "success", "like_count": exp.like_count}

@router.delete("/experiences/{experience_id}/like", response_model=LikeResponse)
def unlike_experience(experience_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exp = db.query(CommunityExperience).filter(CommunityExperience.id == experience_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
        
    existing_like = db.query(CommunityExperienceLike).filter(
        CommunityExperienceLike.experience_id == experience_id,
        CommunityExperienceLike.user_id == current_user.id
    ).first()
    
    if existing_like:
        db.delete(existing_like)
        exp.like_count -= 1
        db.commit()
        
    return {"status": "success", "like_count": exp.like_count}

@router.post("/experiences/{experience_id}/copy", response_model=CopyResponse)
def copy_experience(experience_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exp = db.query(CommunityExperience).filter(CommunityExperience.id == experience_id, CommunityExperience.is_published == True).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
        
    orig_trip = exp.trip
    if not orig_trip:
        raise HTTPException(status_code=404, detail="Original trip not found")
        
    # Copy Trip
    new_trip = Trip(
        user_id=current_user.id,
        name=f"Copy of {orig_trip.name}",
        description=orig_trip.description,
        start_date=orig_trip.start_date,
        end_date=orig_trip.end_date,
        budget_limit=orig_trip.budget_limit,
        cover_image=orig_trip.cover_image,
        interests=orig_trip.interests,
        budget_tier=orig_trip.budget_tier
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    
    # Copy Stops and Activities
    for stop in orig_trip.stops:
        new_stop = TripStop(
            trip_id=new_trip.id,
            city_id=stop.city_id,
            start_date=stop.start_date,
            end_date=stop.end_date,
            display_order=stop.display_order
        )
        db.add(new_stop)
        db.commit()
        db.refresh(new_stop)
        
        for act in stop.activities:
            new_act = TripActivity(
                trip_stop_id=new_stop.id,
                activity_id=act.activity_id,
                custom_place_name=act.custom_place_name,
                activity_date=act.activity_date,
                start_time=act.start_time,
                display_order=act.display_order,
                custom_cost=act.custom_cost,
                notes=act.notes
            )
            db.add(new_act)
            
    db.commit()
    
    # Increment copy count
    exp.copy_count += 1
    db.commit()
    
    return {"status": "success", "new_trip_id": new_trip.id}
