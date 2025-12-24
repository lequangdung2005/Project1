export interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  playCount: number;
  releaseDate: string; // ISO 8601 format
  coverUrl: string;
  audioUrl: string;
  genre?: string;
  year?: number;
  skipCount?: number;
  bpm?: number;
  energy?: number;
  danceability?: number;
  valence?: number;
  acousticness?: number;
}

export enum View {
  HOME = 'HOME',
  LIBRARY = 'LIBRARY',
  AI_CHAT = 'AI_CHAT',
  RECOMMENDATIONS = 'RECOMMENDATIONS'
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'model';
  text: string;
}

export interface RecommendedSong {
  song: Song;
  score: number;
  reason: string;
}

export interface RecommendationResponse {
  recommendations: RecommendedSong[];
  total: number;
}

export interface ListeningStats {
  total_plays: number;
  favorite_genres: { genre: string; count: number }[];
  favorite_artists: { artist: string; count: number }[];
  total_listening_time: number;
}