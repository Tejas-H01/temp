from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "GlobeTrotter Backend"
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/globetrotter"
    
    JWT_SECRET: str = "super_secret_change_me_in_prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    OTP_EXPIRY: int = 300 # 5 minutes
    RESEND_DELAY: int = 45 # 45 seconds cooldown
    ENABLE_LOGIN_OTP: bool = False
    
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_EMAIL: str = ""
    SMTP_PASSWORD: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
