export type McuType = 'movie' | 'series';

export type ThemeMode = 'dark' | 'light';

export type ThemePreset =
  | 'oled'
  | 'cosmic'
  | 'asgardian'
  | 'wakanda'
  | 'stark'
  | 'hydra'
  | 'light-marvel'
  | 'light-stark'
  | 'light-asgard'
  | 'light-quantum'
  | 'light-shield'
  | 'light-wakanda';

export type ThemeType = ThemePreset;

export interface RatingScore {
  imdb: number;
  rt: number; // Rotten Tomatoes %
  metacritic: number;
}

export interface SpoilerModeConfig {
  blurSummary: boolean;
  blurCharacters: boolean;
  blurCredits: boolean;
}

export interface PostCreditScene {
  midCredit: boolean;
  postCredit: boolean;
  importance: 'Crucial' | 'Recommended' | 'Skippable';
  description: string;
}

export interface StoryConnections {
  previousTitleId?: string;
  nextTitleId?: string;
  requiredBefore?: string[]; // IDs of titles required
  optionalBefore?: string[];
  related?: string[];
}

export interface McuTitle {
  id: string;
  title: string;
  type: McuType;
  phase: number;
  saga: 'Infinity Saga' | 'Multiverse Saga' | 'Future Saga';
  releaseYear: number;
  releaseDateString: string;
  runtimeMinutes: number; // Series could be total runtime or average episodes
  timelineOrder: number; // Chronological order index
  backdropUrl: string; // Themed gradients or Unsplash links
  posterUrl: string; // High-quality Marvel artwork
  genres: string[];
  director: string;
  creator?: string; // For TV series
  mainCharacters: string[]; // Character names/IDs
  villains: string[];
  summary: string;
  spoilerFreeDesc: string;
  ratings: RatingScore;
  languages: string[]; // English, Hindi, Tamil, Telugu, etc.
  streamingPlatforms: string[]; // Disney+, JioHotstar, Netflix, Sony, Prime, etc.
  buyPlatforms: string[]; // Apple TV, Google TV, Prime, etc.
  trailerYoutubeId: string;
  credits: PostCreditScene;
  connections: StoryConnections;
  importantNotes?: string;
}

export interface UserWatchData {
  status: 'unwatched' | 'watching' | 'completed' | 'later' | 'rewatch' | 'dropped';
  rating: number; // 0 to 5
  emojiRating?: string; // 🤩, 🔥, 🥱, etc.
  favorite: boolean;
  completedDate?: string; // YYYY-MM-DD
  notes: string;
  customTags: string[];
}

export interface CharacterArc {
  id: string;
  name: string;
  role: 'hero' | 'villain' | 'antihero' | 'supporting';
  actor: string;
  avatarUrl: string;
  status: 'Active' | 'Deceased' | 'Retired' | 'Legacy' | 'Unknown';
  journeySummary: string;
  relationships: { name: string; relation: string }[];
  featuredTitleIds: string[]; // IDs of movies/shows they are in
}

export interface InfinityStone {
  id: 'space' | 'mind' | 'reality' | 'soul' | 'time' | 'power';
  name: string;
  color: string; // Tailwind color class or hex code
  glowColor: string;
  origin: string;
  location: string;
  firstAppearanceId: string;
  currentStatus: string;
  summary: string;
  featuredTitleIds: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  tier: 'bronze' | 'silver' | 'gold' | 'vibranium';
  condition: string;
  unlockedAt?: string;
}

export interface McuQuote {
  text: string;
  character: string;
  title: string;
}

export interface McuTrivia {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface UpdateLog {
  id: string;
  timestamp: number;
  action: string;
  previousValue: string;
  newValue: string;
  source: string;
  userPerformed: string;
  metadata?: any;
}
