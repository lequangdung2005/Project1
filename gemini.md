This looks like a full-stack web application for streaming music. Here's a summary of the project structure and technologies used:

### Frontend (`./`)

*   **Framework**: React with Vite for bundling
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **Key Dependencies**:
    *   `react`, `react-dom`: For building the user interface.
    *   `@google/generative-ai`, `openai`: Suggests integration with AI services, possibly for features like song recommendations or other AI-powered interactions.
    *   `lucide-react`: For icons.
*   **UI Components (`./components/`)**:
    *   `AIAssistant.tsx`: Likely the component that interacts with the AI services.
    *   `AuthModal.tsx`: For user login/signup.
    *   `Player.tsx`: The music player interface.
    *   `Sidebar.tsx`: Navigation sidebar.
    *   `SongList.tsx`: Displays the list of songs.
*   **Context (`./contexts/`)**:
    *   `AuthContext.tsx`: Manages authentication state globally in the app.

### Backend (`./backend/`)

*   **Framework**: FastAPI
*   **Language**: Python
*   **Database**: MySQL (inferred from `mysql-connector-python`) with SQLAlchemy as the ORM.
*   **Key Dependencies**:
    *   `fastapi`, `uvicorn`: For building and serving the API.
    *   `sqlalchemy`, `mysql-connector-python`: For database interaction.
    *   `mutagen`: For reading metadata from audio files.
    *   `python-jose`, `passlib`, `bcrypt`: For handling JWT-based authentication and password hashing.
*   **API Endpoints (`./backend/main.py`)**:
    *   `/api/scan-music`: Initiates a scan of the music library to populate the database.
    *   `/api/stream/{song_id}`: Streams audio files to the client.
    *   `/api/songs/`: CRUD operations for songs.
    *   `/api/auth/`: User signup and login.
    *   `/api/favorites/`: Add, remove, and view a user's favorite songs.

### Overall Architecture

This is a classic client-server architecture. The React frontend communicates with the FastAPI backend via a RESTful API. The backend manages the music library, user data, and authentication. The project also includes AI features, likely powered by Google Gemini and/or OpenAI.
