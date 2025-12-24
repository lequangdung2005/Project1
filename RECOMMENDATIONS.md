# StreamFlow Music Recommendation System

## Overview
StreamFlow now features a comprehensive music recommendation system that analyzes your listening habits to suggest songs you'll love. The system uses a hybrid approach combining content-based filtering and collaborative patterns.

## Features

### 1. **Listening History Tracking**
- Automatically tracks every song you play
- Records listen duration and completion rate
- Logs skip events when you skip songs
- Stores data in backend database for persistent recommendations

### 2. **Hybrid Recommendation Algorithm**

#### Content-Based Filtering (60% weight)
- **Genre Matching**: Recommends songs from your favorite genres
- **Artist Similarity**: Suggests songs from artists you frequently listen to
- **Audio Features**: Analyzes tempo (BPM), energy, and other audio characteristics

#### Collaborative Filtering (40% weight)
- **Co-occurrence Patterns**: Identifies songs frequently played together in your sessions
- **Temporal Analysis**: Considers songs played within 2-hour windows as related
- **Session-based Recommendations**: Learns from your listening patterns over time

#### Additional Factors
- **Popularity Boost**: Adds 10% weight for trending songs
- **Recency Filter**: Excludes songs played in the last 24 hours
- **Cold Start Handling**: Provides trending songs for new users

### 3. **Recommendation Types**

#### For You
- Top 10 personalized recommendations based on your complete listening history
- Each recommendation includes a reason (e.g., "Similar to your favorite Rock songs")
- Scoring combines genre match, artist preferences, and audio features

#### Similar Songs
- Shows 5 songs similar to currently playing track
- Content-based similarity using genre, artist, and audio features
- Updates dynamically as you switch songs

#### Trending
- Top 20 songs based on recent play counts (last 7 days)
- Helps discover popular music in your library
- Falls back to most-played songs overall if no recent data

### 4. **Listening Statistics**
- **Total Plays**: Count of all songs you've completed (>80% listened)
- **Listening Time**: Total hours and minutes spent listening
- **Top Genres**: Your 5 most-played genres with play counts
- **Top Artists**: Your 5 favorite artists ranked by plays

## How It Works

### Backend Architecture

#### Database Models
```
Song Model (extended):
- genre, year, bpm, energy, danceability, valence, acousticness
- play_count, skip_count

PlayHistory Model:
- user_id, song_id, played_at
- listen_duration, completion_rate, completed

Skip Model:
- user_id, song_id, skipped_at, time_before_skip

AudioFeatures Model:
- spectral_centroid, zero_crossing_rate, tempo
- mfcc coefficients for advanced audio analysis
```

#### API Endpoints
```
POST /api/play-history - Log play events
POST /api/skips - Log skip events
GET /api/recommendations - Get personalized suggestions
GET /api/similar/{song_id} - Get similar songs
GET /api/trending - Get trending songs
GET /api/listening-stats - Get user statistics
```

#### Recommendation Engine (`backend/recommendations.py`)
The `RecommendationEngine` class implements:
- `get_recommendations()`: Hybrid algorithm combining content and collaborative scores
- `get_similar_songs()`: Content-based similarity calculation
- `get_trending_songs()`: Time-based popularity ranking
- `_content_based_filtering()`: Genre, artist, and audio feature matching
- `_collaborative_filtering()`: Co-occurrence matrix analysis
- `_calculate_audio_similarity()`: Cosine similarity for audio features

### Frontend Integration

#### Player Component
- Tracks play start time when song begins
- Logs completion when 80% of song is played
- Sends skip event when user changes song before completion
- Calculates listen duration and completion rate

#### Recommendations Component
- Fetches personalized recommendations on page load
- Updates similar songs when current track changes
- Displays listening stats in cards
- Provides interactive UI for playing recommended songs

## Music Metadata Extraction

### ID3 Tags
The system extracts the following from MP3 files:
- **Genre** (TCON tag)
- **Year** (TDRC tag)
- **BPM/Tempo** (TBPM tag)
- Title, Artist, Album, Duration (existing)

### Enhanced Scanning
Run `POST /api/scan-music` to extract metadata from your music library. The scanner:
- Recursively scans the `music/` directory
- Extracts ID3 tags using the mutagen library
- Prevents duplicates by checking file paths
- Stores genre, year, and BPM in the database

## Usage Guide

### 1. Setup & Installation

#### Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

New packages added:
- `scikit-learn==1.3.2` - Machine learning algorithms
- `pandas==2.1.4` - Data manipulation
- `numpy==1.26.2` - Numerical computations

#### Database Migration
The database schema has been extended. If you have existing data:
1. Backup your current `streamflow.db`
2. Delete the old database file
3. Restart the backend to create new schema
4. Rescan your music library to populate metadata

### 2. Initial Setup

1. **Start Backend**:
   ```bash
   uvicorn backend.main:app --reload --port 2005
   ```

2. **Start Frontend**:
   ```bash
   npm run dev
   ```

3. **Scan Music Library**:
   ```bash
   curl -X POST http://127.0.0.1:2005/api/scan-music
   ```

4. **Create Account**: Sign up in the UI to enable tracking

### 3. Building Your Profile

To get good recommendations, you need to:
1. **Play songs** - Listen to at least 10-20 songs completely
2. **Skip songs you don't like** - Helps the system learn your preferences
3. **Add favorites** - Mark songs you love with the heart icon
4. **Wait for analysis** - Recommendations improve as you listen more

### 4. Viewing Recommendations

Navigate to "Recommendations" in the sidebar to see:
- **Personalized picks** - Based on your listening history
- **Similar songs** - While playing a track, see related music
- **Trending** - Popular songs in your library
- **Your stats** - Total plays, listening time, top genres/artists

## Algorithm Details

### Scoring Formula
```
Final Score = (0.6 × Content Score) + (0.4 × Collaborative Score) + (0.1 × Popularity Score)

Content Score = (0.4 × Genre Match) + (0.3 × Artist Match) + (0.3 × Audio Similarity)

Collaborative Score = Co-occurrence Count / Recent Songs Count

Popularity Score = Song Play Count / Max Play Count
```

### Similarity Metrics
- **Genre Match**: Binary (1.0 if match, 0.0 otherwise)
- **Artist Match**: Binary (1.0 if same artist, 0.0 otherwise)
- **Audio Similarity**: Cosine similarity of feature vectors (BPM, energy, etc.)
- **Co-occurrence**: Normalized count of songs played together

### Cold Start Strategy
For users with no listening history:
1. Show trending songs (most played globally)
2. Use neutral content scores (0.5)
3. Recommend popular songs from the library
4. Encourage initial interaction with diverse tracks

## Performance Considerations

### Optimization Strategies
1. **Caching**: Recommendation results could be cached with TTL
2. **Indexing**: Database indexes on `genre`, `artist`, `user_id`, `song_id`
3. **Lazy Loading**: UI loads recommendations on-demand
4. **Batch Processing**: Future: Pre-compute similarity matrices nightly

### Scalability
Current design supports:
- Single user (personal music library)
- Up to 10,000 songs
- Real-time recommendation generation

For larger libraries:
- Consider pre-computing similarity matrices
- Implement Redis caching for hot data
- Use background jobs for heavy computation

## Troubleshooting

### No Recommendations Showing
- **Cause**: Not enough listening history
- **Solution**: Play at least 10 songs to completion

### Recommendations Not Updating
- **Cause**: API errors or authentication issues
- **Solution**: Check browser console, verify JWT token is valid

### Missing Genre Information
- **Cause**: MP3 files don't have TCON ID3 tags
- **Solution**: Use a music tagger tool (e.g., MP3Tag) to add genre metadata

### Slow Recommendation Loading
- **Cause**: Large music library or complex calculations
- **Solution**: Wait for initial load, results are fast after first computation

## Future Enhancements

### Planned Features
1. **Audio Feature Extraction**: Use librosa to analyze spectral features, MFCCs
2. **Mood-Based Recommendations**: Detect and match song mood (happy, sad, energetic)
3. **Playlist Generation**: Auto-create playlists from recommendations
4. **Multi-User Support**: Enable collaborative filtering across users
5. **Feedback Loop**: Add like/dislike buttons for recommendations
6. **Time-of-Day Recommendations**: Learn listening patterns by time
7. **Decade/Era Matching**: Recommend songs from similar time periods

### Advanced Algorithms
1. **Matrix Factorization**: SVD for collaborative filtering
2. **Deep Learning**: Neural networks for audio feature extraction
3. **Clustering**: K-means to group similar songs
4. **Association Rules**: Market basket analysis for song pairs

## API Reference

### POST /api/play-history
**Request Body**:
```json
{
  "song_id": 123,
  "listen_duration": 180,
  "completion_rate": 0.95,
  "completed": true
}
```

**Response**: PlayHistory object with `id`, `user_id`, `played_at`

### POST /api/skips
**Request Body**:
```json
{
  "song_id": 456,
  "time_before_skip": 30
}
```

**Response**: Skip object with `id`, `user_id`, `skipped_at`

### GET /api/recommendations?limit=10
**Response**:
```json
{
  "recommendations": [
    {
      "song": { /* Song object */ },
      "score": 0.857,
      "reason": "Similar to your favorite Rock songs"
    }
  ],
  "total": 10
}
```

### GET /api/similar/{song_id}?limit=5
**Response**: Same format as recommendations, but based on single song

### GET /api/trending?limit=20&days=7
**Response**:
```json
{
  "songs": [ /* Array of Song objects */ ],
  "total": 20
}
```

### GET /api/listening-stats
**Response**:
```json
{
  "total_plays": 145,
  "total_listening_time": 12600,
  "favorite_genres": [
    { "genre": "Rock", "count": 45 }
  ],
  "favorite_artists": [
    { "artist": "The Beatles", "count": 23 }
  ]
}
```

## Technical Stack

### Backend
- **FastAPI**: REST API framework
- **SQLAlchemy**: ORM for database operations
- **scikit-learn**: Machine learning algorithms
- **NumPy**: Numerical computations
- **Mutagen**: MP3 metadata extraction

### Frontend
- **React**: UI framework
- **TypeScript**: Type-safe JavaScript
- **TailwindCSS**: Styling
- **Lucide Icons**: UI icons

### Database
- **SQLite**: Local database storage
- **Tables**: songs, users, play_history, skips, user_favorites, audio_features

## Contributing

To extend the recommendation system:
1. Modify `backend/recommendations.py` for algorithm changes
2. Update `backend/models.py` for new data fields
3. Add endpoints in `backend/main.py` for new features
4. Update `components/Recommendations.tsx` for UI changes

## License & Credits

Part of the StreamFlow music streaming application.
Recommendation algorithm inspired by Spotify and Last.fm approaches.

---

**Happy Listening! 🎵**
