import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    DB_URL = "postgresql://postgres:postgres@localhost:5432/globetrotter"

engine = create_engine(DB_URL)

alter_query = """
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en' NOT NULL;
"""

with engine.connect() as conn:
    conn.execute(text(alter_query))
    conn.commit()

print("Successfully altered users table.")
