import apiClient from './client';

export async function getVapidPublicKey(): Promise<string> {
  const res = await apiClient.get('/push/vapid-public-key');
  return res.data.publicKey;
}

export function subscribePush(endpoint: string, keys: { p256dh: string; auth: string }) {
  return apiClient.post('/push/subscribe', { endpoint, keys });
}

export function unsubscribePush(endpoint: string) {
  return apiClient.post('/push/unsubscribe', { endpoint });
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
