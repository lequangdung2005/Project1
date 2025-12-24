"""
Music Recommendation Engine
Implements hybrid recommendation system with content-based and collaborative filtering
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Tuple, Dict, Optional
from datetime import datetime, timedelta
from collections import Counter, defaultdict
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler

from .models import Song, User, PlayHistory, Skip
from . import schemas


class RecommendationEngine:
    """
    Hybrid recommendation system combining:
    - Content-based filtering (60%): Genre, artist, audio features similarity
    - Collaborative filtering (40%): Co-occurrence patterns from play history
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.content_weight = 0.6
        self.collaborative_weight = 0.4
    
    def get_recommendations(
        self, 
        user_id: int, 
        limit: int = 10,
        exclude_recently_played_hours: int = 24
    ) -> List[Tuple[Song, float, str]]:
        """
        Get personalized recommendations for a user.
        
        Returns:
            List of tuples (song, score, reason)
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return []
        
        # Get user's listening history
        recent_cutoff = datetime.utcnow() - timedelta(hours=exclude_recently_played_hours)
        recently_played_ids = {
            ph.song_id for ph in 
            self.db.query(PlayHistory)
            .filter(PlayHistory.user_id == user_id, PlayHistory.played_at >= recent_cutoff)
            .all()
        }
        
        # Get all songs excluding recently played
        all_songs = self.db.query(Song).filter(~Song.id.in_(recently_played_ids)).all()
        if not all_songs:
            return []
        
        # Calculate content-based scores
        content_scores = self._content_based_filtering(user_id, all_songs)
        
        # Calculate collaborative scores
        collaborative_scores = self._collaborative_filtering(user_id, all_songs)
        
        # Combine scores with weights
        combined_scores = []
        for song in all_songs:
            content_score = content_scores.get(song.id, 0.0)
            collab_score = collaborative_scores.get(song.id, 0.0)
            
            # Weighted combination
            final_score = (
                self.content_weight * content_score + 
                self.collaborative_weight * collab_score
            )
            
            # Add popularity boost (10% weight from requirements)
            popularity_boost = self._calculate_popularity_score(song)
            final_score = 0.9 * final_score + 0.1 * popularity_boost
            
            # Generate reason
            reason = self._generate_reason(song, content_score, collab_score, user_id)
            
            combined_scores.append((song, final_score, reason))
        
        # Sort by score and return top N
        combined_scores.sort(key=lambda x: x[1], reverse=True)
        return combined_scores[:limit]
    
    def _content_based_filtering(self, user_id: int, candidate_songs: List[Song]) -> Dict[int, float]:
        """
        Calculate content-based similarity scores.
        
        Factors:
        - Genre match with fuzzy matching (35% of content score)
        - Artist similarity with partial matching (35%)
        - Audio features similarity when available (20%)
        - Album match (10%)
        """
        scores = {}
        
        # Get user's favorite genres and artists from play history
        user_play_history = (
            self.db.query(PlayHistory)
            .filter(PlayHistory.user_id == user_id, PlayHistory.completed == True)
            .all()
        )
        
        if not user_play_history:
            # Cold start: return scores based on popularity
            max_plays = self.db.query(func.max(Song.play_count)).scalar() or 1
            for song in candidate_songs:
                # Give new users popular songs
                popularity = (song.play_count or 0) / max_plays if max_plays > 0 else 0.5
                scores[song.id] = 0.3 + (0.4 * popularity)  # Range: 0.3 to 0.7
            return scores
        
        # Extract user preferences
        played_song_ids = [ph.song_id for ph in user_play_history]
        played_songs = self.db.query(Song).filter(Song.id.in_(played_song_ids)).all()
        
        if not played_songs:
            return {song.id: 0.5 for song in candidate_songs}
        
        # Count favorite genres and artists with weights
        genre_weights = Counter()
        artist_weights = Counter()
        album_set = set()
        
        for song in played_songs:
            if song.genre:
                genre_weights[song.genre.lower().strip()] += 1
            if song.artist:
                artist_weights[song.artist.lower().strip()] += 1
            if song.album:
                album_set.add(song.album.lower().strip())
        
        # Get top preferences
        total_plays = len(played_songs)
        favorite_genres = dict(genre_weights.most_common(10))
        favorite_artists = dict(artist_weights.most_common(15))
        
        # Calculate scores for each candidate
        for song in candidate_songs:
            # Genre match score (35%) - weighted by frequency
            genre_score = 0.0
            if song.genre:
                song_genre = song.genre.lower().strip()
                if song_genre in favorite_genres:
                    # Weight by how often user plays this genre
                    genre_score = min(favorite_genres[song_genre] / total_plays * 2, 1.0)
                else:
                    # Partial match for similar genres (e.g., "Rock" matches "Hard Rock")
                    for fav_genre, count in favorite_genres.items():
                        if fav_genre in song_genre or song_genre in fav_genre:
                            genre_score = max(genre_score, min(count / total_plays * 1.5, 0.7))
            
            # Artist similarity score (35%) - weighted by frequency
            artist_score = 0.0
            if song.artist:
                song_artist = song.artist.lower().strip()
                if song_artist in favorite_artists:
                    # Weight by how often user plays this artist
                    artist_score = min(favorite_artists[song_artist] / total_plays * 2.5, 1.0)
                else:
                    # Partial match for featuring artists or similar names
                    for fav_artist, count in favorite_artists.items():
                        if (fav_artist in song_artist or song_artist in fav_artist or
                            any(part in song_artist for part in fav_artist.split() if len(part) > 3)):
                            artist_score = max(artist_score, min(count / total_plays * 1.5, 0.6))
            
            # Audio features similarity (20%)
            audio_score = self._calculate_audio_similarity(song, played_songs)
            
            # Album match bonus (10%)
            album_score = 0.0
            if song.album and song.album.lower().strip() in album_set:
                album_score = 0.8
            
            # Combine content factors
            content_score = (0.35 * genre_score + 0.35 * artist_score + 
                           0.20 * audio_score + 0.10 * album_score)
            scores[song.id] = content_score
        
        return scores
    
    def _collaborative_filtering(self, user_id: int, candidate_songs: List[Song]) -> Dict[int, float]:
        """
        Calculate collaborative filtering scores based on co-occurrence patterns.
        
        Logic: Songs frequently played together by the user get higher scores.
        """
        scores = {song.id: 0.0 for song in candidate_songs}
        
        # Get user's play history ordered by time
        user_plays = (
            self.db.query(PlayHistory)
            .filter(PlayHistory.user_id == user_id)
            .order_by(PlayHistory.played_at)
            .all()
        )
        
        if len(user_plays) < 2:
            return scores
        
        # Build co-occurrence matrix (songs played close together in time)
        co_occurrence = defaultdict(Counter)
        window_hours = 2  # Consider songs played within 2 hours as related
        
        for i, play in enumerate(user_plays):
            # Look at songs played within time window
            for j in range(i + 1, len(user_plays)):
                other_play = user_plays[j]
                time_diff = (other_play.played_at - play.played_at).total_seconds() / 3600
                
                if time_diff > window_hours:
                    break
                
                # Increment co-occurrence count
                co_occurrence[play.song_id][other_play.song_id] += 1
                co_occurrence[other_play.song_id][play.song_id] += 1
        
        # Calculate scores based on co-occurrence with recently played songs
        recent_plays = user_plays[-20:]  # Last 20 songs
        recent_song_ids = [p.song_id for p in recent_plays]
        
        for song in candidate_songs:
            # Sum co-occurrence scores with recently played songs
            total_cooccur = sum(
                co_occurrence[recent_id].get(song.id, 0) 
                for recent_id in recent_song_ids
            )
            
            # Normalize by number of recent songs
            if recent_song_ids:
                scores[song.id] = min(total_cooccur / len(recent_song_ids), 1.0)
        
        return scores
    
    def _calculate_audio_similarity(self, song: Song, reference_songs: List[Song]) -> float:
        """
        Calculate similarity between song and reference songs based on audio features.
        Uses BPM, energy, and other features if available.
        Enhanced to work better with limited data.
        """
        # If no features available, return neutral score
        if not song.bpm and not song.energy and not song.year:
            return 0.5
        
        similarities = []
        
        for ref_song in reference_songs:
            similarity_components = []
            
            # BPM similarity (tempo matching)
            if song.bpm and ref_song.bpm:
                # Use BPM range matching (songs within 20 BPM are similar)
                bpm_diff = abs(song.bpm - ref_song.bpm)
                bpm_sim = max(0, 1.0 - (bpm_diff / 40.0))  # 40 BPM range
                similarity_components.append(bpm_sim)
            
            # Year similarity (era matching)
            if song.year and ref_song.year:
                # Songs from similar years are similar (5 year range)
                year_diff = abs(song.year - ref_song.year)
                year_sim = max(0, 1.0 - (year_diff / 10.0))  # 10 year range
                similarity_components.append(year_sim * 0.6)  # Lower weight
            
            # Duration similarity
            if song.duration and ref_song.duration:
                # Similar length songs
                duration_diff = abs(song.duration - ref_song.duration)
                duration_sim = max(0, 1.0 - (duration_diff / 300.0))  # 5 min range
                similarity_components.append(duration_sim * 0.4)  # Even lower weight
            
            # Energy and other audio features
            if song.energy and ref_song.energy:
                energy_diff = abs(song.energy - ref_song.energy)
                energy_sim = max(0, 1.0 - energy_diff)
                similarity_components.append(energy_sim)
            
            if song.danceability and ref_song.danceability:
                dance_diff = abs(song.danceability - ref_song.danceability)
                dance_sim = max(0, 1.0 - dance_diff)
                similarity_components.append(dance_sim)
            
            if song.valence and ref_song.valence:
                valence_diff = abs(song.valence - ref_song.valence)
                valence_sim = max(0, 1.0 - valence_diff)
                similarity_components.append(valence_sim)
            
            if song.acousticness and ref_song.acousticness:
                acoustic_diff = abs(song.acousticness - ref_song.acousticness)
                acoustic_sim = max(0, 1.0 - acoustic_diff)
                similarity_components.append(acoustic_sim)
            
            # Average the available components
            if similarity_components:
                similarities.append(np.mean(similarity_components))
        
        # Return average similarity, or 0.5 if no valid comparisons
        return np.mean(similarities) if similarities else 0.5
    
    def _calculate_popularity_score(self, song: Song) -> float:
        """Calculate popularity score based on play count (10% weight from requirements)."""
        if not song.play_count:
            return 0.0
        
        # Get max play count for normalization
        max_plays = self.db.query(func.max(Song.play_count)).scalar() or 1
        return min(song.play_count / max_plays, 1.0)
    
    def _generate_reason(self, song: Song, content_score: float, collab_score: float, user_id: int) -> str:
        """Generate human-readable recommendation reason."""
        user_history = (
            self.db.query(PlayHistory)
            .filter(PlayHistory.user_id == user_id, PlayHistory.completed == True)
            .order_by(desc(PlayHistory.played_at))
            .limit(20)
            .all()
        )
        
        if not user_history:
            return "Discover something new"
        
        recent_songs = self.db.query(Song).filter(
            Song.id.in_([ph.song_id for ph in user_history])
        ).all()
        
        if content_score > collab_score * 1.3:  # Clearly content-driven
            # Check for exact artist match
            user_artists = [s.artist.lower().strip() for s in recent_songs if s.artist]
            if song.artist and song.artist.lower().strip() in user_artists:
                # Count how many times user played this artist
                artist_plays = sum(1 for s in recent_songs if s.artist and s.artist.lower().strip() == song.artist.lower().strip())
                if artist_plays >= 3:
                    return f"You love {song.artist}"
                else:
                    return f"More from {song.artist}"
            
            # Check for genre match
            user_genres = [s.genre.lower().strip() for s in recent_songs if s.genre]
            if song.genre and song.genre.lower().strip() in user_genres:
                genre_plays = sum(1 for s in recent_songs if s.genre and s.genre.lower().strip() == song.genre.lower().strip())
                if genre_plays >= 5:
                    return f"Your favorite: {song.genre}"
                else:
                    return f"Similar to your {song.genre} tracks"
            
            # Check for album match
            user_albums = [s.album.lower().strip() for s in recent_songs if s.album]
            if song.album and song.album.lower().strip() in user_albums:
                return f"From an album you enjoy"
            
            # BPM/tempo match
            if song.bpm:
                avg_bpm = np.mean([s.bpm for s in recent_songs if s.bpm])
                if not np.isnan(avg_bpm) and abs(song.bpm - avg_bpm) < 15:
                    return "Matches your tempo preference"
            
            return "Based on your taste"
        elif collab_score > 0.1:  # Collaborative signal
            return "Popular among similar listeners"
        else:
            # Fallback
            if song.play_count and song.play_count > 10:
                return "Trending track"
            return "Recommended for you"
    
    def get_similar_songs(self, song_id: int, limit: int = 10) -> List[Tuple[Song, float, str]]:
        """
        Get songs similar to a specific song (content-based only).
        Enhanced with better matching criteria.
        """
        reference_song = self.db.query(Song).filter(Song.id == song_id).first()
        if not reference_song:
            return []
        
        # Get all other songs
        all_songs = self.db.query(Song).filter(Song.id != song_id).all()
        
        scores = []
        for song in all_songs:
            similarity_score = 0.0
            reason_parts = []
            
            # Artist match (35%) - highest weight for same artist
            if song.artist and reference_song.artist:
                song_artist = song.artist.lower().strip()
                ref_artist = reference_song.artist.lower().strip()
                if song_artist == ref_artist:
                    similarity_score += 0.35
                    reason_parts.append(f"More from {song.artist}")
                elif ref_artist in song_artist or song_artist in ref_artist:
                    similarity_score += 0.25
                    reason_parts.append(f"Related artist")
            
            # Genre match (30%)
            if song.genre and reference_song.genre:
                song_genre = song.genre.lower().strip()
                ref_genre = reference_song.genre.lower().strip()
                if song_genre == ref_genre:
                    similarity_score += 0.30
                    reason_parts.append(f"Similar {song.genre}")
                elif ref_genre in song_genre or song_genre in ref_genre:
                    similarity_score += 0.20
                    reason_parts.append(f"Related genre")
            
            # Album match (15%) - songs from same album are very similar
            if song.album and reference_song.album:
                if song.album.lower().strip() == reference_song.album.lower().strip():
                    similarity_score += 0.15
                    reason_parts.append("Same album")
            
            # Audio features similarity (20%)
            audio_score = self._calculate_audio_similarity(song, [reference_song])
            similarity_score += 0.20 * audio_score
            
            # Generate reason
            if reason_parts:
                reason = " • ".join(reason_parts[:2])  # Max 2 reasons
            else:
                reason = f"Similar to {reference_song.title}"
            
            scores.append((song, similarity_score, reason))
        
        # Sort by similarity and return top N
        scores.sort(key=lambda x: x[1], reverse=True)
        
        # Filter out very low scores (< 0.1) to ensure quality
        filtered_scores = [(s, score, r) for s, score, r in scores if score >= 0.1]
        
        return filtered_scores[:limit]
    
    def get_trending_songs(self, limit: int = 20, days: int = 7) -> List[Song]:
        """
        Get trending songs based on recent play counts.
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Count plays in the time window
        trending = (
            self.db.query(
                PlayHistory.song_id,
                func.count(PlayHistory.id).label("play_count")
            )
            .filter(PlayHistory.played_at >= cutoff_date)
            .group_by(PlayHistory.song_id)
            .order_by(desc("play_count"))
            .limit(limit)
            .all()
        )
        
        if not trending:
            # Fallback to most played songs overall
            return (
                self.db.query(Song)
                .order_by(desc(Song.play_count))
                .limit(limit)
                .all()
            )
        
        song_ids = [t.song_id for t in trending]
        songs = self.db.query(Song).filter(Song.id.in_(song_ids)).all()
        
        # Preserve order from trending query
        song_map = {s.id: s for s in songs}
        return [song_map[sid] for sid in song_ids if sid in song_map]


def get_user_listening_stats(db: Session, user_id: int) -> Dict:
    """
    Get user listening statistics for display.
    """
    # Total completed plays only
    total_plays = db.query(func.count(PlayHistory.id)).filter(
        PlayHistory.user_id == user_id,
        PlayHistory.completed == True
    ).scalar()
    
    # Get completed play history
    user_plays = (
        db.query(PlayHistory)
        .filter(PlayHistory.user_id == user_id, PlayHistory.completed == True)
        .all()
    )
    
    if not user_plays:
        return {
            "total_plays": 0,
            "favorite_genres": [],
            "favorite_artists": [],
            "total_listening_time": 0,
        }
    
    song_ids = [p.song_id for p in user_plays]
    songs = db.query(Song).filter(Song.id.in_(song_ids)).all()
    song_map = {s.id: s for s in songs}
    
    # Count genres and artists from completed plays
    genre_counts = Counter()
    artist_counts = Counter()
    
    for play in user_plays:
        song = song_map.get(play.song_id)
        if song:
            if song.genre:
                genre_counts[song.genre] += 1
            if song.artist:
                artist_counts[song.artist] += 1
    
    return {
        "total_plays": total_plays or 0,
        "favorite_genres": [{"genre": g, "count": c} for g, c in genre_counts.most_common(5)],
        "favorite_artists": [{"artist": a, "count": c} for a, c in artist_counts.most_common(5)],
        "total_listening_time": sum(p.listen_duration for p in user_plays if p.listen_duration),
    }
