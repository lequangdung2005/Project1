from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
from jose import JWTError, jwt


from . import models, schemas, scan_music, auth
from .database import SessionLocal, engine
from .recommendations import RecommendationEngine, get_user_listening_stats

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/api/scan-music")
async def scan_music_endpoint(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Starts a background task to scan the music library.
    """
    background_tasks.add_task(scan_music.scan_music_library, db)
    return {"message": "Music library scan started in the background."}


@app.get("/api/stream/{song_id}")
async def stream_song(song_id: int, db: Session = Depends(get_db)):
    """
    Streams the audio file for a given song.
    """
    song = db.query(models.Song).filter(models.Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    return FileResponse(song.file_path)


@app.post("/api/songs/", response_model=schemas.Song)
def create_song(song: schemas.SongCreate, db: Session = Depends(get_db)):
    db_song = models.Song(**song.dict())
    db.add(db_song)
    db.commit()
    db.refresh(db_song)
    return db_song


@app.get("/api/songs/", response_model=list[schemas.Song])
def read_songs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    songs = db.query(models.Song).offset(skip).limit(limit).all()
    return songs


# Authentication endpoints
@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user account and return access token.
    """
    # Trim whitespace from username and email
    username = user.username.strip()
    email = user.email.strip()
    
    # Validate input
    if len(username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters long"
        )
    
    if len(user.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )
    
    # Check if username already exists
    db_user = auth.get_user_by_username(db, username=username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    db_user = auth.get_user_by_email(db, email=email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user with trimmed values
    user_create = schemas.UserCreate(
        username=username,
        email=email,
        password=user.password,
        remember_me=user.remember_me
    )
    new_user = auth.create_user(db=db, user=user_create)
    
    # Generate token for immediate login with remember_me setting
    access_token = auth.create_access_token(
        data={"sub": new_user.username}, remember_me=user.remember_me
    )
    
    # Return user data and token
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "created_at": new_user.created_at
        }
    }


@app.post("/api/auth/login")
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Login with username and password to get an access token and user data.
    """
    user = auth.authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token with remember_me setting
    access_token = auth.create_access_token(
        data={"sub": user.username}, remember_me=user_credentials.remember_me
    )
    
    # Return token and user data
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at
        }
    }


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = auth.get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user

@app.post("/api/favorites/{song_id}")
def add_to_favorites(song_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    song = db.query(models.Song).filter(models.Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if song in current_user.favorites:
        raise HTTPException(status_code=400, detail="Song already in favorites")
    
    current_user.favorites.append(song)
    db.commit()
    return {"message": "Song added to favorites"}

@app.delete("/api/favorites/{song_id}")
def remove_from_favorites(song_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    song = db.query(models.Song).filter(models.Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if song not in current_user.favorites:
        raise HTTPException(status_code=400, detail="Song not in favorites")
    
    current_user.favorites.remove(song)
    db.commit()
    return {"message": "Song removed from favorites"}

@app.get("/api/favorites", response_model=list[schemas.Song])
def get_favorites(current_user: models.User = Depends(get_current_user)):
    return current_user.favorites


# Play History and Analytics endpoints
@app.post("/api/play-history", response_model=schemas.PlayHistory)
def log_play_history(
    play_data: schemas.PlayHistoryCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Log a play event for recommendation tracking.
    Called when user plays a song (on start and completion).
    """
    # Verify song exists
    song = db.query(models.Song).filter(models.Song.id == play_data.song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Create play history entry
    play_history = models.PlayHistory(
        user_id=current_user.id,
        song_id=play_data.song_id,
        listen_duration=play_data.listen_duration,
        completion_rate=play_data.completion_rate,
        completed=play_data.completed
    )
    db.add(play_history)
    
    # Increment song play count if completed
    if play_data.completed:
        song.play_count = (song.play_count or 0) + 1
    
    db.commit()
    db.refresh(play_history)
    return play_history


@app.post("/api/skips", response_model=schemas.Skip)
def log_skip(
    skip_data: schemas.SkipCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Log when user skips a song.
    """
    # Verify song exists
    song = db.query(models.Song).filter(models.Song.id == skip_data.song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Create skip entry
    skip = models.Skip(
        user_id=current_user.id,
        song_id=skip_data.song_id,
        time_before_skip=skip_data.time_before_skip
    )
    db.add(skip)
    
    # Increment skip count
    song.skip_count = (song.skip_count or 0) + 1
    
    db.commit()
    db.refresh(skip)
    return skip


@app.get("/api/recommendations")
def get_recommendations(
    limit: int = 10,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get personalized song recommendations for the current user.
    """
    engine = RecommendationEngine(db)
    recommendations = engine.get_recommendations(current_user.id, limit=limit)
    
    # Convert to response format
    result = []
    for song, score, reason in recommendations:
        result.append({
            "song": schemas.Song.from_orm(song),
            "score": round(score, 3),
            "reason": reason
        })
    
    return {
        "recommendations": result,
        "total": len(result)
    }


@app.get("/api/similar/{song_id}")
def get_similar_songs(
    song_id: int,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get songs similar to a specific song (content-based).
    No authentication required.
    """
    engine = RecommendationEngine(db)
    similar_songs = engine.get_similar_songs(song_id, limit=limit)
    
    result = []
    for song, score, reason in similar_songs:
        result.append({
            "song": schemas.Song.from_orm(song),
            "score": round(score, 3),
            "reason": reason
        })
    
    return {
        "recommendations": result,
        "total": len(result)
    }


@app.get("/api/trending")
def get_trending(
    limit: int = 20,
    days: int = 7,
    db: Session = Depends(get_db)
):
    """
    Get trending songs based on recent plays.
    No authentication required.
    """
    engine = RecommendationEngine(db)
    trending_songs = engine.get_trending_songs(limit=limit, days=days)
    
    return {
        "songs": [schemas.Song.from_orm(song) for song in trending_songs],
        "total": len(trending_songs)
    }


@app.get("/api/listening-stats")
def get_listening_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's listening statistics and preferences.
    """
    stats = get_user_listening_stats(db, current_user.id)
    return stats
