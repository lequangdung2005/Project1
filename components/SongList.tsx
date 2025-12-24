import React from 'react';
import { Play, Clock, Heart, Plus } from 'lucide-react';
import { Song } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SongListProps {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlay: (song: Song) => void;
  onPause: () => void;
  onAddToQueue: (song: Song) => void;
}

const SongList: React.FC<SongListProps> = ({ songs, currentSong, isPlaying, onPlay, onPause, onAddToQueue }) => {
  const { isAuthenticated, token } = useAuth();
  const [favorites, setFavorites] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (isAuthenticated && token) {
      fetch('http://127.0.0.1:2005/api/favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then((data: Song[]) => setFavorites(data.map(s => s.id)))
      .catch(console.error);
    } else {
      setFavorites([]);
    }
  }, [isAuthenticated, token]);

  const toggleFavorite = async (e: React.MouseEvent, songId: number) => {
    e.stopPropagation();
    
    console.log('Auth status:', { isAuthenticated, hasToken: !!token });
    
    if (!isAuthenticated || !token) {
      console.warn('Please login to add favorites');
      alert('Please login to add songs to your library');
      return;
    }

    const isFavorite = favorites.includes(songId);
    const method = isFavorite ? 'DELETE' : 'POST';
    
    console.log(`Attempting to ${method} favorite for song ${songId}`);
    console.log('Token preview:', token.substring(0, 20) + '...');
    
    try {
      const res = await fetch(`http://127.0.0.1:2005/api/favorites/${songId}`, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', res.status);
      
      if (res.ok) {
        setFavorites(prev => 
          isFavorite ? prev.filter(id => id !== songId) : [...prev, songId]
        );
        console.log(isFavorite ? 'Removed from favorites' : 'Added to favorites');
      } else {
        const errorData = await res.json();
        console.error('Error response:', errorData);
        
        // If unauthorized, suggest re-login
        if (res.status === 401) {
          alert('Your session has expired. Please logout and login again.');
        } else {
          alert(`Failed to ${isFavorite ? 'remove from' : 'add to'} library: ${errorData.detail || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Network error. Please check if the backend is running.');
    }
  };

  const handleAddToQueue = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    onAddToQueue(song);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <div className="p-8 pb-32">
      <h2 className="text-3xl font-bold mb-6">Trending Now</h2>
      
      <div className="grid grid-cols-1 gap-2">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 py-2 text-sm text-zinc-400 border-b border-zinc-800 mb-2 uppercase tracking-wider">
          <span className="w-8">#</span>
          <span>Title</span>
          <span>Album</span>
          <span>Date Added</span>
          <span className="flex justify-end"><Clock size={16} /></span>
        </div>

        {/* Songs */}
        {songs.map((song, index) => {
          const isCurrent = currentSong?.id === song.id;
          const isCurrentlyPlaying = isCurrent && isPlaying;

          return (
            <div
              key={song.id}
              onClick={() => isCurrentlyPlaying ? onPause() : onPlay(song)}
              className={`group grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 items-center px-4 py-3 rounded-md hover:bg-zinc-800/50 transition-colors cursor-pointer ${
                isCurrent ? 'bg-zinc-800/80' : ''
              }`}
            >
              <div className="w-8 flex justify-center text-zinc-400 group-hover:text-white">
                {isCurrentlyPlaying ? (
                  <div className="flex gap-1 items-end h-4">
                     <span className="w-1 bg-emerald-500 animate-[bounce_1s_infinite] h-2"></span>
                     <span className="w-1 bg-emerald-500 animate-[bounce_1.2s_infinite] h-4"></span>
                     <span className="w-1 bg-emerald-500 animate-[bounce_0.8s_infinite] h-3"></span>
                  </div>
                ) : (
                  <span className="group-hover:hidden">{index + 1}</span>
                )}
                <Play size={16} className={`hidden group-hover:block ${isCurrentlyPlaying ? 'hidden' : ''}`} fill="currentColor" />
              </div>

              <div className="flex items-center gap-4">
                <img src={song.coverUrl} alt={song.title} className="w-10 h-10 rounded object-cover shadow-sm" />
                <div>
                  <div className={`font-medium ${isCurrent ? 'text-emerald-500' : 'text-white'}`}>{song.title}</div>
                  <div className="text-sm text-zinc-400 group-hover:text-white">{song.artist}</div>
                </div>
              </div>

              <div className="text-sm text-zinc-400 group-hover:text-white truncate">{song.album}</div>
              
              <div className="text-sm text-zinc-400">{formatDate(song.releaseDate)}</div>

              <div className="text-sm text-zinc-400 font-mono text-right flex items-center justify-end gap-4">
                <button
                  onClick={(e) => handleAddToQueue(e, song)}
                  className="text-zinc-600 hover:text-white hover:scale-110 transition-transform"
                >
                  <Plus size={18} />
                </button>
                {isAuthenticated && (
                  <button
                    onClick={(e) => toggleFavorite(e, song.id)}
                    className={`hover:scale-110 transition-transform ${
                      favorites.includes(song.id) ? 'text-emerald-500' : 'text-zinc-600 hover:text-white'
                    }`}
                  >
                    <Heart size={18} fill={favorites.includes(song.id) ? "currentColor" : "none"} />
                  </button>
                )}
                {formatTime(song.duration)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SongList;