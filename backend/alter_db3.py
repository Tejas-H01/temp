import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    DB_URL = "postgresql://postgres:postgres@localhost:5432/globe"

engine = create_engine(DB_URL)

alter_query = """
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(500) DEFAULT NULL;
"""

with engine.connect() as conn:
    conn.execute(text(alter_query))
    conn.commit()

print("Successfully altered users table (added bio).")
