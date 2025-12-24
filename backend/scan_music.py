import os
import pathlib
from mutagen.mp3 import MP3
from sqlalchemy.orm import Session

from .models import Song

PROJECT_ROOT = pathlib.Path(__file__).parent.parent
MUSIC_DIR = PROJECT_ROOT / "music"
SUPPORTED_EXTENSIONS = {".mp3"}


def get_metadata(file_path: pathlib.Path) -> dict | None:
    """Extracts metadata from an MP3 file including genre and year."""
    try:
        audio = MP3(file_path)
        title = audio.get("TIT2", [file_path.stem])[0]
        artist = audio.get("TPE1", ["Unknown Artist"])[0]
        duration = int(audio.info.length)
        album = audio.get("TALB", ["Unknown Album"])[0]
        
        # Extract genre from TCON tag
        genre = None
        if "TCON" in audio:
            genre_data = audio.get("TCON", [None])[0]
            if genre_data:
                genre = str(genre_data)
        
        # Extract year from TDRC (Recording Date) tag
        year = None
        if "TDRC" in audio:
            year_data = audio.get("TDRC", [None])[0]
            if year_data:
                try:
                    year = int(str(year_data).split('-')[0])  # Get year from YYYY-MM-DD
                except (ValueError, IndexError):
                    pass
        
        # Extract BPM if available from TBPM tag
        bpm = None
        if "TBPM" in audio:
            bpm_data = audio.get("TBPM", [None])[0]
            if bpm_data:
                try:
                    bpm = float(str(bpm_data))
                except ValueError:
                    pass

        return {
            "title": title,
            "artist": artist,
            "album": album,
            "duration": duration,
            "file_path": str(file_path),
            "genre": genre,
            "year": year,
            "bpm": bpm,
        }
    except Exception as e:
        print(f"Error reading metadata for {file_path}: {e}")
        return None

def scan_music_library(db: Session):
    """Scans the music directory and adds new songs to the database."""
    print(f"Scanning directory: {MUSIC_DIR}")
    if not MUSIC_DIR.exists():
        print(f"Directory not found: {MUSIC_DIR}")
        print("Please create a 'music' folder in the project root and add your MP3 files.")
        return

    for file_path in MUSIC_DIR.rglob("*"):
        if file_path.suffix.lower() in SUPPORTED_EXTENSIONS:
            if not db.query(Song).filter(Song.file_path == str(file_path)).first():
                try:
                    meta = get_metadata(file_path)
                    if meta:
                        song = Song(**meta)
                        db.add(song)
                        print(f"Adding: {meta.get('artist', 'Unknown Artist')} - {meta.get('title', 'Unknown Title')}")
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")
    db.commit()
    print("Scan complete.")
