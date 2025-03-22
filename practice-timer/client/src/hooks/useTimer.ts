import { useState, useEffect, useRef, useCallback } from 'react';
import { SettingsType } from '@/lib/timerService';
import { apiRequest } from '@/lib/queryClient';
import { useNotification } from './useNotification';
import { useToast } from '@/hooks/use-toast';
import { resumeAudioContext } from '@/lib/soundEffects';

interface WakeLock {
  released: boolean;
  release: () => Promise<void>;
}

interface UseTimerProps {
  initialSettings: SettingsType;
  onComplete?: () => void;
}

export function useTimer({ initialSettings, onComplete }: UseTimerProps) {
  const [settings, setSettings] = useState<SettingsType>(initialSettings);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeRemaining, setTimeRemaining] = useState(initialSettings.workDuration * 60);
  const [totalTime, setTotalTime] = useState(initialSettings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIteration, setCurrentIteration] = useState(1);
  const [totalIterations, setTotalIterations] = useState(initialSettings.iterations || 4);
  
  const workerRef = useRef<Worker | null>(null);
  const { showNotification } = useNotification();
  const wakeLockRef = useRef<WakeLock | null>(null);
  const { toast } = useToast();

  // Complete current session and start next one
  const completeSession = useCallback(async () => {
    // Update iterations and mode
    setCurrentIteration(prev => {
      const newIteration = prev + 1;
      if (newIteration > totalIterations) {
        // All iterations completed
        setIsRunning(false);
        setMode('work');
        setCurrentIteration(1);
        setTimeRemaining(settings.workDuration * 60);
        setTotalTime(settings.workDuration * 60);

        // Show completion notification
        if (settings.browserNotificationsEnabled) {
          showNotification('Practice Cycle Complete! 🎉', {
            body: 'Great job! You\'ve completed all your practice sessions.',
          });
        }

        return 1;
      } else {
        // Switch mode
        const newMode = mode === 'work' ? 'break' : 'work';
        setMode(newMode);
        setTimeRemaining(newMode === 'work' ? settings.workDuration * 60 : settings.breakDuration * 60);
        setTotalTime(newMode === 'work' ? settings.workDuration * 60 : settings.breakDuration * 60);

        // Show session completion notification
        if (settings.browserNotificationsEnabled) {
          showNotification(`${newMode === 'work' ? 'Work' : 'Break'} Session Complete! ${newMode === 'work' ? '💪' : '☕'}`, {
            body: `Time for a ${newMode === 'work' ? 'break' : 'work'} session.`,
          });
        }

        return newIteration;
      }
    });

    // Save session to server
    try {
      await apiRequest('POST', '/api/sessions', {
        type: mode,
        startTime: new Date(Date.now() - (mode === 'work' ? settings.workDuration : settings.breakDuration) * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
        duration: mode === 'work' ? settings.workDuration : settings.breakDuration,
        completed: true
      });
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }, [mode, settings, totalIterations, showNotification]);

  // Setup worker message handler
  const setupWorkerMessageHandler = useCallback((worker: Worker) => {
    worker.onmessage = (event) => {
      const { type, payload } = event.data;
      console.log('Received message from worker:', type, payload);
      
      switch (type) {
        case 'TICK':
          setTimeRemaining(payload.timeRemaining);
          break;
        case 'COMPLETE':
          setIsRunning(false);
          if (onComplete) {
            console.log('Timer completed, calling onComplete callback');
            onComplete();
          }
          completeSession();
          break;
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
    };
  }, [onComplete, completeSession]);

  // Initialize Web Worker
  useEffect(() => {
    if (!workerRef.current) {
      console.log('Initializing Web Worker');
      workerRef.current = new Worker(
        new URL('../workers/timerWorker.ts', import.meta.url),
        { type: 'module' }
      );
      setupWorkerMessageHandler(workerRef.current);
    }

    // Keep the worker alive
    return () => {
      // Don't do anything on cleanup - keep the worker running
    };
  }, [setupWorkerMessageHandler]);

  // Initialize timer based on current mode and settings
  const initializeTimer = useCallback((currentMode: 'work' | 'break', currentSettings: SettingsType) => {
    const duration = currentMode === 'work' 
      ? currentSettings.workDuration 
      : currentSettings.breakDuration;
    
    setTimeRemaining(duration * 60);
    setTotalTime(duration * 60);
    
    // Update worker with new time
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'UPDATE_TIME',
        payload: { timeRemaining: duration * 60 }
      });
    }
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: SettingsType) => {
    console.log('Updating settings:', newSettings);
    setSettings(newSettings);
    setTotalIterations(newSettings.iterations);
    
    // If we're in break mode, update the break duration
    if (mode === 'break') {
      initializeTimer('break', newSettings);
    }
    // If we're in work mode, update the work duration
    else {
      initializeTimer('work', newSettings);
    }
  }, [mode, initializeTimer]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (!workerRef.current) return;

    // Release wake lock if it exists
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
        .then(() => {
          wakeLockRef.current = null;
        })
        .catch(err => console.log('Error releasing wake lock:', err));
    }

    workerRef.current.postMessage({ type: 'PAUSE' });
    setIsRunning(false);
  }, []);

  // Reset timer
  const resetTimer = useCallback((resetCurrentOnly = false) => {
    if (!workerRef.current) return;

    // Release wake lock if it exists
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
        .then(() => {
          wakeLockRef.current = null;
        })
        .catch(err => console.log('Error releasing wake lock:', err));
    }

    workerRef.current.postMessage({ 
      type: 'RESET',
      payload: { resetCurrentOnly }
    });
    setIsRunning(false);
  }, []);

  // Skip timer
  const skipTimer = useCallback(() => {
    setIsRunning(false);
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'PAUSE' });
    }
    
    const nextMode = mode === 'work' ? 'break' : 'work';
    setMode(nextMode);
    initializeTimer(nextMode, settings);
  }, [mode, settings, initializeTimer]);

  // Initialize timer when mode changes
  useEffect(() => {
    initializeTimer(mode, settings);
  }, [mode, settings, initializeTimer]);

  // Start timer
  const startTimer = useCallback(async () => {
    if (!workerRef.current) return;

    try {
      // Request wake lock to prevent device from sleeping
      if ('wakeLock' in navigator) {
        try {
          const wakeLock = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current = wakeLock;
        } catch (err) {
          console.log('Wake Lock error:', err);
        }
      }

      // Resume audio context for sound
      await resumeAudioContext();
      
      // Send current timeRemaining when starting
      workerRef.current.postMessage({ 
        type: 'START',
        payload: { timeRemaining }
      });
      setIsRunning(true);
    } catch (error) {
      console.error('Error starting timer:', error);
      toast({
        title: "Error Starting Timer",
        description: "Could not start the timer. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, timeRemaining]);

  return {
    timeRemaining,
    totalTime,
    isRunning,
    mode,
    settings,
    startTimer,
    pauseTimer,
    resetTimer,
    skipTimer,
    updateSettings,
    currentIteration,
    totalIterations
  };
}
