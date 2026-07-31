import { useCallback, useEffect, useState } from 'react';
import { getVapidPublicKey, subscribePush, unsubscribePush, urlBase64ToUint8Array, arrayBufferToBase64Url } from '../api/push';
import { useAuth } from './useAuth';

const isSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | null>(
    isSupported() ? Notification.permission : null
  );
  const [subscribed, setSubscribed] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncStatus = useCallback(async () => {
    if (!isSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    setSubscribed(Boolean(sub));
  }, []);

  useEffect(() => {
    if (user) {
      syncStatus().catch(() => {});
    } else {
      setSubscribed(false);
    }
  }, [user, syncStatus]);

  const enable = useCallback(async () => {
    setError(null);
    if (!isSupported()) {
      setError('Push-уведомления не поддерживаются этим браузером');
      return;
    }
    setEnabling(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Разрешение на уведомления не получено');
        return;
      }

      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/service-worker.js');
      }

      const publicKey = await getVapidPublicKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const p256dh = sub.getKey('p256dh');
      const auth = sub.getKey('auth');
      if (!p256dh || !auth) {
        setError('Не удалось получить ключи подписки');
        return;
      }

      await subscribePush(
        sub.endpoint,
        {
          p256dh: arrayBufferToBase64Url(p256dh),
          auth: arrayBufferToBase64Url(auth),
        }
      );
      setSubscribed(true);
    } catch (e: any) {
      if (e?.response?.status === 500) {
        setError('Push-уведомления временно недоступны — добавьте VAPID-ключи в Railway');
      } else {
        setError('Не удалось включить push-уведомления');
      }
    } finally {
      setEnabling(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setError(null);
    if (!isSupported()) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        try {
          await unsubscribePush(sub.endpoint);
        } catch (e) {}
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setError('Не удалось отключить push-уведомления');
    }
  }, []);

  return { supported: isSupported(), permission, subscribed, enabling, error, enable, disable };
}
