import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotification } from '@/hooks/useNotification';
import { useToast } from '@/hooks/use-toast';
import { resumeAudioContext } from '@/lib/soundEffects';
import { useTimerStore } from '@/stores/timerStore';
import { SettingsType } from '@/lib/timerService';

interface WakeLock {
  released: boolean;
  release: () => Promise<void>;
}

interface UseTimerProps {
  initialSettings: SettingsType;
  onComplete?: () => void;
}

export function useTimer({ initialSettings, onComplete }: UseTimerProps) {
  const [settings, setSettings] = useState(initialSettings);
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
  const startTimeRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const lastSecondRef = useRef<number>(0);
  const initializedRef = useRef(false);
  
  const {
    timeRemaining: storeTimeRemaining,
    totalTime: storeTotalTime,
    isRunning: storeIsRunning,
    mode: storeMode,
    currentIteration: storeCurrentIteration,
    totalIterations: storeTotalIterations,
    setTimeRemaining: setStoreTimeRemaining,
    setTotalTime: setStoreTotalTime,
    setIsRunning: setStoreIsRunning,
    setMode: setStoreMode,
    setCurrentIteration: setStoreCurrentIteration,
    setTotalIterations: setStoreTotalIterations,
    setSettings: setStoreSettings,
  } = useTimerStore();

  // Initialize settings in store only once
  useEffect(() => {
    if (!initializedRef.current) {
      setStoreSettings(settings);
      setStoreTotalIterations(settings.iterations);
      setStoreTimeRemaining(settings.workDuration * 60);
      setStoreTotalTime(settings.workDuration * 60);
      setStoreCurrentIteration(1);
      initializedRef.current = true;
    }
  }, []); // Empty dependency array to run only once

  // Complete current session and start next one
  const completeSession = useCallback(() => {
    if (mode === 'work') {
      // After work session, go to break mode for the same iteration
      setMode('break');
      setTimeRemaining(settings.breakDuration * 60);
      setTotalTime(settings.breakDuration * 60);
    } else {
      // After break session, increment iteration and go to work mode
      const nextIteration = currentIteration + 1;
      if (nextIteration > totalIterations) {
        // If we've completed all iterations, reset to the first iteration
        setCurrentIteration(1);
      } else {
        // Otherwise, move to the next iteration
        setCurrentIteration(nextIteration);
      }
      setMode('work');
      setTimeRemaining(settings.workDuration * 60);
      setTotalTime(settings.workDuration * 60);
    }
  }, [mode, settings, currentIteration, setMode, setTimeRemaining, setTotalTime, setCurrentIteration]);

  // Setup worker message handler
  useEffect(() => {
    if (!workerRef.current) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
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

    workerRef.current.addEventListener('message', handleMessage);
    return () => {
      workerRef.current?.removeEventListener('message', handleMessage);
    };
  }, [completeSession, onComplete]);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/timerWorker.ts', import.meta.url));
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Initialize timer with current settings
  const initializeTimer = useCallback((currentMode: 'work' | 'break', currentSettings: typeof settings) => {
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

  const updateSettings = useCallback((newSettings: typeof settings) => {
    console.log('Updating settings:', newSettings);
    setSettings(newSettings);
    setTotalIterations(newSettings.iterations || 4);
    
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

    workerRef.current.postMessage({ type: 'PAUSE' });
    setIsRunning(false);
  }, []);

  // Reset timer
  const resetTimer = useCallback(() => {
    if (!workerRef.current) return;

    // Reset worker
    workerRef.current.postMessage({ 
      type: 'RESET',
      payload: { timeRemaining: settings.workDuration * 60 }
    });

    // Reset all state
    setIsRunning(false);
    setMode('work');
    setCurrentIteration(1);
    setTimeRemaining(settings.workDuration * 60);
    setTotalTime(settings.workDuration * 60);

    // Update store state
    setStoreIsRunning(false);
    setStoreMode('work');
    setStoreCurrentIteration(1);
    setStoreTimeRemaining(settings.workDuration * 60);
    setStoreTotalTime(settings.workDuration * 60);
  }, [settings, setStoreIsRunning, setStoreMode, setStoreCurrentIteration, setStoreTimeRemaining, setStoreTotalTime]);

  // Skip timer
  const skipTimer = useCallback(() => {
    completeSession();
  }, [completeSession]);

  // Initialize timer when mode changes
  useEffect(() => {
    initializeTimer(mode, settings);
  }, [mode, settings, initializeTimer]);

  // Start timer
  const startTimer = useCallback(async () => {
    try {
      if (!workerRef.current) return;

      // Request wake lock
      if ('wakeLock' in navigator) {
        try {
          // Try system wake lock first, fall back to screen wake lock if not supported
          const wakeLockType = 'system' in (navigator as any).wakeLock ? 'system' : 'screen';
          wakeLockRef.current = await (navigator as any).wakeLock.request(wakeLockType);
        } catch (err) {
          console.log('Error requesting wake lock:', err);
        }
      }

      workerRef.current.postMessage({ 
        type: 'START',
        payload: { timeRemaining }
      });
      setIsRunning(true);
    } catch (error) {
      console.error('Error starting timer:', error);
      toast({
        title: "Error",
        description: "Failed to start timer. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, timeRemaining]);

  // Cleanup wake lock on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
          .then(() => {
            wakeLockRef.current = null;
          })
          .catch(err => console.log('Error releasing wake lock:', err));
      }
    };
  }, []);

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
