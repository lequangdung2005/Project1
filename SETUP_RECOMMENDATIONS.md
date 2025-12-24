# Quick Start Guide - Music Recommendation System

## Getting Started

### 1. Install Dependencies

#### Backend
```bash
cd backend
pip install -r requirements.txt
```

New packages:
- scikit-learn
- pandas  
- numpy

#### Frontend
Frontend dependencies unchanged, no new installations needed.

### 2. Reset Database (Required)

The database schema has changed significantly. You need to:

**Option A: Delete and recreate**
```bash
# From project root
rm streamflow.db
```

**Option B: Backup existing data**
```bash
# From project root
cp streamflow.db streamflow.db.backup
rm streamflow.db
```

### 3. Start Services

#### Terminal 1 - Backend
```bash
# From project root
uvicorn backend.main:app --reload --port 2005
```

The backend will automatically create the new database schema with these tables:
- songs (extended with genre, year, bpm, energy, etc.)
- users
- play_history (NEW)
- skips (NEW)
- audio_features (NEW)
- user_favorites

#### Terminal 2 - Frontend
```bash
# From project root
npm run dev
```

Frontend runs on port 3000 (configured in vite.config.ts)

### 4. Scan Music Library

```bash
# PowerShell (Windows)
Invoke-WebRequest -Uri "http://127.0.0.1:2005/api/scan-music" -Method POST

# Or Git Bash / Linux / Mac
curl -X POST http://127.0.0.1:2005/api/scan-music
```

This extracts:
- Title, Artist, Album, Duration (existing)
- **Genre** (TCON tag)
- **Year** (TDRC tag)  
- **BPM** (TBPM tag if available)

### 5. Create Account

1. Open http://localhost:3000
2. Click "Sign Up" button
3. Fill in username, email, password
4. You'll be auto-logged in after signup

### 6. Build Listening History

To get recommendations, you need to play songs:

1. **Navigate to Home** - See all your songs
2. **Play 10-20 songs** - Click play buttons to start listening
3. **Listen to completion** - Let songs play >80% to log as "completed"
4. **Skip songs you don't like** - Click next/skip to log skip events
5. **Add favorites** - Click heart icons on songs you love

### 7. View Recommendations

1. Click **"Recommendations"** in the sidebar (new button)
2. See these sections:
   - **Listening Stats** - Total plays, listening time, top genre
   - **Similar to Current Song** - If a song is playing
   - **Recommended for You** - Top 10 personalized picks
   - **Trending This Week** - Most played songs
   - **Your Top Genres** - Genre breakdown
   - **Your Top Artists** - Artist rankings

## Testing the Features

### Test 1: Play History Tracking

1. Play a song completely
2. Open browser DevTools → Network tab
3. Look for `POST /api/play-history` request
4. Should send: `{"song_id": X, "listen_duration": Y, "completion_rate": Z, "completed": true}`

### Test 2: Skip Tracking

1. Play a song
2. Skip it before 80% completion (click next)
3. Check Network tab for `POST /api/skips` request
4. Should send: `{"song_id": X, "time_before_skip": Y}`

### Test 3: Personalized Recommendations

1. Play songs from 2-3 different genres
2. Complete at least 10 songs
3. Navigate to Recommendations page
4. Should see personalized suggestions based on your listening

### Test 4: Similar Songs

1. Play any song
2. Navigate to Recommendations page
3. See "Similar to [song name]" section appear
4. Songs should match genre/artist of currently playing track

### Test 5: Trending Songs

1. Play various songs multiple times
2. Check Recommendations → Trending This Week
3. Should show most played songs with play counts
4. Rankings update based on recent activity

## API Testing (Optional)

### Get Recommendations
```bash
# Replace YOUR_TOKEN with actual JWT token from localStorage
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:2005/api/recommendations?limit=10
```

### Get Similar Songs
```bash
# Replace 1 with any song ID
curl http://127.0.0.1:2005/api/similar/1?limit=5
```

### Get Trending
```bash
curl http://127.0.0.1:2005/api/trending?limit=20&days=7
```

### Get Listening Stats
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:2005/api/listening-stats
```

## Expected Behavior

### First Time (Cold Start)
- **Recommendations page**: Shows trending songs and empty state message
- **Similar songs**: Shows content-based matches using genre/artist
- **Stats**: Shows 0 plays until you start listening

### After 5-10 Songs
- **Recommendations**: Start appearing based on genre/artist preferences
- **Stats**: Show top genre and artists
- **Trending**: Updates with your most-played tracks

### After 20+ Songs
- **Recommendations**: High-quality personalized picks
- **Collaborative patterns**: System learns song co-occurrence
- **Stats**: Rich listening insights

## Troubleshooting

### "No recommendations yet" message
- **Solution**: Play more songs to completion (>80% listened)
- Need at least 5-10 completed plays for good recommendations

### Recommendations not updating
- **Check**: Browser console for errors
- **Verify**: JWT token is valid (check localStorage)
- **Refresh**: Recommendations page to fetch latest data

### Genre shows as "null" or missing
- **Cause**: MP3 files don't have TCON tags
- **Solution**: Use MP3Tag or similar tool to add genre metadata
- **Workaround**: Recommendations still work using artist similarity

### Database errors on startup
- **Cause**: Old database schema incompatible
- **Solution**: Delete streamflow.db and restart backend
- **Note**: This removes existing users/favorites (expected for major schema change)

### Play history not logging
- **Check**: You're logged in (token in localStorage)
- **Verify**: Network tab shows POST requests to /api/play-history
- **Console**: Look for authentication errors

## Development Notes

### Database Location
- File: `streamflow.db` in project root
- View with: DB Browser for SQLite or similar tool

### API Base URL
- Backend: http://127.0.0.1:2005
- Frontend: http://localhost:3000

### Key Files Modified
- `backend/models.py` - New tables: PlayHistory, Skip, AudioFeatures
- `backend/recommendations.py` - Recommendation engine (NEW)
- `backend/main.py` - New endpoints for recommendations
- `backend/scan_music.py` - Enhanced metadata extraction
- `components/Player.tsx` - Listening event tracking
- `components/Recommendations.tsx` - UI for recommendations (NEW)
- `types.ts` - New interfaces for recommendations

### Storage
- **Play counts**: Backend database (was localStorage)
- **Play history**: Backend database (NEW)
- **Skip events**: Backend database (NEW)
- **JWT token**: Still in localStorage (unchanged)

## Next Steps

1. **Play music** to build your profile
2. **Explore recommendations** as they improve
3. **Check listening stats** to see your habits
4. **Experiment** with different genres to see how recommendations adapt

For detailed algorithm explanation, see [RECOMMENDATIONS.md](RECOMMENDATIONS.md)

---

**Enjoy your personalized music experience! 🎵**
