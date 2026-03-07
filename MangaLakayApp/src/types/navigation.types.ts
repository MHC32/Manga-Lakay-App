// src/types/navigation.types.ts
import { SearchFilters } from './mangadex.types';

// Auth Stack
export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  SignUp: undefined;
  SignIn: undefined;
  GenreSelection: { uid: string };
};

// App Tab Bar
export type AppTabParamList = {
  Home: undefined;
  Explore: undefined;
  Search: undefined;
  Ranking: undefined;
  Profile: undefined;
};

// Stacks imbriqués dans les tabs
export type HomeStackParamList = {
  HomeMain: undefined;
  MangaDetail: { mangaId: string };
  Reader: { chapterId: string; mangaId: string; chapterNum: string };
};

export type ExploreStackParamList = {
  ExploreMain: undefined;
  MangaDetail: { mangaId: string };
  Reader: { chapterId: string; mangaId: string; chapterNum: string };
};

export type SearchStackParamList = {
  SearchMain: undefined;
  SearchResults: { query?: string; filters?: SearchFilters };
  MangaDetail: { mangaId: string };
  Reader: { chapterId: string; mangaId: string; chapterNum: string };
};

export type LibraryStackParamList = {
  LibraryMain: undefined;
  MangaDetail: { mangaId: string };
  Reader: { chapterId: string; mangaId: string; chapterNum: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  PublicProfile: { username: string };
  EditProfile: undefined;
};

export type RankingStackParamList = {
  RankingMain: undefined;
  MangaDetail: { mangaId: string };
};
