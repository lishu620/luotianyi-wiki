import type {
  CategoryStat,
  StatsDashboard,
  StatsOverview,
  TagStat,
  TopSongStat,
  YearStat,
} from '@luotianyi/shared';
import { api } from './http';

export const statsApi = {
  dashboard: () => api.get<StatsDashboard>('/stats'),
  overview: () => api.get<StatsOverview>('/stats/overview'),
  byYear: () => api.get<YearStat[]>('/stats/by-year'),
  topSongs: (limit = 10) => api.get<TopSongStat[]>('/stats/top-songs', { limit }),
  tags: (limit = 20) => api.get<TagStat[]>('/stats/tags', { limit }),
};

export type { CategoryStat, StatsDashboard, StatsOverview, TagStat, TopSongStat, YearStat };
