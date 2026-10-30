import { apiClient } from './api';
import type { DashboardStatsDto } from '../types';

export const dashboardService = {
  /**
   * Fetches aggregated KPI stats, project progress summaries, and recent activity feed.
   */
  async getStats(signal?: AbortSignal): Promise<DashboardStatsDto> {
    const response = await apiClient.get<DashboardStatsDto>('/dashboard/stats', { signal });
    return response.data;
  },
};

