import React, { useEffect, useState, RefObject } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX, Repeat, Shuffle } from 'lucide-react';
import { Song } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface PlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSongEnd: () => void;
  audioRef: RefObject<HTMLAudioElement>;
}

const Player: React.FC<PlayerProps> = ({ currentSong, isPlaying, onPlayPause, onNext, onPrev, onSongEnd, audioRef }) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [playStartTime, setPlayStartTime] = useState<number | null>(null);
  const [hasLoggedPlay, setHasLoggedPlay] = useState(false);
  const { token, isAuthenticated } = useAuth();

  // Log play event when song starts
  const logPlayEvent = (song: Song, listenDuration: number, completionRate: number, completed: boolean) => {
    if (!isAuthenticated || !token) return;

    fetch('http://127.0.0.1:2005/api/play-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        song_id: song.id,
        listen_duration: Math.floor(listenDuration),
        completion_rate: completionRate,
        completed: completed
      })
    })
    .catch(error => console.error('Error logging play history:', error));
  };

  // Log skip event
  const logSkipEvent = (song: Song, timeBeforeSkip: number) => {
    if (!isAuthenticated || !token) return;

    fetch('http://127.0.0.1:2005/api/skips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        song_id: song.id,
        time_before_skip: Math.floor(timeBeforeSkip)
      })
    })
    .catch(error => console.error('Error logging skip:', error));
  };

  useEffect(() => {
    if (currentSong && audioRef.current) {
      // Reset tracking state for new song
      setPlayStartTime(null);
      setHasLoggedPlay(false);
      
      // The audioUrl is now set in App.tsx
      audioRef.current.src = currentSong.audioUrl;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      }
    }
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
        // Start tracking play time
        if (playStartTime === null) {
          setPlayStartTime(audioRef.current.currentTime);
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current && currentSong) {
      const currentTime = audioRef.current.currentTime;
      const songDuration = audioRef.current.duration || 0;
      
      setProgress(currentTime);
      setDuration(songDuration);
      
      // Check if song is completed (>80% listened)
      if (songDuration > 0 && !hasLoggedPlay) {
        const completionRate = currentTime / songDuration;
        if (completionRate >= 0.8) {
          // Log completed play
          const listenDuration = currentTime - (playStartTime || 0);
          logPlayEvent(currentSong, listenDuration, completionRate, true);
          setHasLoggedPlay(true);
        }
      }
    }
  };

  const handleEnded = () => {
    // Log play if not already logged
    if (currentSong && !hasLoggedPlay && playStartTime !== null) {
      const listenDuration = duration - playStartTime;
      logPlayEvent(currentSong, listenDuration, 1.0, true);
    }
    onSongEnd();
  };
  
  // Handle skip (when user changes song manually)
  const handleSkip = (skipFunction: () => void) => {
    if (currentSong && playStartTime !== null && audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const listenDuration = currentTime - playStartTime;
      const completionRate = duration > 0 ? currentTime / duration : 0;
      
      // If less than 80% listened, log as skip
      if (completionRate < 0.8) {
        logSkipEvent(currentSong, listenDuration);
      } else if (!hasLoggedPlay) {
        // Log as completed play if >80%
        logPlayEvent(currentSong, listenDuration, completionRate, true);
      }
    }
    
    skipFunction();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-zinc-950 border-t border-zinc-800 px-6 flex items-center justify-between z-50">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={handleEnded}
      />
      
      {/* Song Info */}
      <div className="flex items-center gap-4 w-1/3 min-w-[200px]">
        <img src={currentSong.coverUrl} alt={currentSong.title} className="w-14 h-14 rounded" />
        <div className="overflow-hidden">
          <h4 className="text-white font-medium truncate">{currentSong.title}</h4>
          <p className="text-xs text-zinc-400 truncate hover:underline cursor-pointer">{currentSong.artist}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-2 w-1/3">
        <div className="flex items-center gap-6">
          <button className="text-zinc-400 hover:text-white transition-colors">
            <Shuffle size={18} />
          </button>
          <button onClick={() => handleSkip(onPrev)} className="text-zinc-400 hover:text-white transition-colors">
            <SkipBack size={22} fill="currentColor" />
          </button>
          <button
            onClick={onPlayPause}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform text-black"
          >
            {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
          </button>
          <button onClick={() => handleSkip(onNext)} className="text-zinc-400 hover:text-white transition-colors">
            <SkipForward size={22} fill="currentColor" />
          </button>
          <button className="text-zinc-400 hover:text-white transition-colors">
            <Repeat size={18} />
          </button>
        </div>

        <div className="w-full flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span>{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={handleSeek}
            className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hidden hover:[&::-webkit-slider-thumb]:block"
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-end gap-3 w-1/3 min-w-[200px]">
        <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-400 hover:text-white">
          {isMuted ? <VolumeX size={20} /> : volume < 0.5 ? <Volume1 size={20} /> : <Volume2 size={20} />}
        </button>
        <div className="w-24 group">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              setIsMuted(false);
            }}
            className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full group-hover:[&::-webkit-slider-thumb]:block"
          />
        </div>
      </div>
    </div>
  );
};

export default Player;