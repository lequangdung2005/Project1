# StreamFlow - AI Agent Instructions

## Project Overview
StreamFlow is a personal music streaming app with a **React/Vite frontend** and **FastAPI backend**. The frontend runs on port 3000 (configured in `vite.config.ts`), and the backend serves at `http://127.0.0.1:2005`. The app scans local MP3 files from `d:\Study\Code\Python\Project1\music` directory and streams them through a web interface with JWT-based authentication.

## Architecture & Data Flow

### Frontend → Backend Communication
- Frontend fetches songs from `GET /api/songs/` and maps them to include `audioUrl: http://127.0.0.1:2005/api/stream/${song.id}`
- Audio streaming happens via `GET /api/stream/{song_id}` which returns `FileResponse` with the MP3 file path
- Music scanning triggered manually via `POST /api/scan-music` (runs as background task)
- Authentication via `POST /api/auth/signup` and `POST /api/auth/login` returning JWT tokens
- Favorites managed via many-to-many relationship (`user_favorites` association table in `models.py`)

### Authentication Pattern
- **JWT tokens** stored in `localStorage` via `AuthContext` (contexts/AuthContext.tsx)
- Backend uses `python-jose` for token generation and **Argon2** for password hashing (via `passlib[argon2]`)
- User model includes: username (unique), email (unique), hashed_password, created_at, favorites (relationship)
- Auth flow: signup → auto-login → token stored → user state updated
- Logout clears localStorage and resets auth state

### Database Pattern
- **Important**: `backend/database.py` uses SQLite (`streamflow.db` in project root)
- Three tables: `songs` (music metadata), `users` (authentication), `user_favorites` (many-to-many association)
- Models use SQLAlchemy ORM (`backend/models.py`) with relationships for favorites
- Database creation happens via `models.Base.metadata.create_all(bind=engine)` in `main.py`
- SQLAlchemy 2.0.44+ required for Python 3.13 compatibility

### Music Scanning Logic (`backend/scan_music.py`)
- Scans `PROJECT_ROOT / "music"` recursively for `.mp3` files only
- Uses `mutagen.mp3.MP3` to extract ID3 tags (TIT2=title, TPE1=artist, TALB=album, duration)
- Prevents duplicates by checking `Song.file_path` existence before adding
- Runs as FastAPI `BackgroundTasks` to avoid blocking API responses

### AI Assistant Integration
- Uses **OpenAI-compatible API** with DeepSeek model (`deepseek-ai/deepseek-v3.1`)
- API keys: `OPENAI_API_KEY` and `OPENAI_BASE_URL` in `.env.local`, exposed via `vite.config.ts` define
- `geminiService.ts` uses `openai` package with `dangerouslyAllowBrowser: true` for client-side usage
- Chat history maintained in frontend (`components/AIAssistant.tsx`) and converted to OpenAI message format
- System instruction: Acts as "Melody", a concise music knowledge assistant

### Song Queue & Sorting System
- Custom **Queue** data structure (`utils/Queue.ts`) implements FIFO linked list for play queue
- Songs added via `addToQueue()` in `App.tsx`, dequeued on track completion via `playNextInQueue()`
- `queueVersion` state triggers re-renders when queue changes (enqueue/dequeue operations)
- **MergeSort** implementation (`utils/MergeSort.ts`) with generic comparator for sorting by playCount, releaseDate, duration
- Frontend augments backend Song data with: `audioUrl`, `coverUrl`, `playCount`, `releaseDate` (generated client-side)

## Critical Conventions

### Path Resolution
- Backend uses `pathlib.Path(__file__).parent.parent` to get project root (not `os.getcwd()`)
- Frontend uses Vite's `@` alias mapping to project root (configured in `vite.config.ts` and `tsconfig.json`)

### TypeScript Types
- `types.ts` defines `Song` interface with `audioUrl` and `coverUrl` (added in frontend, not from backend)
- Backend schemas (`schemas.py`) use Pydantic with `orm_mode = True` for SQLAlchemy model compatibility
- Frontend uses `View` enum for navigation state (`HOME`, `LIBRARY`, `AI_CHAT`)

### CORS Configuration
- Backend allows origins: `http://localhost:3000` and `http://localhost:5173`
- **Note**: Vite config sets port 3000, but README mentions 5173 - both are whitelisted for flexibility

### State Management
- No global state library - uses React `useState` in `App.tsx` for:
  - Current song/playing state
  - Songs list (fetched once on mount)
  - View navigation (`View.HOME`, `View.LIBRARY`, `View.AI_CHAT`)
  - Auth modal state (open/closed, login/signup mode)
  - Song queue (`Queue<Song>` instance) and queue version counter
  - Sort order enum (`DEFAULT`, `PLAY_COUNT`, `RELEASE_DATE`, `DURATION`)
  - Favorite songs list (fetched when viewing library)
- Audio playback controlled via `useRef<HTMLAudioElement>` in `Player.tsx`
- Authentication state via React Context (`AuthContext`) wrapping entire app in `index.tsx`

## Development Workflow

### Starting the Application
1. **Backend**: `uvicorn backend.main:app --reload --port 2005` (from project root)
2. **Frontend**: `npm run dev` (starts Vite on port 3000)
3. **Scan Music**: `curl -X POST http://127.0.0.1:2005/api/scan-music` (Windows: use PowerShell or Git Bash)
4. **Create Account**: Click "Sign Up" in UI, fill form, auto-logged in after signup

### Python Environment
- Backend requires Python 3.8+ with packages from `backend/requirements.txt`
- Create venv in `backend/venv` and activate before running uvicorn
- Key dependencies: `fastapi`, `uvicorn`, `sqlalchemy>=2.0.44`, `mutagen`, `python-jose[cryptography]`, `passlib[argon2]`, `argon2-cffi`, `pydantic[email]`
- SQLAlchemy 2.0.44+ fixes Python 3.13 compatibility issues
- **Important**: Uses Argon2 for password hashing (more secure than bcrypt), requires both `passlib[argon2]` and `argon2-cffi`

### Frontend Build
- Build command: `npm run build` (TypeScript compile + Vite build)
- Preview: `npm run preview`
- ESLint configured for `.tsx` files with zero warnings policy

## Common Pitfalls

1. **Database not initialized**: If `database.py` is empty, implement it before running the backend
2. **Music folder missing**: Backend expects `music/` directory at project root - create manually
3. **API key errors**: AI features require `OPENAI_API_KEY` and `OPENAI_BASE_URL` in `.env.local` (not committed to git)
4. **Port conflicts**: Frontend configured for 3000 but docs reference 5173 - check actual running port
5. **File path issues**: Windows paths in `scan_music.py` - use `pathlib` for cross-platform compatibility
6. **Backend port**: Use port **2005** for backend (not 8000) - configured in README instructions

## Key Files Reference
- `App.tsx`: Main component orchestrating song list, player, AI chat, and auth modal
- `contexts/AuthContext.tsx`: React context for authentication state management
- `components/AuthModal.tsx`: Login/signup form modal with validation
- `backend/main.py`: FastAPI routes (songs, streaming, auth endpoints)
- `backend/auth.py`: Authentication utilities (password hashing, JWT tokens, user CRUD)
- `backend/models.py`: SQLAlchemy models for `Song` and `User` tables
- `backend/schemas.py`: Pydantic schemas for API validation (songs, users, tokens)
- `backend/scan_music.py`: Music library scanning logic
- `services/geminiService.ts`: AI chat integration
- `vite.config.ts`: Frontend port (3000), API key injection, path aliases
