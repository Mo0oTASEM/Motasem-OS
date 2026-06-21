import { useState, useEffect, useCallback, useRef } from 'react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type { QuarterWithRelations, PlanningReview } from '../types';

export interface QuarterDetailState {
  quarter: QuarterWithRelations | null;
  reviews: PlanningReview[];
  loading: boolean;
  error: string | null;
}

export const useQuarter = (id: string | null, workspaceId: string | null): QuarterDetailState & { refresh: () => void } => {
  const [quarter, setQuarter] = useState<QuarterWithRelations | null>(null);
  const [reviews, setReviews] = useState<PlanningReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!id || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const [qRes, rRes] = await Promise.all([
        cloudRunClient.plannerApi.getQuarter(id, workspaceId),
        cloudRunClient.plannerApi.listReviews(workspaceId, 'quarterly', id)
      ]);
      if (!mountedRef.current) return;
      setQuarter(qRes.quarter as unknown as QuarterWithRelations);
      setReviews(rRes.reviews as unknown as PlanningReview[]);
    } catch (err) {
      if (!mountedRef.current) return;
      setError((err as Error).message || 'Failed to load quarter.');
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

  return { quarter, reviews, loading, error, refresh: load };
};
