import { useCallback, useEffect, useState } from 'react';
import type { CanonicalStatus } from '../../../lib/integrationStatus/shared';
import type { IntegrationConnection, GoogleIntegrationStatus, IntegrationProvider } from '../types';
import { integrationsApi } from '../services/integrationsApi';
import { useApp } from '../../../context/useApp';

export type ConnectionState = {
  connections: IntegrationConnection[];
  googleStatus: GoogleIntegrationStatus | null;
  loading: boolean;
  error: string | null;
};

export const useIntegrations = () => {
  const app = useApp();
  const userId = app?.user?.id ?? '';
  const [state, setState] = useState<ConnectionState>({
    connections: [],
    googleStatus: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [googleStatus] = await Promise.all([
        integrationsApi.getGoogleStatus(userId).catch(() => ({
          connected: false, email: null, services: {} as Record<string, boolean>, scopes: [],
        })),
      ]);
      setState({
        connections: googleStatus.connected
          ? [{
              id: 'google_workspace',
              userId,
              providerId: 'google_workspace',
              label: null,
              status: 'connected' as CanonicalStatus,
              scopes: googleStatus.scopes,
              accountEmail: googleStatus.email,
              accountName: null,
              avatarUrl: null,
              connectedAt: null,
              lastCheckedAt: null,
              createdAt: '',
              updatedAt: '',
            }]
          : [],
        googleStatus,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load integrations',
      }));
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getConnectionStatus = useCallback((providerId: IntegrationProvider): CanonicalStatus => {
    return state.connections.find(c => c.providerId === providerId)?.status ?? 'disconnected';
  }, [state.connections]);

  const isGoogleServiceEnabled = useCallback((service: string): boolean => {
    return Boolean((state.googleStatus?.services as Record<string, boolean> | undefined)?.[service]);
  }, [state.googleStatus]);

  return {
    ...state,
    refresh,
    getConnectionStatus,
    isGoogleServiceEnabled,
  };
};
