# StreamFlow - Your Personal Music Streaming App

StreamFlow is a personal music streaming application with a React frontend and a Python FastAPI backend. It allows you to scan your local music library and play your songs through a web interface.

## Features

-   **Web-based Music Player:** Access your music library from your browser.
-   **FastAPI Backend:** A powerful and fast backend to serve your music.
-   **SQLAlchemy Database:** Manages your song library information.
-   **Automatic Music Scanning:** Scans your music folder and automatically adds songs to your library.

## Tech Stack

-   **Frontend:** React, Vite, TypeScript, Tailwind CSS
--   **Backend:** FastAPI, Python, SQLAlchemy, SQLite
-   **Metadata:** Mutagen

## Setup and Installation

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or higher)
-   [Python](https://www.python.org/) (v3.8 or higher)
-   `pip` and `venv`

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    # For Windows
    python -m venv venv
    .\venv\Scripts\activate

    # For macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install the required Python packages:**
    ```bash
    pip install -r requirements.txt
    ```

### Frontend Setup

1.  **Navigate to the project root directory.**

2.  **Install the required Node.js packages:**
    ```bash
    npm install
    ```

## Running the Application

### 1. Add Your Music

-   Create a folder named `music` in the project root directory (`D:\Study\Code\Python\Project1\music`).
-   Add your `.mp3` files to this folder.

### 2. Run the Backend Server

-   Make sure you are in the project root directory (`D:\Study\Code\Python\Project1`).
-   Run the following command:
    ```bash
    uvicorn backend.main:app --reload --port 2005
    ```
-   The backend server will be running at `http://127.0.0.1:2005`.

### 3. Run the Frontend Application

-   In a new terminal, make sure you are in the project root directory.
-   Run the following command:
    ```bash
    npm run dev
    ```
-   The frontend development server will be running at `http://localhost:5173`.

## Usage

1.  **Open your browser** and go to `http://localhost:5173`.

2.  **Scan your music library:**
    -   To trigger the music scan, you need to send a POST request to the backend. You can use a tool like `curl` or Postman.
    -   **Using `curl`:**
        ```bash
        curl -X POST http://127.0.0.1:2005/api/scan-music
        ```
    -   This will start a background task on the server to scan your `music` folder.
    -   The frontend will then be able to fetch the list of songs.