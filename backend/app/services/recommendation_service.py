"""
GlobeTrotter — Context-Aware Recommendation Service
====================================================

Deterministic, rule-based ranking engine backed by the PostgreSQL master tables.
No AI/ML. No external APIs.

Ranking Priority (tourist spots):
    1. City match          — hard filter (only this city)
    2. Interest match      — +30 pts per matched interest keyword
    3. Must-visit          — +25 pts
    4. Duration fit        — +0..15 pts
    5. Diversity bonus     — +10 pts (applied post-sort as tie-break)

    Exclusion: place_name in excluded set → hard filter out

Ranking Priority (restaurants):
    1. City match          — hard filter
    2. Food interest       — +20 pts if user has Food interest
    3. Cuisine/category    — +15 pts per matching preference keyword
    4. Diversity bonus     — +10 pts (post-sort)

    Exclusion: name in excluded set → hard filter out

Interest → Sub-category mapping (documented, from actual DB values):
    Heritage  → Heritage Fort, Monument/Historic Site, UNESCO Heritage Site
    Nature    → Nature/Lake, Beach, Viewpoint, Adventure Activity
    Adventure → Adventure Activity, Beach
    Food      → Food & Dining  (also boosts all restaurants)
    Religious → Religious Site
    Shopping  → Tourist Spot (generic)

Duration parser → maps string to hours (best-effort, graceful on failure).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional
from sqlalchemy.orm import Session

from app.models.master import City, TouristSpot, Restaurant, BudgetEstimate


# ---------------------------------------------------------------------------
# Interest → Sub-category mapping
# ---------------------------------------------------------------------------

INTEREST_TO_SUBCATEGORY: dict[str, list[str]] = {
    "heritage":   ["Heritage Fort", "Monument/Historic Site", "UNESCO Heritage Site"],
    "nature":     ["Nature/Lake", "Beach", "Viewpoint", "Adventure Activity"],
    "adventure":  ["Adventure Activity", "Beach"],
    "food":       ["Food & Dining"],
    "religious":  ["Religious Site"],
    "shopping":   ["Tourist Spot"],
}

# Cuisine/category keywords that align with food-related interests
FOOD_RESTAURANT_CATEGORIES = {
    "Street Food", "Cafe", "Casual Dining", "Fine Dining",
    "Bakery", "Bakery and Cafe", "Dessert",
}


# ---------------------------------------------------------------------------
# Duration parser
# ---------------------------------------------------------------------------

def parse_duration_hours(duration_str: str) -> Optional[float]:
    """
    Convert a duration_needed string to hours (best-effort).
    Returns None if the string cannot be reliably parsed.

    Known patterns:
      "1-2 hrs"  → 1.5
      "2-3 hrs"  → 2.5
      "3-4 hrs"  → 3.5
      "Half day" → 4
      "Full day" → 8
      "1 hr"     → 1
    """
    s = duration_str.strip().lower()

    if "full day" in s:
        return 8.0
    if "half day" in s:
        return 4.0

    # Match "X-Y hrs" or "X-Y hr"
    range_match = re.match(r"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*hr", s)
    if range_match:
        lo, hi = float(range_match.group(1)), float(range_match.group(2))
        return (lo + hi) / 2

    # Match "X hrs" or "X hr"
    single_match = re.match(r"(\d+(?:\.\d+)?)\s*hr", s)
    if single_match:
        return float(single_match.group(1))

    return None  # unparseable — skip duration scoring for this record


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------

def _parse_interests(interests_str: Optional[str]) -> list[str]:
    """Return lowercase list of interests from comma-separated string."""
    if not interests_str:
        return []
    return [i.strip().lower() for i in interests_str.split(",") if i.strip()]


def _score_spot(
    spot: TouristSpot,
    interests: list[str],
    trip_duration_days: Optional[int],
    seen_categories: set[str],
) -> tuple[int, str]:
    """
    Score a tourist spot and return (score, reason_tag).
    Higher is better.
    """
    score = 0
    reasons: list[str] = []

    # --- Interest match (+30 per matched interest) ---
    matched_interests: list[str] = []
    for interest in interests:
        allowed_subs = INTEREST_TO_SUBCATEGORY.get(interest, [])
        if spot.sub_category in allowed_subs or spot.category.lower() == interest:
            score += 30
            matched_interests.append(interest.capitalize())

    if matched_interests:
        reasons.append(f"Matches {', '.join(matched_interests)}")

    # --- Must-visit (+25) ---
    if spot.must_visit:
        score += 25
        reasons.append("Must Visit")

    # --- Duration fit (0..15) ---
    hours = parse_duration_hours(spot.duration_needed)
    if hours is not None and trip_duration_days is not None:
        # For short trips (≤2 days): prefer ≤2.5 hrs experiences
        # For medium trips (3-5 days): all fine
        # For long trips: full-day fine
        available_hours_per_day = 8.0
        total_available = available_hours_per_day * trip_duration_days
        if hours <= total_available:
            if trip_duration_days <= 2 and hours <= 2.5:
                score += 15
                reasons.append("Fits Your Trip")
            elif trip_duration_days <= 2 and hours <= 4:
                score += 8
            elif trip_duration_days > 2:
                score += 12
                reasons.append("Fits Your Trip")

    # --- Diversity bonus (+10 for under-represented category) ---
    if spot.sub_category not in seen_categories:
        score += 10

    # Build reason tag (first meaningful reason only for clean UX)
    reason = reasons[0] if reasons else "Recommended"
    return score, reason


def _score_restaurant(
    restaurant: Restaurant,
    interests: list[str],
    cuisine_prefs: list[str],
    seen_categories: set[str],
) -> tuple[int, str]:
    """Score a restaurant. Higher is better."""
    score = 0
    reasons: list[str] = []

    # --- Food interest boost (+20) ---
    if "food" in interests:
        score += 20
        reasons.append("Matches Food")

    # --- Cuisine/category match (+15) ---
    for pref in cuisine_prefs:
        pref_lower = pref.lower()
        if (pref_lower in restaurant.cuisine.lower()
                or pref_lower in restaurant.category.lower()):
            score += 15
            reasons.append(f"Matches {pref.capitalize()}")
            break  # one cuisine match is enough

    # --- Diversity bonus (+10) ---
    if restaurant.category not in seen_categories:
        score += 10

    reason = reasons[0] if reasons else "Recommended"
    return score, reason


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

@dataclass
class ScoredSpot:
    spot: TouristSpot
    score: int
    reason: str


@dataclass
class ScoredRestaurant:
    restaurant: Restaurant
    score: int
    reason: str


def recommend_places(
    db: Session,
    city_id: int,
    interests_str: Optional[str] = None,
    trip_duration_days: Optional[int] = None,
    exclude_place_names: Optional[list[str]] = None,
    limit: int = 3,
) -> list[ScoredSpot]:
    """
    Return top `limit` tourist spot recommendations for a city.

    Args:
        db: SQLAlchemy session
        city_id: ID from the cities table (hard filter)
        interests_str: comma-separated interests e.g. "Heritage,Nature"
        trip_duration_days: total days available (influences duration scoring)
        exclude_place_names: place names already in user's itinerary (hard exclude)
        limit: max results to return (default 3)
    """
    exclude_names_lower: set[str] = {
        n.strip().lower() for n in (exclude_place_names or [])
    }
    interests = _parse_interests(interests_str)

    # SQL-filter: only this city
    candidates: list[TouristSpot] = (
        db.query(TouristSpot)
        .filter(TouristSpot.city_id == city_id)
        .all()
    )

    # Hard-exclude already-selected items
    candidates = [
        s for s in candidates
        if s.place_name.strip().lower() not in exclude_names_lower
    ]

    # Score every candidate
    seen_categories: set[str] = set()
    scored: list[ScoredSpot] = []
    for spot in candidates:
        sc, reason = _score_spot(spot, interests, trip_duration_days, seen_categories)
        scored.append(ScoredSpot(spot=spot, score=sc, reason=reason))

    # Sort by score descending, then must_visit desc, then name asc (stable)
    scored.sort(key=lambda x: (-x.score, not x.spot.must_visit, x.spot.place_name))

    # Diversity pass: pick top `limit` ensuring sub_category variety where possible
    result: list[ScoredSpot] = []
    used_subcats: set[str] = set()

    # First pass: prefer diversity
    for item in scored:
        if len(result) >= limit:
            break
        if item.spot.sub_category not in used_subcats:
            result.append(item)
            used_subcats.add(item.spot.sub_category)

    # Second pass: fill remaining slots if limit not met
    for item in scored:
        if len(result) >= limit:
            break
        if item not in result:
            result.append(item)

    return result[:limit]


def recommend_restaurants(
    db: Session,
    city_id: int,
    interests_str: Optional[str] = None,
    cuisine_prefs: Optional[list[str]] = None,
    exclude_restaurant_names: Optional[list[str]] = None,
    limit: int = 3,
) -> list[ScoredRestaurant]:
    """
    Return top `limit` restaurant recommendations for a city.

    Args:
        db: SQLAlchemy session
        city_id: hard filter
        interests_str: comma-separated interests ("Food" boosts all restaurants)
        cuisine_prefs: explicit cuisine preferences from request
        exclude_restaurant_names: already-selected restaurant names
        limit: max results
    """
    exclude_names_lower: set[str] = {
        n.strip().lower() for n in (exclude_restaurant_names or [])
    }
    interests = _parse_interests(interests_str)
    cuisines = [c.strip() for c in (cuisine_prefs or [])]

    candidates: list[Restaurant] = (
        db.query(Restaurant)
        .filter(Restaurant.city_id == city_id)
        .all()
    )

    candidates = [
        r for r in candidates
        if r.name.strip().lower() not in exclude_names_lower
    ]

    seen_categories: set[str] = set()
    scored: list[ScoredRestaurant] = []
    for restaurant in candidates:
        sc, reason = _score_restaurant(restaurant, interests, cuisines, seen_categories)
        scored.append(ScoredRestaurant(restaurant=restaurant, score=sc, reason=reason))

    scored.sort(key=lambda x: (-x.score, x.restaurant.name))

    # Diversity pass
    result: list[ScoredRestaurant] = []
    used_cats: set[str] = set()

    for item in scored:
        if len(result) >= limit:
            break
        if item.restaurant.category not in used_cats:
            result.append(item)
            used_cats.add(item.restaurant.category)

    for item in scored:
        if len(result) >= limit:
            break
        if item not in result:
            result.append(item)

    return result[:limit]


def get_budget_reference(
    db: Session,
    city_id: int,
    tier: Optional[str],
    days: int = 1,
) -> Optional[dict]:
    """
    Return a reference budget estimate for a city/tier/days combination.
    Falls back to 'mid-range' if the requested tier doesn't exist for this city.
    Returns None if no budget data at all for this city.
    """
    effective_tier = tier or "mid-range"

    estimate: Optional[BudgetEstimate] = (
        db.query(BudgetEstimate)
        .filter(
            BudgetEstimate.city_id == city_id,
            BudgetEstimate.tier == effective_tier,
        )
        .first()
    )

    # Fallback: try mid-range if requested tier not found
    if estimate is None and effective_tier != "mid-range":
        estimate = (
            db.query(BudgetEstimate)
            .filter(
                BudgetEstimate.city_id == city_id,
                BudgetEstimate.tier == "mid-range",
            )
            .first()
        )

    if estimate is None:
        return None

    total = float(estimate.total_per_day) * days
    return {
        "city_id": city_id,
        "tier": estimate.tier,
        "days": days,
        "accommodation_per_day": float(estimate.accommodation_per_day),
        "food_per_day": float(estimate.food_per_day),
        "local_transport_per_day": float(estimate.local_transport_per_day),
        "activities_per_day": float(estimate.activities_per_day),
        "total_per_day": float(estimate.total_per_day),
        "reference_total": round(total, 2),
        "notes": estimate.notes,
    }


def get_multi_city_budget(
    db: Session,
    stops: list[dict],  # [{"city_id": int, "tier": str|None, "days": int}, ...]
    remaining_budget: Optional[float] = None,
) -> dict:
    """
    Calculate multi-city reference budget breakdown.

    Returns per-stop breakdowns, grand total, and optional budget nudge.
    """
    breakdown: list[dict] = []
    grand_total = 0.0

    for stop in stops:
        city_id = stop["city_id"]
        tier = stop.get("tier")
        days = max(1, stop.get("days", 1))

        city: Optional[City] = db.query(City).filter(City.id == city_id).first()
        ref = get_budget_reference(db, city_id, tier, days)

        if ref:
            grand_total += ref["reference_total"]
            breakdown.append({
                "city_id": city_id,
                "city_name": f"{city.city}, {city.state}" if city else str(city_id),
                "tier": ref["tier"],
                "days": days,
                "total_per_day": ref["total_per_day"],
                "reference_total": ref["reference_total"],
            })
        else:
            breakdown.append({
                "city_id": city_id,
                "city_name": f"{city.city}, {city.state}" if city else str(city_id),
                "tier": tier or "mid-range",
                "days": days,
                "total_per_day": None,
                "reference_total": None,
                "note": "No budget data available for this city/tier",
            })

    # Budget nudge: if remaining budget < next-city reference daily cost
    nudge: Optional[dict] = None
    if remaining_budget is not None and breakdown:
        next_stop = breakdown[0]
        if next_stop.get("total_per_day") and remaining_budget < next_stop["total_per_day"]:
            nudge = {
                "message": (
                    f"Your remaining budget (Rs. {remaining_budget:,.0f}) is below the estimated "
                    f"daily cost for {next_stop['city_name']} "
                    f"(Rs. {next_stop['total_per_day']:,.0f}/day, {next_stop['tier']} tier)."
                ),
                "severity": "warning",
            }

    return {
        "breakdown": breakdown,
        "grand_total": round(grand_total, 2),
        "nudge": nudge,
    }


def get_budget_status(
    budget_limit: Optional[float],
    current_spend: float,
) -> dict:
    """
    Calculate budget utilization status.

    Thresholds:
        0–50%:   comfortable
        50–80%:  moderate
        80–100%: near_limit
        >100%:   over_budget
    """
    if budget_limit is None or budget_limit <= 0:
        return {
            "budget_limit": None,
            "current_spend": current_spend,
            "remaining": None,
            "utilization_pct": None,
            "status": "no_limit",
            "is_over_budget": False,
        }

    remaining = budget_limit - current_spend
    pct = (current_spend / budget_limit) * 100

    if pct <= 50:
        status = "comfortable"
    elif pct <= 80:
        status = "moderate"
    elif pct <= 100:
        status = "near_limit"
    else:
        status = "over_budget"

    return {
        "budget_limit": budget_limit,
        "current_spend": current_spend,
        "remaining": round(remaining, 2),
        "utilization_pct": round(pct, 1),
        "status": status,
        "is_over_budget": current_spend > budget_limit,
    }
