import os
from datetime import timedelta

class Config:
    # Flask settings
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "verysecretpassword")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # Database settings
    DB_HOST = os.environ.get("DB_HOST", "localhost")
    DB_USER = os.environ.get("DB_USER", "root")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "Password@1234")
    DB_NAME = os.environ.get("DB_NAME", "cookbook_db")