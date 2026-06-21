import type { ReportMetric, UpworkJob } from '../models';
import { nowIso } from './utils';

export const reportService = {
  listReportMetrics: async (): Promise<ReportMetric[]> => [],
  listUpworkJobs: async (): Promise<UpworkJob[]> => [],
  getDailyReport: async () => ({
    generatedAt: nowIso(),
    title: 'Daily Work Report',
    metrics: [],
    summary: 'No report data available yet.'
  }),
  getWeeklyReport: async () => ({
    generatedAt: nowIso(),
    title: 'Weekly Work Report',
    metrics: [],
    summary: 'No report data available yet.'
  })
};
