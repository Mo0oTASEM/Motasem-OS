import { useState, useEffect, useCallback, useRef } from 'react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type { MonthlyPlanWithOutcomes, PlanningReview } from '../types';

export interface MonthlyPlanDetailState {
  plan: MonthlyPlanWithOutcomes | null;
  reviews: PlanningReview[];
  loading: boolean;
  error: string | null;
}

export const useMonthlyPlan = (id: string | null, workspaceId: string | null): MonthlyPlanDetailState & { refresh: () => void } => {
  const [plan, setPlan] = useState<MonthlyPlanWithOutcomes | null>(null);
  const [reviews, setReviews] = useState<PlanningReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!id || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const [pRes, rRes] = await Promise.all([
        cloudRunClient.plannerApi.getMonthlyPlan(id, workspaceId),
        cloudRunClient.plannerApi.listReviews(workspaceId, 'monthly', id)
      ]);
      if (!mountedRef.current) return;
      setPlan(pRes.monthlyPlan as unknown as MonthlyPlanWithOutcomes);
      setReviews(rRes.reviews as unknown as PlanningReview[]);
    } catch (err) {
      if (!mountedRef.current) return;
      setError((err as Error).message || 'Failed to load monthly plan.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id, workspaceId]);

  useEffect(() => {
    mountedRef.current = true;
    const trigger = async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (mountedRef.current) {
        load();
      }
    };
    trigger();
    return () => { mountedRef.current = false; };
  }, [load]);

  return { plan, reviews, loading, error, refresh: load };
};
