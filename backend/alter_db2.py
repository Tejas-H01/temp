import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    DB_URL = "postgresql://postgres:postgres@localhost:5432/globetrotter"

engine = create_engine(DB_URL)

alter_query = """
ALTER TABLE trip_activities ALTER COLUMN activity_id DROP NOT NULL;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS custom_place_name VARCHAR(200);
"""

with engine.connect() as conn:
    conn.execute(text(alter_query))
    conn.commit()

print("Successfully altered trip_activities table.")
