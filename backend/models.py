from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# Association table for user favorites
user_favorites = Table(
    "user_favorites",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("song_id", Integer, ForeignKey("songs.id"), primary_key=True),
)

class Song(Base):
    __tablename__ = "songs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    artist = Column(String, index=True)
    album = Column(String, index=True)
    file_path = Column(String, unique=True, index=True)
    duration = Column(Integer)
    
    # New metadata fields for recommendations
    genre = Column(String, index=True)
    year = Column(Integer)
    play_count = Column(Integer, default=0)
    skip_count = Column(Integer, default=0)
    
    # Audio features for content-based filtering
    bpm = Column(Float)  # Tempo
    energy = Column(Float)  # Energy level (0-1)
    danceability = Column(Float)  # Danceability (0-1)
    valence = Column(Float)  # Musical positivity (0-1)
    acousticness = Column(Float)  # Acoustic vs electric (0-1)
    
    # Relationships
    play_history = relationship("PlayHistory", back_populates="song", cascade="all, delete-orphan")
    skips = relationship("Skip", back_populates="song", cascade="all, delete-orphan")
    audio_features = relationship("AudioFeatures", back_populates="song", uselist=False, cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    favorites = relationship("Song", secondary=user_favorites, backref="favorited_by")
    play_history = relationship("PlayHistory", back_populates="user", cascade="all, delete-orphan")
    skips = relationship("Skip", back_populates="user", cascade="all, delete-orphan")


class PlayHistory(Base):
    """Track user listening history for recommendation algorithm"""
    __tablename__ = "play_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False, index=True)
    played_at = Column(DateTime, default=datetime.utcnow, index=True)
    listen_duration = Column(Integer)  # Seconds listened
    completion_rate = Column(Float)  # Percentage of song completed (0-1)
    completed = Column(Boolean, default=False)  # True if >80% listened
    
    user = relationship("User", back_populates="play_history")
    song = relationship("Song", back_populates="play_history")


class Skip(Base):
    """Track when users skip songs to understand preferences"""
    __tablename__ = "skips"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False, index=True)
    skipped_at = Column(DateTime, default=datetime.utcnow)
    time_before_skip = Column(Integer)  # Seconds before skipping
    
    user = relationship("User", back_populates="skips")
    song = relationship("Song", back_populates="skips")


class AudioFeatures(Base):
    """Store advanced audio analysis features for content-based filtering"""
    __tablename__ = "audio_features"
    
    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), unique=True, nullable=False)
    
    # Spectral features
    spectral_centroid = Column(Float)  # Brightness
    spectral_rolloff = Column(Float)  # Frequency distribution
    zero_crossing_rate = Column(Float)  # Noisiness
    
    # Rhythm features
    tempo = Column(Float)  # BPM
    beat_strength = Column(Float)  # Rhythm clarity
    
    # Timbre features (MFCC statistics)
    mfcc_mean = Column(String)  # JSON array of 13 coefficients
    mfcc_std = Column(String)  # Standard deviation
    
    # Loudness
    rms_mean = Column(Float)  # Root mean square energy
    
    extracted_at = Column(DateTime, default=datetime.utcnow)
    
    song = relationship("Song", back_populates="audio_features")
