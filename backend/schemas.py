from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class SongBase(BaseModel):
    title: str | None = None
    artist: str | None = None
    album: str | None = None
    file_path: str
    duration: int | None = None
    genre: str | None = None
    year: int | None = None
    bpm: float | None = None
    energy: float | None = None
    danceability: float | None = None
    valence: float | None = None
    acousticness: float | None = None

class SongCreate(SongBase):
    pass

class Song(SongBase):
    id: int
    play_count: int = 0
    skip_count: int = 0

    class Config:
        from_attributes = True


# Play History Schemas
class PlayHistoryBase(BaseModel):
    song_id: int
    listen_duration: int
    completion_rate: float
    completed: bool = False

class PlayHistoryCreate(PlayHistoryBase):
    pass

class PlayHistory(PlayHistoryBase):
    id: int
    user_id: int
    played_at: datetime

    class Config:
        from_attributes = True


# Skip Schemas
class SkipBase(BaseModel):
    song_id: int
    time_before_skip: int

class SkipCreate(SkipBase):
    pass

class Skip(SkipBase):
    id: int
    user_id: int
    skipped_at: datetime

    class Config:
        from_attributes = True


# Audio Features Schemas
class AudioFeaturesBase(BaseModel):
    song_id: int
    spectral_centroid: float | None = None
    spectral_rolloff: float | None = None
    zero_crossing_rate: float | None = None
    tempo: float | None = None
    beat_strength: float | None = None
    mfcc_mean: str | None = None
    mfcc_std: str | None = None
    rms_mean: float | None = None

class AudioFeaturesCreate(AudioFeaturesBase):
    pass

class AudioFeatures(AudioFeaturesBase):
    id: int
    extracted_at: datetime

    class Config:
        from_attributes = True


# Recommendation Response Schema
class RecommendedSong(BaseModel):
    song: Song
    score: float
    reason: str  # "Similar to [song]", "Based on your listening history", etc.

class RecommendationResponse(BaseModel):
    recommendations: list[RecommendedSong]
    total: int


# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    remember_me: bool = True  # Default to True for extended sessions
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "john@example.com",
                "password": "securepass123",
                "remember_me": True
            }
        }

class UserLogin(BaseModel):
    username: str
    password: str
    remember_me: bool = True  # Default to True for extended sessions

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None
