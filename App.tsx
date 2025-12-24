import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import SongList from './components/SongList';
import Player from './components/Player';
import AIAssistant from './components/AIAssistant';
import AuthModal from './components/AuthModal';
import Recommendations from './components/Recommendations';
import { Song, View } from './types';
import { useAuth } from './contexts/AuthContext';
import { mergeSort } from './utils/MergeSort';
import { Queue } from './utils/Queue';

enum SortOrder {
  DEFAULT = 'DEFAULT',
  PLAY_COUNT = 'PLAY_COUNT',
  RELEASE_DATE = 'RELEASE_DATE',
  DURATION = 'DURATION',
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayedSongs, setDisplayedSongs] = useState<Song[]>([]);
  const [songQueue, setSongQueue] = useState(new Queue<Song>());
  const [queueVersion, setQueueVersion] = useState(0);
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DEFAULT);
  const [favoriteSongs, setFavoriteSongs] = useState<Song[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const { user, logout, isAuthenticated, token } = useAuth();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchSongs = () => {
    fetch('http://127.0.0.1:2005/api/songs/')
      .then(response => response.json())
      .then((data: Song[]) => {
        console.log('Raw data from API:', data);
        
        const songsWithData = data.map((song) => ({
          ...song,
          audioUrl: `http://127.0.0.1:2005/api/stream/${song.id}`,
          coverUrl: `https://picsum.photos/seed/${song.id}/200`,
          // Use backend play count (now tracked in database)
          playCount: song.playCount || 0,
          skipCount: song.skipCount || 0,
          // Use song.id and duration to create varied but consistent dates
          releaseDate: new Date(
            2020 + ((song.id * 17) % 5), // Year: 2020-2024
            (song.id * 31) % 12, // Month: 0-11
            ((song.id * 7) % 28) + 1 // Day: 1-28
          ).toISOString(),
        }));
        console.log('Processed songs with data:', songsWithData);
        setDisplayedSongs(songsWithData);
      })
      .catch(error => console.error('Error fetching songs:', error));
  };

  const fetchFavorites = () => {
    if (!token) return;
    
    fetch('http://127.0.0.1:2005/api/favorites', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then((data: Song[]) => {
      const favoritesWithData = data.map((song) => ({
        ...song,
        audioUrl: `http://127.0.0.1:2005/api/stream/${song.id}`,
        coverUrl: `https://picsum.photos/seed/${song.id}/200`,
        // Use backend play count
        playCount: song.playCount || 0,
        skipCount: song.skipCount || 0,
        // Use song.id to create consistent dates
        releaseDate: new Date(
          2020 + ((song.id * 17) % 5), // Year: 2020-2024
          (song.id * 31) % 12, // Month: 0-11
          ((song.id * 7) % 28) + 1 // Day: 1-28
        ).toISOString(),
      }));
      setFavoriteSongs(favoritesWithData);
    })
    .catch(error => console.error('Error fetching favorites:', error));
  };

  useEffect(() => {
    if (currentView === View.LIBRARY && isAuthenticated) {
      fetchFavorites();
    }
  }, [currentView, isAuthenticated]);

  useEffect(() => {
    fetchSongs();
  }, []);

  const addToQueue = (song: Song) => {
    // Check if song is already in the queue to prevent duplicates
    const queueArray = songQueue.toArray();
    const isDuplicate = queueArray.some(queuedSong => queuedSong.id === song.id);
    
    if (isDuplicate) {
      console.log(`Song "${song.title}" is already in the queue`);
      return;
    }
    
    songQueue.enqueue(song);
    setQueueVersion(v => v + 1);
    if (!currentSong) {
      playNextInQueue();
    }
  };

  const playNextInQueue = () => {
    const nextSong = songQueue.dequeue();
    if (nextSong) {
      setCurrentSong(nextSong);
      setIsPlaying(true);
    } else {
      setCurrentSong(null);
      setIsPlaying(false);
    }
    setQueueVersion(v => v + 1);
  };

  const handlePlay = (song: Song) => {
    // Play counts are now tracked by backend via Player component
    // No need to increment localStorage here
    addToQueue(song);
  };
  
  const handlePause = () => {
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    if (currentSong) {
      setIsPlaying(!isPlaying);
    } else if (!songQueue.isEmpty()) {
      playNextInQueue();
    }
  };

  const handleNext = () => {
    // First, try to play the next song in the queue
    if (!songQueue.isEmpty()) {
      playNextInQueue();
      return;
    }
    
    // If queue is empty, play the next song from the displayed list
    if (!currentSong) return;
    const currentIndex = displayedSongs.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % displayedSongs.length;
    setCurrentSong(displayedSongs[nextIndex]);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    // Prev doesn't interact with the queue, it goes to the previous song in the displayed list
    if (!currentSong) return;
    const currentIndex = displayedSongs.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + displayedSongs.length) % displayedSongs.length;
    setCurrentSong(displayedSongs[prevIndex]);
    setIsPlaying(true);
  };

  const handleSongEnd = () => {
    // When a song ends, automatically play the next one
    handleNext();
  };

  const sortSongs = (criteria: SortOrder) => {
    let comparator: (a: Song, b: Song) => number;
    switch (criteria) {
      case SortOrder.PLAY_COUNT:
        comparator = (a, b) => b.playCount - a.playCount;
        break;
      case SortOrder.RELEASE_DATE:
        comparator = (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        break;
      case SortOrder.DURATION:
        comparator = (a, b) => b.duration - a.duration;
        break;
      default:
        return;
    }
    const sorted = mergeSort([...displayedSongs], comparator);
    setDisplayedSongs(sorted);
    setSortOrder(criteria);
  };

  const QueueDisplay = () => (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-2">Up Next</h3>
      <div className="flex flex-col gap-2">
        {songQueue.toArray().map((song, index) => (
          <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-zinc-800/50">
            <img src={song.coverUrl} alt={song.title} className="w-10 h-10 rounded" />
            <div>
              <p className="font-semibold text-sm">{song.title}</p>
              <p className="text-xs text-zinc-400">{song.artist}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      
      <main className="flex-1 overflow-hidden flex flex-col relative bg-gradient-to-br from-zinc-900 via-black to-zinc-950">
        <header className="px-8 py-4 flex items-center justify-between sticky top-0 bg-black/40 backdrop-blur-xl z-20 border-b border-white/5">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">StreamFlow</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-400">Welcome, <span className="text-white font-medium">{user?.username}</span></span>
                <button 
                  onClick={logout}
                  className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Login
                </button>
                <button 
                  onClick={() => {
                    setAuthModalMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {currentView === View.HOME && (
            <>
              <div className="px-8 pt-4 flex justify-between items-center">
                <div className="flex gap-2">
                  <button onClick={() => sortSongs(SortOrder.PLAY_COUNT)} className={`px-3 py-1 text-sm rounded-full ${sortOrder === SortOrder.PLAY_COUNT ? 'bg-emerald-500 text-white' : 'bg-zinc-800'}`}>Play Count</button>
                  <button onClick={() => sortSongs(SortOrder.RELEASE_DATE)} className={`px-3 py-1 text-sm rounded-full ${sortOrder === SortOrder.RELEASE_DATE ? 'bg-emerald-500 text-white' : 'bg-zinc-800'}`}>Release Date</button>
                  <button onClick={() => sortSongs(SortOrder.DURATION)} className={`px-3 py-1 text-sm rounded-full ${sortOrder === SortOrder.DURATION ? 'bg-emerald-500 text-white' : 'bg-zinc-800'}`}>Duration</button>
                </div>
                <button 
                  onClick={() => {
                    fetch('http://127.0.0.1:2005/api/scan-music', { method: 'POST' })
                      .then(() => {
                        setTimeout(fetchSongs, 1000);
                      });
                  }}
                  className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  Refresh Library
                </button>
              </div>
              <SongList
                songs={displayedSongs}
                currentSong={currentSong}
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onPause={handlePause}
                onAddToQueue={addToQueue}
              />
            </>
          )}
          
          {currentView === View.LIBRARY && (
            <>
              {isAuthenticated ? (
                <>
                  <div className="px-8 pt-6">
                    <h2 className="text-3xl font-bold mb-2">Your Library</h2>
                    <p className="text-zinc-400 mb-6">
                      {favoriteSongs.length} {favoriteSongs.length === 1 ? 'song' : 'songs'}
                    </p>
                  </div>
                  {favoriteSongs.length > 0 ? (
                    <SongList
                      songs={favoriteSongs}
                      currentSong={currentSong}
                      isPlaying={isPlaying}
                      onPlay={handlePlay}
                      onPause={handlePause}
                      onAddToQueue={addToQueue}
                    />
                  ) : (
                    <div className="px-8 py-16 text-center">
                      <p className="text-zinc-400 text-lg mb-4">Your library is empty</p>
                      <p className="text-zinc-500 text-sm">Add songs to your library by clicking the heart icon ♥</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="px-8 py-16 text-center">
                  <p className="text-zinc-400 text-lg mb-4">Please login to view your library</p>
                  <button 
                    onClick={() => {
                      setAuthModalMode('login');
                      setIsAuthModalOpen(true);
                    }}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors"
                  >
                    Login
                  </button>
                </div>
              )}
            </>
          )}
          
          {currentView === View.AI_CHAT && (
            <AIAssistant />
          )}
          
          {currentView === View.RECOMMENDATIONS && (
            <Recommendations onPlay={handlePlay} currentSong={currentSong} />
          )}
        </div>

        {currentSong && (
          <Player
            key={currentSong.id}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onPrev={handlePrev}
            onSongEnd={handleSongEnd}
            audioRef={audioRef}
          />
        )}
      </main>

      {/* Only show queue panel if there are songs in the queue */}
      {!songQueue.isEmpty() && (
        <div className="w-80 bg-black/50 border-l border-white/5 z-0">
          <QueueDisplay />
        </div>
      )}

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </div>
  );
};

export default App;