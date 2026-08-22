import datetime
from sqlalchemy import String, Integer, Float, Text, Boolean, Numeric, UniqueConstraint, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


def get_utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


# ---------------------------------------------------------------------------
# DIMENSION TABLE — cities
# ---------------------------------------------------------------------------

class City(Base):
    __tablename__ = "cities"
    __table_args__ = (
        UniqueConstraint("state", "city", name="uq_cities_state_city"),
        Index("ix_cities_state", "state"),
        Index("ix_cities_city", "city"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships to child master tables
    tourist_spots: Mapped[list["TouristSpot"]] = relationship(
        back_populates="city_ref", cascade="all, delete-orphan"
    )
    restaurants: Mapped[list["Restaurant"]] = relationship(
        back_populates="city_ref", cascade="all, delete-orphan"
    )
    budget_estimates: Mapped[list["BudgetEstimate"]] = relationship(
        back_populates="city_ref", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# MASTER TABLE — tourist_spots
# ---------------------------------------------------------------------------

class TouristSpot(Base):
    __tablename__ = "tourist_spots"
    __table_args__ = (
        Index("ix_tourist_spots_city_id", "city_id"),
        Index("ix_tourist_spots_category", "category"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id", ondelete="CASCADE"), nullable=False)
    place_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    sub_category: Mapped[str] = mapped_column(String(100), nullable=False)
    must_visit: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    duration_needed: Mapped[str] = mapped_column(String(100), nullable=False)
    best_time_to_visit: Mapped[str] = mapped_column(String(200), nullable=False)
    ideal_for: Mapped[str] = mapped_column(String(200), nullable=False)

    city_ref: Mapped["City"] = relationship(back_populates="tourist_spots")


# ---------------------------------------------------------------------------
# MASTER TABLE — restaurants
# ---------------------------------------------------------------------------

class Restaurant(Base):
    __tablename__ = "restaurants"
    __table_args__ = (
        Index("ix_restaurants_city_id", "city_id"),
        Index("ix_restaurants_category", "category"),
        Index("ix_restaurants_cuisine", "cuisine"),
    )

    id: Mapped[str] = mapped_column(String(10), primary_key=True)  # e.g. "R001"
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    cuisine: Mapped[str] = mapped_column(String(100), nullable=False)
    must_try_dish: Mapped[str] = mapped_column(String(200), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    city_ref: Mapped["City"] = relationship(back_populates="restaurants")


# ---------------------------------------------------------------------------
# MASTER TABLE — budget_estimates
# ---------------------------------------------------------------------------

class BudgetEstimate(Base):
    __tablename__ = "budget_estimates"
    __table_args__ = (
        UniqueConstraint("city_id", "tier", name="uq_budget_city_tier"),
        Index("ix_budget_estimates_city_id", "city_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id", ondelete="CASCADE"), nullable=False)
    tier: Mapped[str] = mapped_column(String(50), nullable=False)  # budget / mid-range / luxury
    accommodation_per_day: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    food_per_day: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    local_transport_per_day: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    activities_per_day: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_per_day: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    city_ref: Mapped["City"] = relationship(back_populates="budget_estimates")


# ---------------------------------------------------------------------------
# LEGACY — activities (kept for TripActivity FK references)
# ---------------------------------------------------------------------------

class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cost: Mapped[float] = mapped_column(Float, default=0.0)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
