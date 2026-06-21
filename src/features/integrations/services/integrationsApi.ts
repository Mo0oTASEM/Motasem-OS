import { cloudRunClient } from '../../../lib/api/cloudRunClient';

export const integrationsApi = {
  async getGoogleStatus(userId: string) {
    return cloudRunClient.plannerApi.getGoogleIntegrationStatus(userId);
  },

  async getGoogleAuthUrl(userId: string) {
    return cloudRunClient.getGoogleAuthUrl(userId);
  },

  async testGoogleConnection(userId: string) {
    return cloudRunClient.plannerApi.testGoogleConnection(userId);
  },

  async disconnectGoogle(userId: string) {
    return cloudRunClient.plannerApi.disconnectGoogle(userId);
  },

  async syncGoogleService(userId: string, service: string) {
    return cloudRunClient.plannerApi.syncGoogleServiceFromIntegrations(userId, service);
  },

  async listConnections(userId: string) {
    return cloudRunClient.plannerApi.listIntegrationConnections(userId);
  },

  async getTelegramStatus() {
    return cloudRunClient.telegramStatus();
  },

  async listProviders() {
    return cloudRunClient.listProviders();
  },

  async getProvider(id: string) {
    return cloudRunClient.getProvider(id);
  },

  async updateProvider(id: string, body: {
    config?: Record<string, unknown>;
    auth_type?: string;
    is_system?: boolean;
  }) {
    return cloudRunClient.updateProvider(id, body);
  },
};
