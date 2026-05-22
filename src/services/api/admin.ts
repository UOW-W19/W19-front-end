import { authenticatedRequest } from './request';

interface BackendAdminMetric {
  key: string;
  label: string;
  value: number;
  description?: string;
}

interface BackendAdminFeatureStatus {
  key: string;
  label: string;
  status: string;
  description: string;
  enabled: boolean;
}

interface BackendAdminSummary {
  generated_at: string;
  metrics?: BackendAdminMetric[];
  future_features?: BackendAdminFeatureStatus[];
}

export interface AdminMetric {
  key: string;
  label: string;
  value: number;
  description?: string;
}

export interface AdminFeatureStatus {
  key: string;
  label: string;
  status: string;
  description: string;
  enabled: boolean;
}

export interface AdminSummary {
  generatedAt: string;
  metrics: AdminMetric[];
  futureFeatures: AdminFeatureStatus[];
}

const transformAdminSummary = (summary: BackendAdminSummary): AdminSummary => ({
  generatedAt: summary.generated_at,
  metrics: summary.metrics ?? [],
  futureFeatures: summary.future_features ?? [],
});

export const adminApi = {
  async getSummary(): Promise<AdminSummary> {
    const summary = await authenticatedRequest<BackendAdminSummary>('/admin/summary');
    return transformAdminSummary(summary);
  },
};
