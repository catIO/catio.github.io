import webpush from 'web-push';
import { PushSubscription } from '@shared/schema';
import { storage } from '../storage';
import fs from 'fs';
import path from 'path';

// Load VAPID keys
const keysPath = path.join(__dirname, '../vapid-keys.json');
const vapidKeys = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export async function sendPushNotification(userId: number, title: string, options: webpush.RequestOptions = {}) {
  try {
    const subscription = await storage.getPushSubscription(userId);
    if (!subscription) {
      console.log('No push subscription found for user:', userId);
      return;
    }

    const payload = JSON.stringify({
      title,
      ...options
    });

    await webpush.sendNotification(subscription, payload);
    console.log('Push notification sent successfully to user:', userId);
    // Remove the subscription from storage
    await storage.savePushSubscription(userId, {
      endpoint: '',
      keys: {
        p256dh: '',
        auth: ''
      }
    });
    console.log('Push subscription removed for user:', userId);
  } catch (error) {
    console.error('Error sending push notification:', error);
    // If the subscription is invalid, remove it from storage
    if (error instanceof webpush.WebPushError && error.statusCode === 410) {
      await storage.savePushSubscription(userId, {
        endpoint: '',
        keys: {
          p256dh: '',
          auth: ''
        }
      });
      console.log('Invalid push subscription removed for user:', userId);
    }
    throw error;
  }
} 