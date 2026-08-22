"""
GlobeTrotter — Full Dataset Import Script
==========================================
Imports all three master datasets into PostgreSQL.

Usage:
    cd backend
    python seed_data.py

Idempotent: safe to re-run. Master tables are truncated and reloaded on each run.
Auth tables (roles, users, etc.) are only seeded if empty.

Source datasets (unchanged):
    backend/Datasets/Budget_Estimates.csv          → budget_estimates
    backend/Datasets/Tourist_Spots_Complete (1).csv → tourist_spots
    backend/Datasets/restaurant_dataset.csv         → restaurants
    (derived from all three)                        → cities
"""

import os
import csv
import sys
from decimal import Decimal
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.orm import Session

# ── Resolve paths ──────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).resolve().parent
DATASETS_DIR = BACKEND_DIR / "Datasets"

TOURIST_SPOTS_FILE = DATASETS_DIR / "Tourist_Spots_Complete (1).csv"
RESTAURANTS_FILE   = DATASETS_DIR / "restaurant_dataset.csv"
BUDGET_FILE        = DATASETS_DIR / "Budget_Estimates.csv"

# ── Bootstrap Django-style path so imports resolve ─────────────────────────
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("ENV_FILE", str(BACKEND_DIR / ".env"))

from app.db.database import engine, Base
from app.models.user import Role
from app.models.master import City, TouristSpot, Restaurant, BudgetEstimate, Activity  # noqa: F401 — register all models
from app.models.trip import Trip, TripStop, TripActivity, Expense, SavedDestination  # noqa: F401


# ── Helpers ────────────────────────────────────────────────────────────────

def read_csv(path: Path) -> list[dict]:
    """Read a CSV file and return a list of row dicts (stripped values)."""
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return [{k: v.strip() for k, v in row.items()} for row in reader]


def to_bool(value: str) -> bool:
    return value.strip().lower() in ("yes", "true", "1")


def to_decimal(value: str) -> Decimal:
    return Decimal(value.strip().replace(",", ""))


# ── Main import function ───────────────────────────────────────────────────

def seed():
    print("=" * 60)
    print("GlobeTrotter -- Dataset Import")
    print("=" * 60)

    # 1. Create all tables (idempotent)
    print("\n[1/7] Creating tables (if not exist)...")
    Base.metadata.create_all(bind=engine)
    print("      Tables OK.")

    with Session(engine) as session:

        # 2. Seed roles (only if missing — do NOT truncate auth data)
        print("\n[2/7] Seeding roles...")
        if not session.query(Role).first():
            session.add_all([
                Role(name="ADMIN", description="Administrator"),
                Role(name="USER",  description="Standard User"),
            ])
            session.commit()
            print("      Roles seeded.")
        else:
            print("      Roles already exist — skipping.")

        # 3. Read source CSVs
        print("\n[3/7] Reading source datasets...")
        tourist_rows  = read_csv(TOURIST_SPOTS_FILE)
        restaurant_rows = read_csv(RESTAURANTS_FILE)
        budget_rows   = read_csv(BUDGET_FILE)

        print(f"      Tourist Spots  : {len(tourist_rows):>5} rows")
        print(f"      Restaurants    : {len(restaurant_rows):>5} rows")
        print(f"      Budget Estimates: {len(budget_rows):>5} rows")

        # 4. Build unique (state, city) set across all datasets
        print("\n[4/7] Deriving unique cities...")
        city_pairs: set[tuple[str, str]] = set()
        for row in tourist_rows + restaurant_rows + budget_rows:
            state = row["state"].strip()
            city  = row["city"].strip()
            if state and city:
                city_pairs.add((state, city))

        city_pairs_sorted = sorted(city_pairs, key=lambda x: (x[0], x[1]))
        print(f"      Unique (state, city) pairs: {len(city_pairs_sorted)}")

        # 5. Truncate + reload master tables (CASCADE handles child rows)
        print("\n[5/7] Truncating master tables for fresh import...")
        session.execute(text("TRUNCATE TABLE tourist_spots, restaurants, budget_estimates, cities RESTART IDENTITY CASCADE"))
        session.commit()
        print("      Truncated: cities, tourist_spots, restaurants, budget_estimates.")

        # 6. Insert cities and build lookup map
        print("\n[6/7] Importing cities...")
        city_map: dict[tuple[str, str], int] = {}
        for state, city_name in city_pairs_sorted:
            c = City(state=state, city=city_name)
            session.add(c)
            session.flush()  # get auto-assigned id
            city_map[(state, city_name)] = c.id

        session.commit()
        print(f"      Imported {len(city_map)} cities.")

        # 7. Import tourist spots
        print("\n[7a] Importing tourist spots...")
        skipped_spots: list[dict] = []
        spots_imported = 0
        for idx, row in enumerate(tourist_rows, start=1):
            key = (row["state"], row["city"])
            city_id = city_map.get(key)
            if city_id is None:
                skipped_spots.append({"row": idx, "data": key, "reason": "city not found in cities table"})
                continue
            spot = TouristSpot(
                city_id=city_id,
                place_name=row["place_name"],
                category=row["category"],
                sub_category=row["sub_category"],
                must_visit=to_bool(row["must_visit"]),
                description=row["description"],
                duration_needed=row["duration_needed"],
                best_time_to_visit=row["best_time_to_visit"],
                ideal_for=row["ideal_for"],
            )
            session.add(spot)
            spots_imported += 1

        session.commit()
        print(f"      Imported {spots_imported} tourist spots.")
        if skipped_spots:
            print(f"      WARNING: {len(skipped_spots)} rows SKIPPED:")
            for s in skipped_spots:
                print(f"        Row {s['row']}: {s['data']} — {s['reason']}")

        # 7b. Import restaurants
        print("\n[7b] Importing restaurants...")
        skipped_restaurants: list[dict] = []
        restaurants_imported = 0
        for idx, row in enumerate(restaurant_rows, start=1):
            key = (row["state"], row["city"])
            city_id = city_map.get(key)
            if city_id is None:
                skipped_restaurants.append({"row": idx, "data": key, "reason": "city not found in cities table"})
                continue
            r = Restaurant(
                id=row["id"],
                city_id=city_id,
                name=row["name"],
                category=row["category"],
                cuisine=row["cuisine"],
                must_try_dish=row["must_try_dish"],
                notes=row["notes"] if row["notes"] else None,
            )
            session.add(r)
            restaurants_imported += 1

        session.commit()
        print(f"      Imported {restaurants_imported} restaurants.")
        if skipped_restaurants:
            print(f"      WARNING: {len(skipped_restaurants)} rows SKIPPED:")
            for s in skipped_restaurants:
                print(f"        Row {s['row']}: {s['data']} — {s['reason']}")

        # 7c. Import budget estimates
        print("\n[7c] Importing budget estimates...")
        skipped_budget: list[dict] = []
        budget_imported = 0
        for idx, row in enumerate(budget_rows, start=1):
            key = (row["state"], row["city"])
            city_id = city_map.get(key)
            if city_id is None:
                skipped_budget.append({"row": idx, "data": key, "reason": "city not found in cities table"})
                continue
            b = BudgetEstimate(
                city_id=city_id,
                tier=row["tier"],
                accommodation_per_day=to_decimal(row["accommodation_per_day"]),
                food_per_day=to_decimal(row["food_per_day"]),
                local_transport_per_day=to_decimal(row["local_transport_per_day"]),
                activities_per_day=to_decimal(row["activities_per_day"]),
                total_per_day=to_decimal(row["total_per_day"]),
                notes=row["notes"] if row["notes"] else None,
            )
            session.add(b)
            budget_imported += 1

        session.commit()
        print(f"      Imported {budget_imported} budget estimates.")
        if skipped_budget:
            print(f"      WARNING: {len(skipped_budget)} rows SKIPPED:")
            for s in skipped_budget:
                print(f"        Row {s['row']}: {s['data']} — {s['reason']}")

        # ── Validation ──────────────────────────────────────────────────────
        print("\n" + "=" * 60)
        print("VALIDATION")
        print("=" * 60)

        db_cities     = session.query(City).count()
        db_spots      = session.query(TouristSpot).count()
        db_restaurants = session.query(Restaurant).count()
        db_budget     = session.query(BudgetEstimate).count()

        # Check for orphaned FKs
        orphan_spots = session.execute(
            text("SELECT COUNT(*) FROM tourist_spots ts WHERE NOT EXISTS (SELECT 1 FROM cities c WHERE c.id = ts.city_id)")
        ).scalar()
        orphan_restaurants = session.execute(
            text("SELECT COUNT(*) FROM restaurants r WHERE NOT EXISTS (SELECT 1 FROM cities c WHERE c.id = r.city_id)")
        ).scalar()
        orphan_budget = session.execute(
            text("SELECT COUNT(*) FROM budget_estimates b WHERE NOT EXISTS (SELECT 1 FROM cities c WHERE c.id = b.city_id)")
        ).scalar()

        print(f"\n{'Source Dataset':<30} {'Source Rows':>12} {'DB Rows':>10} {'Status':>10}")
        print("-" * 65)
        print(f"{'Tourist Spots':<30} {len(tourist_rows):>12} {db_spots:>10} {'OK' if db_spots == len(tourist_rows) else 'MISMATCH':>10}")
        print(f"{'Restaurants':<30} {len(restaurant_rows):>12} {db_restaurants:>10} {'OK' if db_restaurants == len(restaurant_rows) else 'MISMATCH':>10}")
        print(f"{'Budget Estimates':<30} {len(budget_rows):>12} {db_budget:>10} {'OK' if db_budget == len(budget_rows) else 'MISMATCH':>10}")
        print(f"{'Cities (unique)':<30} {len(city_pairs_sorted):>12} {db_cities:>10} {'OK' if db_cities == len(city_pairs_sorted) else 'MISMATCH':>10}")

        print(f"\nOrphan FK check:")
        print(f"  tourist_spots  without valid city_id: {orphan_spots}")
        print(f"  restaurants    without valid city_id: {orphan_restaurants}")
        print(f"  budget_estimates without valid city_id: {orphan_budget}")

        all_ok = (
            db_spots == len(tourist_rows)
            and db_restaurants == len(restaurant_rows)
            and db_budget == len(budget_rows)
            and db_cities == len(city_pairs_sorted)
            and orphan_spots == 0
            and orphan_restaurants == 0
            and orphan_budget == 0
        )

        print("\n" + ("=" * 60))
        if all_ok:
            print("[OK] Import complete. All row counts match. No orphaned FKs.")
            
            # Seed community experiences
            print("\n" + "=" * 60)
            import seed_community
            seed_community.run_seed()
            print("=" * 60)
        else:
            print("[FAIL] Import completed with issues -- review warnings above.")
        print("=" * 60)


if __name__ == "__main__":
    seed()

