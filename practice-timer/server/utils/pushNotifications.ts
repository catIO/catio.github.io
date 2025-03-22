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
  } catch (error) {
    console.error('Error sending push notification:', error);
    if ((error as any).statusCode === 410) {
      // Subscription has expired or is no longer valid
      await storage.deletePushSubscription(userId);
    }
  }
} 