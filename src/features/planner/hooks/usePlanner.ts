import { useState, useEffect, useCallback, useRef } from 'react';
import { cloudRunClient, hasApiConfig } from '../../../lib/api/cloudRunClient';
import { useApp } from '../../../context/useApp';
import type {
  Quarter, MonthlyPlan, Workspace, PlannerUIState
} from '../types';

// ── Workspace ID resolver ─────────────────────────────────────────────────

let cachedWorkspaceId: string | null = null;

export const resolveWorkspaceId = async (): Promise<string | null> => {
  if (cachedWorkspaceId) return cachedWorkspaceId;
  if (!hasApiConfig) return null;
  try {
    const { workspace } = await cloudRunClient.plannerApi.getWorkspace();
    cachedWorkspaceId = workspace.id as string;
    return cachedWorkspaceId;
  } catch {
    return null;
  }
};

export const clearWorkspaceCache = () => { cachedWorkspaceId = null; };

// ── usePlanner hook ───────────────────────────────────────────────────────

export interface PlannerState {
  workspace: Workspace | null;
  workspaceId: string | null;
  quarters: Quarter[];
  monthlyPlans: MonthlyPlan[];
  ui: PlannerUIState;
  loading: boolean;
  error: string | null;
  apiAvailable: boolean;
}

export interface PlannerActions {
  setSelectedQuarter: (id: string | null) => void;
  setSelectedMonthlyPlan: (id: string | null) => void;
  setViewMode: (mode: 'quarter' | 'monthly') => void;
  refresh: () => void;
  refreshQuarters: () => void;
  refreshMonthlyPlans: () => void;
  deleteQuarter: (id: string) => Promise<void>;
  deleteMonthlyPlan: (id: string) => Promise<void>;
}

export const usePlanner = (): PlannerState & PlannerActions => {
  const { user } = useApp();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(cachedWorkspaceId);
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [monthlyPlans, setMonthlyPlans] = useState<MonthlyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ui, setUi] = useState<PlannerUIState>({
    workspaceId: null,
    selectedQuarterId: null,
    selectedMonthlyPlanId: null,
    viewMode: 'quarter'
  });
  const mountedRef = useRef(true);

  const apiAvailable = hasApiConfig && !!user;

  const loadAll = useCallback(async () => {
    if (!apiAvailable) {
      setLoading(false);
      setError(hasApiConfig ? 'Please sign in to use the Planner.' : 'Connect to the API server to use the Planner.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const wid = await resolveWorkspaceId();
      if (!wid || !mountedRef.current) return;
      setWorkspaceId(wid);
      setUi(prev => ({ ...prev, workspaceId: wid }));

      const [wsRes, qRes, mRes] = await Promise.all([
        cloudRunClient.plannerApi.getWorkspace(),
        cloudRunClient.plannerApi.listQuarters(wid),
        cloudRunClient.plannerApi.listMonthlyPlans(wid)
      ]);
      if (!mountedRef.current) return;
      setWorkspace(wsRes.workspace as unknown as Workspace);
      const qs = (qRes.quarters as unknown as Quarter[]).sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.quarterNumber - a.quarterNumber;
      });
      setQuarters(qs);
      setMonthlyPlans((mRes.monthlyPlans as unknown as MonthlyPlan[]).sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.monthNumber - a.monthNumber;
      }));
      // Auto-select most recent active or first quarter
      if (!ui.selectedQuarterId && qs.length > 0) {
        const active = qs.find(q => q.status === 'active') ?? qs[0];
        setUi(prev => ({ ...prev, selectedQuarterId: active.id }));
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError((err as Error).message || 'Failed to load planner data.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [apiAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshQuarters = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await cloudRunClient.plannerApi.listQuarters(workspaceId);
      if (mountedRef.current) setQuarters(res.quarters as unknown as Quarter[]);
    } catch { /* silent */ }
  }, [workspaceId]);

  const refreshMonthlyPlans = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await cloudRunClient.plannerApi.listMonthlyPlans(workspaceId);
      if (mountedRef.current) setMonthlyPlans(res.monthlyPlans as unknown as MonthlyPlan[]);
    } catch { /* silent */ }
  }, [workspaceId]);

  const deleteQuarter = useCallback(async (id: string) => {
    if (!workspaceId) return;
    try {
      await cloudRunClient.plannerApi.deleteQuarter(id, workspaceId);
      if (ui.selectedQuarterId === id) {
        setUi(prev => ({ ...prev, selectedQuarterId: null }));
      }
      await refreshQuarters();
    } catch (err) {
      setError((err as Error).message || 'Failed to delete quarter.');
    }
  }, [workspaceId, ui.selectedQuarterId, refreshQuarters]);

  const deleteMonthlyPlan = useCallback(async (id: string) => {
    if (!workspaceId) return;
    try {
      await cloudRunClient.plannerApi.deleteMonthlyPlan(id, workspaceId);
      if (ui.selectedMonthlyPlanId === id) {
        setUi(prev => ({ ...prev, selectedMonthlyPlanId: null }));
      }
      await refreshMonthlyPlans();
    } catch (err) {
      setError((err as Error).message || 'Failed to delete monthly plan.');
    }
  }, [workspaceId, ui.selectedMonthlyPlanId, refreshMonthlyPlans]);

  useEffect(() => {
    mountedRef.current = true;
    const trigger = async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (mountedRef.current) {
        loadAll();
      }
    };
    trigger();
    return () => { mountedRef.current = false; };
  }, [loadAll]);

  return {
    workspace, workspaceId, quarters, monthlyPlans, ui, loading, error, apiAvailable,
    setSelectedQuarter: (id) => setUi(prev => ({ ...prev, selectedQuarterId: id })),
    setSelectedMonthlyPlan: (id) => setUi(prev => ({ ...prev, selectedMonthlyPlanId: id })),
    setViewMode: (mode) => setUi(prev => ({ ...prev, viewMode: mode })),
    refresh: loadAll,
    refreshQuarters,
    refreshMonthlyPlans,
    deleteQuarter,
    deleteMonthlyPlan
  };
};
