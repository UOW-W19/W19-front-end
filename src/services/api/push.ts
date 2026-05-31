import { authenticatedRequest } from './request';

interface VapidPublicKeyResponse {
  enabled: boolean;
  public_key?: string;
}

interface PushSubscriptionPayload {
  endpoint: string;
  expiration_time?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushAvailability {
  enabled: boolean;
  publicKey?: string;
}

const subscriptionToPayload = (subscription: PushSubscription): PushSubscriptionPayload => {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('Browser did not provide a complete push subscription');
  }

  return {
    endpoint: json.endpoint,
    expiration_time: json.expirationTime,
    keys: {
      p256dh,
      auth,
    },
  };
};

export const pushApi = {
  async getVapidPublicKey(): Promise<PushAvailability> {
    const response = await authenticatedRequest<VapidPublicKeyResponse>('/push/vapid-public-key');
    return {
      enabled: response.enabled,
      publicKey: response.public_key,
    };
  },

  async saveSubscription(subscription: PushSubscription): Promise<void> {
    await authenticatedRequest('/push/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscriptionToPayload(subscription)),
    });
  },

  async deleteSubscription(endpoint: string): Promise<void> {
    await authenticatedRequest('/push/subscriptions', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    });
  },

  async sendTest(): Promise<void> {
    await authenticatedRequest('/push/test', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};
