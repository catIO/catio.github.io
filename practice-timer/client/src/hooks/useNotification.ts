import { useCallback } from 'react';
import { playSound as playSoundEffect, resumeAudioContext, SoundType } from '@/lib/soundEffects';
import { useToast } from '@/hooks/use-toast';
import { SettingsType } from '@/lib/timerService';

export function useNotification() {
  const { toast } = useToast();

  const requestNotificationPermission = useCallback(async () => {
    try {
      // Check if notifications are already granted
      if (Notification.permission === 'granted') {
        return true;
      }

      const permission = await Notification.requestPermission();
      console.log('Notification permission status:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  const showNotification = useCallback(async (title: string, options: NotificationOptions = {}) => {
    try {
      console.log('Current notification permission:', Notification.permission);
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: options?.body,
          silent: options?.silent || false,
          tag: options?.tag || 'default',
          requireInteraction: options?.requireInteraction || false,
        });
      } else {
        console.log('Notifications not granted, requesting permission...');
        const granted = await requestNotificationPermission();
        if (granted) {
          new Notification(title, {
            body: options?.body,
            silent: options?.silent || false,
            tag: options?.tag || 'default',
            requireInteraction: options?.requireInteraction || false,
          });
        }
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [requestNotificationPermission]);

  const playSound = useCallback(async (settings?: SettingsType) => {
    try {
      console.log('Attempting to play sound with settings:', settings);
      console.log('Number of beeps from settings:', settings?.numberOfBeeps);
      console.log('Sound type from settings:', settings?.soundType);
      console.log('Volume from settings:', settings?.volume);
      
      // Always try to resume audio context first
      await resumeAudioContext();
      console.log('Audio context resumed');
      
      // Add a small delay to ensure the audio context is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Play the sound effect with the number of beeps and sound type from settings
      await playSoundEffect(
        'end', 
        settings?.numberOfBeeps ?? 3,
        settings?.volume ?? 50,
        (settings?.soundType as SoundType) ?? 'beep'
      );
      console.log('Sound played successfully');
    } catch (error) {
      console.error('Error playing sound:', error);
      // Show a toast notification to inform the user about the audio issue
      toast({
        title: "Sound Playback Issue",
        description: "Please click anywhere on the page to enable sound notifications.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    requestNotificationPermission,
    showNotification,
    playSound
  };
}
