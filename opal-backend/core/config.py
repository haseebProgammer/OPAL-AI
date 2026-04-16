import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Literal

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    GEMINI_API_KEY: str
    MODEL_PATH: str = "models/match_model_v2.joblib"
    ENVIRONMENT: Literal["development", "production"] = "development"
    
    # Validation logic automatically handled by Pydantic-Settings
    # If any required field (no default) is missing, it will raise ValidationError on init
    
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

try:
    settings = Settings()
except Exception as e:
    # Raise a descriptive RuntimeError as required
    raise RuntimeError(
        f"CONFIGURATION ERROR: Missing or invalid environment variables. "
        f"Please check your .env file. Error: {str(e)}"
    )
