import datetime
import random
from app.db.database import SessionLocal
from app.models.user import User, Role
from app.models.master import City, TouristSpot, Restaurant
from app.models.trip import Trip, TripStop, TripActivity, CommunityExperience, CommunityExperienceLike

db = SessionLocal()

def run_seed():
    print("Starting Community Experiences Seed...")

    # 1. Create or get Demo User
    demo_email = "demo@globtrotter.local"
    demo_user = db.query(User).filter(User.email == demo_email).first()
    
    if not demo_user:
        role = db.query(Role).filter(Role.name == "USER").first()
        if not role:
            role = Role(name="USER", description="Standard user")
            db.add(role)
            db.commit()
            db.refresh(role)
            
        demo_user = User(
            username="Demo Traveler",
            email=demo_email,
            password_hash="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQqiRQYm", # fake hash
            full_name="Demo Traveler",
            role_id=role.id,
            is_verified=True
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
        print("Created Demo User")

    # 2. Get some demo liking users
    liker_users = []
    for i in range(1, 6):
        email = f"liker{i}@globtrotter.local"
        liker = db.query(User).filter(User.email == email).first()
        if not liker:
            liker = User(
                username=f"Liker{i}",
                email=email,
                password_hash="fake",
                role_id=demo_user.role_id,
                is_verified=True
            )
            db.add(liker)
            db.commit()
            db.refresh(liker)
        liker_users.append(liker)

    # 3. Clean up existing DEMO experiences (idempotent)
    old_trips = db.query(Trip).filter(Trip.name.like("DEMO — %")).all()
    for t in old_trips:
        db.delete(t)
    db.commit()
    print("Cleaned up old demo trips.")

    # 4. Define Demo Experiences
    demo_configs = [
        {"title": "DEMO — Mumbai Food & Heritage Escape", "city": "Mumbai", "days": 3, "tier": "mid-range", "interests": "Food,Heritage", "likes": 32, "copies": 11, "image": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f"},
        {"title": "DEMO — Goa Beach Adventure", "city": "Goa", "days": 5, "tier": "mid-range", "interests": "Nature,Adventure,Food", "likes": 45, "copies": 18, "image": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2"},
        {"title": "DEMO — Jaipur Royal Weekend", "city": "Jaipur", "days": 2, "tier": "luxury", "interests": "Heritage,Food", "likes": 21, "copies": 5, "image": "https://images.unsplash.com/photo-1477587458883-47145ed94245"},
        {"title": "DEMO — Manali Mountain Explorer", "city": "Manali", "days": 7, "tier": "mid-range", "interests": "Nature,Adventure", "likes": 15, "copies": 7, "image": "https://images.unsplash.com/photo-1605649487212-47bdab064df7"},
        {"title": "DEMO — Delhi Heritage Walk", "city": "New Delhi", "days": 3, "tier": "budget", "interests": "Heritage,Food", "likes": 8, "copies": 2, "image": "https://images.unsplash.com/photo-1587474260584-136574528ed5"},
        {"title": "DEMO — Udaipur Lakes & Palaces", "city": "Udaipur", "days": 4, "tier": "mid-range", "interests": "Heritage,Nature", "likes": 28, "copies": 9, "image": "https://images.unsplash.com/photo-1615836245337-f839dff8a631"},
        {"title": "DEMO — Varanasi Spiritual Journey", "city": "Varanasi", "days": 8, "tier": "budget", "interests": "Religious,Heritage", "likes": 42, "copies": 15, "image": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc"},
        {"title": "DEMO — Kochi Coastal Food Trail", "city": "Kochi", "days": 5, "tier": "budget", "interests": "Food,Nature", "likes": 19, "copies": 6, "image": "https://images.unsplash.com/photo-1593693397690-362cb9666fc2"},
        {"title": "DEMO — Bengaluru Weekend Explorer", "city": "Bangalore", "days": 2, "tier": "mid-range", "interests": "Food,Shopping", "likes": 12, "copies": 4, "image": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2"},
        {"title": "DEMO — Rishikesh Adventure Retreat", "city": "Rishikesh", "days": 10, "tier": "luxury", "interests": "Adventure,Nature", "likes": 38, "copies": 14, "image": "https://images.unsplash.com/photo-1600082647781-a7b6cfc825a0"},
    ]

    now = datetime.datetime.now(datetime.timezone.utc)
    base_date = datetime.date.today() + datetime.timedelta(days=14)

    for idx, cfg in enumerate(demo_configs):
        # Find City
        city_name = cfg["city"]
        city_obj = db.query(City).filter(City.city.ilike(f"%{city_name}%")).first()
        if not city_obj:
            print(f"Warning: City {city_name} not found. Skipping {cfg['title']}")
            continue

        end_date = base_date + datetime.timedelta(days=cfg["days"] - 1)

        trip = Trip(
            user_id=demo_user.id,
            name=cfg["title"],
            description=f"A wonderful {cfg['days']}-day journey exploring the {cfg['interests'].lower().replace(',', ' and ')} of {city_name}.",
            start_date=base_date,
            end_date=end_date,
            budget_limit=50000.0 if cfg["tier"] == "luxury" else (20000.0 if cfg["tier"] == "mid-range" else 10000.0),
            cover_image=cfg["image"],
            interests=cfg["interests"],
            budget_tier=cfg["tier"]
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        stop = TripStop(
            trip_id=trip.id,
            city_id=city_obj.id,
            start_date=base_date,
            end_date=end_date,
            display_order=1
        )
        db.add(stop)
        db.commit()
        db.refresh(stop)

        # Add fake activities
        spots = db.query(TouristSpot).filter(TouristSpot.city_id == city_obj.id).limit(cfg["days"]).all()
        for day_idx in range(cfg["days"]):
            act_date = base_date + datetime.timedelta(days=day_idx)
            
            spot_name = spots[day_idx].place_name if day_idx < len(spots) else f"Explore {city_name}"
            
            act = TripActivity(
                trip_stop_id=stop.id,
                custom_place_name=spot_name,
                activity_date=act_date,
                start_time=datetime.time(10, 0),
                notes=f"Day {day_idx+1} activity"
            )
            db.add(act)
        
        db.commit()

        # Publish
        published_date = now - datetime.timedelta(days=random.randint(1, 30))
        exp = CommunityExperience(
            trip_id=trip.id,
            published_by=demo_user.id,
            published_at=published_date,
            is_published=True,
            like_count=cfg["likes"],
            copy_count=cfg["copies"]
        )
        db.add(exp)
        db.commit()
        db.refresh(exp)

        # Add some real likes to match the like count (up to 5)
        likes_to_add = min(5, cfg["likes"])
        for i in range(likes_to_add):
            lk = CommunityExperienceLike(
                experience_id=exp.id,
                user_id=liker_users[i].id
            )
            db.add(lk)
        db.commit()

        print(f"Created {cfg['title']}")

    print("Seed complete.")

if __name__ == "__main__":
    run_seed()
