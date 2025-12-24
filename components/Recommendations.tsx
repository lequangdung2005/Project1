import React, { useState, useEffect } from 'react';
import { Music, TrendingUp, Sparkles, Play, Clock, BarChart3 } from 'lucide-react';
import { Song, RecommendationResponse, ListeningStats } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface RecommendationsProps {
  onPlay: (song: Song) => void;
  currentSong: Song | null;
}

const Recommendations: React.FC<RecommendationsProps> = ({ onPlay, currentSong }) => {
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [similarSongs, setSimilarSongs] = useState<RecommendationResponse | null>(null);
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchRecommendations();
      fetchListeningStats();
    }
    fetchTrending();
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (currentSong) {
      fetchSimilarSongs(currentSong.id);
    }
  }, [currentSong]);

  const fetchRecommendations = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('http://127.0.0.1:2005/api/recommendations?limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSimilarSongs = async (songId: number) => {
    try {
      const response = await fetch(`http://127.0.0.1:2005/api/similar/${songId}?limit=5`);
      const data = await response.json();
      setSimilarSongs(data);
    } catch (error) {
      console.error('Error fetching similar songs:', error);
    }
  };

  const fetchTrending = async () => {
    try {
      const response = await fetch('http://127.0.0.1:2005/api/trending?limit=10&days=7');
      const data = await response.json();
      
      // Add client-side fields
      const songsWithData = data.songs.map((song: Song) => ({
        ...song,
        audioUrl: `http://127.0.0.1:2005/api/stream/${song.id}`,
        coverUrl: `https://picsum.photos/seed/${song.id}/200`,
        releaseDate: new Date(
          2020 + ((song.id * 17) % 5),
          (song.id * 31) % 12,
          ((song.id * 7) % 28) + 1
        ).toISOString(),
      }));
      
      setTrendingSongs(songsWithData);
    } catch (error) {
      console.error('Error fetching trending songs:', error);
    }
  };

  const fetchListeningStats = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('http://127.0.0.1:2005/api/listening-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching listening stats:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatListeningTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Sparkles size={64} className="mx-auto mb-4 text-emerald-500 opacity-50" />
          <h2 className="text-2xl font-bold text-white mb-2">Sign in to get personalized recommendations</h2>
          <p className="text-zinc-400">Create an account or log in to discover music tailored just for you</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-32">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Recommendations for You</h1>
          <p className="text-zinc-400">Discover music based on your listening habits</p>
        </div>

        {/* Listening Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
              <div className="flex items-center gap-3 mb-2">
                <Music className="text-emerald-500" size={24} />
                <h3 className="text-lg font-semibold text-white">Total Plays</h3>
              </div>
              <p className="text-3xl font-bold text-white">{stats.total_plays}</p>
            </div>

            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="text-blue-500" size={24} />
                <h3 className="text-lg font-semibold text-white">Listening Time</h3>
              </div>
              <p className="text-3xl font-bold text-white">{formatListeningTime(stats.total_listening_time)}</p>
            </div>

            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="text-purple-500" size={24} />
                <h3 className="text-lg font-semibold text-white">Top Genre</h3>
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.favorite_genres[0]?.genre || 'N/A'}
              </p>
              {stats.favorite_genres[0] && (
                <p className="text-sm text-zinc-400">{stats.favorite_genres[0].count} plays</p>
              )}
            </div>
          </div>
        )}

        {/* Similar Songs to Currently Playing */}
        {currentSong && similarSongs && similarSongs.recommendations.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="text-emerald-500" size={28} />
              <h2 className="text-2xl font-bold text-white">Similar to "{currentSong.title}"</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {similarSongs.recommendations.slice(0, 5).map(({ song, reason }, index) => (
                <div
                  key={song.id}
                  className="bg-zinc-900 rounded-lg p-4 hover:bg-zinc-800 transition-colors cursor-pointer group"
                  onClick={() => onPlay({
                    ...song,
                    audioUrl: `http://127.0.0.1:2005/api/stream/${song.id}`,
                    coverUrl: `https://picsum.photos/seed/${song.id}/200`,
                    releaseDate: new Date(
                      2020 + ((song.id * 17) % 5),
                      (song.id * 31) % 12,
                      ((song.id * 7) % 28) + 1
                    ).toISOString(),
                  })}
                >
                  <div className="relative mb-3">
                    <img
                      src={`https://picsum.photos/seed/${song.id}/200`}
                      alt={song.title}
                      className="w-full aspect-square rounded-lg object-cover"
                    />
                    <button className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={32} className="text-white" fill="white" />
                    </button>
                  </div>
                  <h3 className="text-white font-semibold truncate mb-1">{song.title}</h3>
                  <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
                  <p className="text-xs text-emerald-500 mt-2">{reason}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Personalized Recommendations */}
        {recommendations && recommendations.recommendations.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="text-emerald-500" size={28} />
              <h2 className="text-2xl font-bold text-white">Recommended for You</h2>
            </div>
            <div className="space-y-2">
              {recommendations.recommendations.map(({ song, score, reason }, index) => (
                <div
                  key={song.id}
                  className="bg-zinc-900 rounded-lg p-4 hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-4 group"
                  onClick={() => onPlay({
                    ...song,
                    audioUrl: `http://127.0.0.1:2005/api/stream/${song.id}`,
                    coverUrl: `https://picsum.photos/seed/${song.id}/200`,
                    releaseDate: new Date(
                      2020 + ((song.id * 17) % 5),
                      (song.id * 31) % 12,
                      ((song.id * 7) % 28) + 1
                    ).toISOString(),
                  })}
                >
                  <div className="flex-shrink-0 w-8 text-zinc-500 text-lg font-bold">
                    #{index + 1}
                  </div>
                  <img
                    src={`https://picsum.photos/seed/${song.id}/200`}
                    alt={song.title}
                    className="w-16 h-16 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{song.title}</h3>
                    <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
                    <p className="text-xs text-emerald-500 mt-1">{reason}</p>
                  </div>
                  <div className="flex items-center gap-4 text-zinc-400">
                    {song.genre && (
                      <span className="text-xs bg-zinc-800 px-2 py-1 rounded">{song.genre}</span>
                    )}
                    <span className="text-sm">{formatDuration(song.duration)}</span>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={24} className="text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trending Songs */}
        {trendingSongs.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-orange-500" size={28} />
              <h2 className="text-2xl font-bold text-white">Trending This Week</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {trendingSongs.slice(0, 10).map((song, index) => (
                <div
                  key={song.id}
                  className="bg-zinc-900 rounded-lg p-4 hover:bg-zinc-800 transition-colors cursor-pointer group"
                  onClick={() => onPlay(song)}
                >
                  <div className="relative mb-3">
                    <img
                      src={song.coverUrl}
                      alt={song.title}
                      className="w-full aspect-square rounded-lg object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                    <button className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={32} className="text-white" fill="white" />
                    </button>
                  </div>
                  <h3 className="text-white font-semibold truncate mb-1">{song.title}</h3>
                  <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
                  {song.playCount > 0 && (
                    <p className="text-xs text-orange-500 mt-2">{song.playCount} plays</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Favorite Genres */}
        {stats && stats.favorite_genres.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Your Top Genres</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.favorite_genres.map(({ genre, count }) => (
                <div key={genre} className="bg-zinc-900 rounded-lg p-6 text-center border border-zinc-800">
                  <h3 className="text-lg font-semibold text-white mb-1">{genre}</h3>
                  <p className="text-2xl font-bold text-emerald-500">{count}</p>
                  <p className="text-xs text-zinc-400 mt-1">plays</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Favorite Artists */}
        {stats && stats.favorite_artists.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Your Top Artists</h2>
            <div className="space-y-2">
              {stats.favorite_artists.map(({ artist, count }, index) => (
                <div
                  key={artist}
                  className="bg-zinc-900 rounded-lg p-4 flex items-center gap-4 border border-zinc-800"
                >
                  <div className="w-8 text-zinc-500 text-lg font-bold">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{artist}</h3>
                  </div>
                  <div className="text-emerald-500 font-bold">{count} plays</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {recommendations && recommendations.recommendations.length === 0 && (
          <div className="text-center py-16">
            <Music size={64} className="mx-auto mb-4 text-zinc-700" />
            <h3 className="text-xl font-bold text-white mb-2">No recommendations yet</h3>
            <p className="text-zinc-400">
              Start listening to songs to get personalized recommendations!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
